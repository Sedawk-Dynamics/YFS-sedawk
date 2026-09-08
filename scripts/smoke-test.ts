/**
 * Full-site smoke test over HTTP: every route, both roles, the guards between
 * them, and the access rules on uploaded files.
 *
 *   pnpm smoke                       # against http://localhost:3000
 *   BASE_URL=http://localhost:3100 pnpm smoke
 *
 * Read-only apart from minting sessions — it creates and deletes nothing.
 */
import 'dotenv/config'
import { prisma } from '../lib/db'
import { signSession } from '../lib/auth/session'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

let passed = 0
const failures: string[] = []

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title: string) {
  console.log(`\n${title}\n${'─'.repeat(title.length)}`)
}

type Fetched = { status: number; location: string | null; body: string }

async function get(path: string, token?: string): Promise<Fetched> {
  const response = await fetch(`${BASE}${path}`, {
    headers: token ? { Cookie: `yfs_session=${token}` } : {},
    redirect: 'manual',
  })
  return {
    status: response.status,
    location: response.headers.get('location'),
    body: response.status < 400 ? await response.text() : '',
  }
}

/** A route that renders, with no Next.js error boundary in the output. */
async function expectPage(label: string, path: string, token?: string, mustContain: string[] = []) {
  const r = await get(path, token)
  // Next inlines the 404 template into every page's flight payload, so the
  // only reliable signal is a rendered <title> or the error boundary's own
  // markup — not a substring search over the whole document.
  const errored =
    /<title>404: This page could not be found\.<\/title>/.test(r.body) ||
    r.body.includes('id="__next_error__"') ||
    r.body.includes('>Application error: a server-side exception')

  check(`${label} (${path})`, r.status === 200 && !errored, `status ${r.status}${errored ? ', error page' : ''}`)

  for (const needle of mustContain) {
    check(`  ${path} shows "${needle}"`, r.body.includes(needle))
  }
  return r
}

async function expectRedirect(label: string, path: string, to: string, token?: string) {
  const r = await get(path, token)
  const redirected = r.status >= 300 && r.status < 400
  const target = r.location ?? ''
  check(
    `${label} (${path} -> ${to})`,
    redirected && target.includes(to),
    `status ${r.status}, location ${target || 'none'}`,
  )
}

async function expectStatus(label: string, path: string, expected: number, token?: string) {
  const r = await get(path, token)
  check(`${label} (${path})`, r.status === expected, `got ${r.status}, wanted ${expected}`)
}

