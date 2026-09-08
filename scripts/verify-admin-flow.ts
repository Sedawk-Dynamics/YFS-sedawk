/**
 * End-to-end check of the admin approval and referral logic against the real
 * database, using the same service functions the admin UI calls.
 *
 *   pnpm verify:flow
 *
 * Creates its own throwaway applicants and removes them afterwards.
 */
import 'dotenv/config'
import { prisma } from '../lib/db'
import { hashPassword } from '../lib/auth/password'
import {
  approveApplication,
  rejectApplication,
} from '../lib/services/registrations'

let passed = 0
let failed = 0

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const TAG = `verify-${Date.now()}`

async function makeApplicant(name: string, referCode?: string) {
  return prisma.user.create({
    data: {
      role: 'DSA',
      fullName: name,
      email: `${TAG}-${name.toLowerCase().replace(/\s+/g, '-')}@example.test`,
      mobile: `${Math.floor(7000000000 + Math.random() * 999999999)}`,
      passwordHash: await hashPassword('Verify@1234'),
      status: 'PENDING',
      submittedReferCode: referCode ?? null,
    },
  })
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } })
  console.log(`\nRunning admin flow verification as ${admin.email}\n`)

  // ── 1. Approve an applicant who registered without a Refer Code ──────────
  const solo = await makeApplicant('Solo Applicant')
  const soloResult = await approveApplication({ adminId: admin.id, userId: solo.id })
  check('approves an applicant with no Refer Code', soloResult.ok)

  const approvedSolo = await prisma.user.findUniqueOrThrow({ where: { id: solo.id } })
  check('status becomes APPROVED', approvedSolo.status === 'APPROVED')
  check('Institution Code issued', /^INST-[A-Z0-9]{6}$/.test(approvedSolo.institutionCode ?? ''))
  check('Refer Code issued', /^REF-[A-Z0-9]{6}$/.test(approvedSolo.referCode ?? ''))
  check('approvedAt is set', approvedSolo.approvedAt !== null)
  check('no referrer link', approvedSolo.referredById === null)

  const soloNotifications = await prisma.notification.findMany({ where: { userId: solo.id } })
  check(
    'approval notification sent to non-referred DSA',
    soloNotifications.some((n) => n.type === 'application_approved'),
  )
  check(
    'approval notification covers in-app, email and SMS',
    soloNotifications
      .find((n) => n.type === 'application_approved')
      ?.channels.sort()
      .join(',') === 'EMAIL,IN_APP,SMS',
  )

  // ── 2. Approving twice must not reissue codes ────────────────────────────
  const second = await approveApplication({ adminId: admin.id, userId: solo.id })
  check('re-approving an approved DSA is rejected', !second.ok)
  const stillSame = await prisma.user.findUniqueOrThrow({ where: { id: solo.id } })
  check(
    'codes unchanged after duplicate approval attempt',
    stillSame.institutionCode === approvedSolo.institutionCode &&
      stillSame.referCode === approvedSolo.referCode,
  )

  // ── 3. Referral capture ──────────────────────────────────────────────────
  const referred = await makeApplicant('Referred Applicant', approvedSolo.referCode!)
  const referredResult = await approveApplication({ adminId: admin.id, userId: referred.id })
  check('approves an applicant who used a valid Refer Code', referredResult.ok)

  const approvedReferred = await prisma.user.findUniqueOrThrow({ where: { id: referred.id } })
  check('new DSA linked under the referrer', approvedReferred.referredById === solo.id)
  check(
    'referred DSA gets its own distinct codes',
    approvedReferred.referCode !== approvedSolo.referCode &&
      approvedReferred.institutionCode !== approvedSolo.institutionCode,
  )

  const referrerNotifications = await prisma.notification.findMany({ where: { userId: solo.id } })
  check(
    'referrer notified that a DSA joined under them',
    referrerNotifications.some((n) => n.type === 'new_downline_member'),
  )
  check(
    'referred DSA also receives the same approval email',
    (await prisma.notification.count({
      where: { userId: referred.id, type: 'application_approved' },
    })) === 1,
  )

  // ── 4. An Institution Code must never work as a referral code ────────────
  const impostor = await makeApplicant('Impostor Applicant', approvedSolo.institutionCode!)
  const impostorResult = await approveApplication({ adminId: admin.id, userId: impostor.id })
  check('Institution Code is rejected as a Refer Code', !impostorResult.ok)
  const impostorAfter = await prisma.user.findUniqueOrThrow({ where: { id: impostor.id } })
  check('impostor stays PENDING', impostorAfter.status === 'PENDING')
  check('impostor gets no codes', impostorAfter.institutionCode === null)

  // ── 5. Unknown Refer Code ────────────────────────────────────────────────
  const unknown = await makeApplicant('Unknown Code Applicant', 'REF-ZZZZZZ')
  const unknownResult = await approveApplication({ adminId: admin.id, userId: unknown.id })
  check('unknown Refer Code blocks approval', !unknownResult.ok)

  // ── 6. Rejection ─────────────────────────────────────────────────────────
  const doomed = await makeApplicant('Rejected Applicant')
  const reason = 'The uploaded PAN card is not legible.'
  const rejectResult = await rejectApplication({ adminId: admin.id, userId: doomed.id, reason })
  check('rejects an application', rejectResult.ok)

  const rejected = await prisma.user.findUniqueOrThrow({ where: { id: doomed.id } })
  check('status becomes REJECTED', rejected.status === 'REJECTED')
  check('rejection reason stored', rejected.rejectionReason === reason)
  check('no codes issued on rejection', rejected.institutionCode === null && rejected.referCode === null)
  check(
    'rejection notification sent',
    (await prisma.notification.count({
      where: { userId: doomed.id, type: 'application_rejected' },
    })) === 1,
  )

  // ── 7. Audit trail ───────────────────────────────────────────────────────
  const logs = await prisma.auditLog.findMany({
    where: { actorUserId: admin.id, entityId: { in: [solo.id, referred.id, doomed.id] } },
  })
  check(
    'audit rows written for approvals and rejection',
    logs.filter((l) => l.action === 'registration_approved').length === 2 &&
      logs.filter((l) => l.action === 'registration_rejected').length === 1,
  )

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const ids = [solo.id, referred.id, impostor.id, unknown.id, doomed.id]
  await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.updateMany({ where: { id: referred.id }, data: { referredById: null } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  console.log(`\n  ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