async function main() {
  console.log(`\nSmoke-testing ${BASE}\n`)

  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } })
  const dsa = await prisma.user.findFirst({
    where: { role: 'DSA', status: 'APPROVED' },
    include: { documents: true, payouts: true },
  })
  const pendingDsa = await prisma.user.findFirst({ where: { role: 'DSA', status: 'PENDING' } })
  const otherDsa = await prisma.user.findFirst({
    where: { role: 'DSA', status: 'APPROVED', id: { not: dsa?.id ?? '' } },
  })

  if (!dsa) {
    console.log('  No approved DSA found. Run: pnpm walkthrough\n')
    process.exitCode = 1
    return
  }

  const adminToken = (await signSession({ sub: admin.id, role: 'ADMIN', email: admin.email, name: admin.fullName })).token
  const dsaToken = (await signSession({ sub: dsa.id, role: 'DSA', email: dsa.email, name: dsa.fullName })).token
  const pendingToken = pendingDsa
    ? (await signSession({ sub: pendingDsa.id, role: 'DSA', email: pendingDsa.email, name: pendingDsa.fullName })).token
    : undefined
  const otherToken = otherDsa
    ? (await signSession({ sub: otherDsa.id, role: 'DSA', email: otherDsa.email, name: otherDsa.fullName })).token
    : undefined

  // ── Public ───────────────────────────────────────────────────────────────
  section('Public pages')
  await expectPage('Marketing home', '/', undefined, [
    'The Benchmark of',
    'Become a Partner',
    'Partner Login',
  ])
  await expectPage('Registration', '/register', undefined, ['Personal', 'KYC', 'Referral'])
  await expectPage('DSA login', '/login', undefined, ['Password', 'Login with OTP'])
  await expectPage('Forgot password', '/forgot-password', undefined, ['Reset your password'])
  await expectPage('Application status', '/application-status', undefined, ['Check your application'])
  await expectPage('Admin login', '/admin/login', undefined, ['DSA Admin Portal'])
  await expectStatus('Unknown route 404s', '/no-such-page', 404)

  // ── Guards: signed out ───────────────────────────────────────────────────
  section('Guards — signed out')
  for (const path of ['/admin', '/admin/dashboard', '/admin/registrations', '/admin/payouts']) {
    await expectRedirect('Admin area redirects to admin login', path, '/admin/login')
  }
  for (const path of ['/dsa/dashboard', '/dsa/payouts', '/dsa/institution-code']) {
    await expectRedirect('DSA area redirects to partner login', path, '/login')
  }

  // ── Guards: wrong role ───────────────────────────────────────────────────
  section('Guards — wrong role')
  await expectRedirect('DSA cannot reach the admin area', '/admin/dashboard', '/admin/login', dsaToken)
  await expectRedirect('Admin cannot reach the DSA area', '/dsa/dashboard', '/login', adminToken)
  if (pendingToken) {
    await expectRedirect(
      'Pending DSA cannot reach the dashboard',
      '/dsa/dashboard',
      '/login',
      pendingToken,
    )
  }

  // ── Signed-in redirects ──────────────────────────────────────────────────
  section('Signed-in redirects')
  await expectRedirect('Admin login bounces a signed-in admin', '/admin/login', '/admin/dashboard', adminToken)
  await expectRedirect('Partner login bounces a signed-in DSA', '/login', '/dsa/dashboard', dsaToken)
  await expectRedirect('/admin lands on the dashboard', '/admin', '/admin/dashboard', adminToken)

  // ── Admin pages ──────────────────────────────────────────────────────────
  section('Admin pages')
  await expectPage('Dashboard', '/admin/dashboard', adminToken, [
    'Total DSA Registrations',
    'Pending Approvals',
    'Approved DSAs',
  ])
  await expectPage('Registrations', '/admin/registrations', adminToken, ['DSA Registrations'])
  await expectPage('Registrations — pending tab', '/admin/registrations?tab=pending', adminToken)
  await expectPage('Registrations — search', '/admin/registrations?q=akshit', adminToken)
  await expectPage('Application detail', `/admin/registrations/${dsa.id}`, adminToken, [
    'Refer Code verification',
    'Institution Code (private)',
  ])
  await expectPage('Payout management', '/admin/payouts', adminToken, ['Payout Management'])
  await expectPage('Payouts for a month', '/admin/payouts?month=2026-09', adminToken)
  await expectPage('Per-DSA payouts', `/admin/payouts/${dsa.id}?month=2026-09`, adminToken)
  await expectPage('Referral hierarchy', '/admin/referrals', adminToken, ['Referral Hierarchy'])
  await expectPage('Notifications', '/admin/notifications', adminToken)
  await expectPage('Reports', '/admin/reports', adminToken)
  await expectPage('Settings', '/admin/settings', adminToken)
  await expectPage('Admin profile', '/admin/profile', adminToken, [admin.email])
  await expectPage('Admin change password', '/admin/change-password', adminToken)
  await expectStatus('Unknown application 404s', '/admin/registrations/00000000-0000-0000-0000-000000000000', 404, adminToken)

  // ── DSA pages ────────────────────────────────────────────────────────────
  section('DSA pages')
  await expectPage('Dashboard', '/dsa/dashboard', dsaToken, [dsa.fullName.split(' ')[0]])
  await expectPage('Profile', '/dsa/profile', dsaToken, ['My Profile'])
  await expectPage('Payouts', '/dsa/payouts', dsaToken, ['Payouts'])
  await expectPage('Payouts filtered', '/dsa/payouts?category=LOAN&from=2026-01', dsaToken)
  await expectPage('Referrals', '/dsa/referrals', dsaToken, ['My Referrals'])
  await expectPage('Institution members', '/dsa/members', dsaToken, ['Institution Members'])
  await expectPage('Institution code', '/dsa/institution-code', dsaToken, ['Do not share this code'])
  await expectPage('Notifications', '/dsa/notifications', dsaToken)
  await expectPage('Settings', '/dsa/settings', dsaToken, ['Change password'])

  // ── Secret hygiene ───────────────────────────────────────────────────────
  section('Secret hygiene')
  if (dsa.institutionCode) {
    for (const path of ['/dsa/dashboard', '/dsa/referrals', '/dsa/members', '/dsa/payouts']) {
      const r = await get(path, dsaToken)
      check(
        `Institution Code absent from ${path}`,
        !r.body.includes(dsa.institutionCode),
      )
    }
    const codePage = await get('/dsa/institution-code', dsaToken)
    check(
      'Institution Code appears on its own page',
      codePage.body.includes(dsa.institutionCode),
    )
  }

  const profile = await prisma.dsaProfile.findUnique({ where: { userId: dsa.id } })
  if (profile) {
    const r = await get('/dsa/profile', dsaToken)
    check('Aadhaar is masked on the profile', !r.body.includes(profile.aadhaarNumber))
    const admn = await get(`/admin/registrations/${dsa.id}`, adminToken)
    check('Aadhaar ciphertext never reaches the admin page', !admn.body.includes(profile.aadhaarNumber))
  }

  // ── File access ──────────────────────────────────────────────────────────
  section('Uploaded file access')
  const doc = dsa.documents[0]
  if (doc) {
    await expectStatus('Owner can read their KYC document', doc.fileUrl, 200, dsaToken)
    await expectStatus('Admin can read it', doc.fileUrl, 200, adminToken)
    await expectStatus('Anonymous cannot', doc.fileUrl, 401)
    if (otherToken) await expectStatus('Another DSA cannot', doc.fileUrl, 403, otherToken)
    check('Document path carries no email', !doc.fileUrl.includes('@'))
  }

  const slip = dsa.payouts.find((p) => p.slipFileUrl)?.slipFileUrl
  if (slip) {
    await expectStatus('Owner can download their slip', slip, 200, dsaToken)
    if (otherToken) await expectStatus('Another DSA cannot', slip, 403, otherToken)
    await expectStatus('Anonymous cannot', slip, 401)
  }

  await expectStatus(
    'Path traversal is refused',
    '/api/files/yfs/kyc/..%2F..%2F..%2F.env',
    404,
    dsaToken,
  )

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${passed} passed, ${failures.length} failed`)
  if (failures.length > 0) {
    console.log('\n  Failures:')
    for (const f of failures) console.log(`    • ${f}`)
    process.exitCode = 1
  }
  console.log()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
