/**
 * Checks the login rules from spec F2 and the account-privacy behaviour around
 * them: role separation, status messaging, and non-committal responses that
 * cannot be used to discover which accounts exist.
 *
 *   pnpm verify:auth
 *
 * Only the failure paths are exercised, so no session cookie is ever set.
 */
import 'dotenv/config'
import { prisma } from '../lib/db'
import { hashPassword } from '../lib/auth/password'
import {
  dsaPasswordLogin,
  requestLoginOtp,
  requestPasswordReset,
} from '../app/(auth)/_actions/login'
import { adminLogin } from '../app/admin/_actions/auth'

let passed = 0
const failures: string[] = []

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failures.push(label)
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function form(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const VAGUE_DSA = 'Invalid credentials. Check your details and try again.'
const VAGUE_ADMIN = 'Invalid email or password.'
const TAG = Date.now().toString(36)

async function main() {
  console.log('\nVerifying login rules\n')

  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } })
  const approved = await prisma.user.findFirstOrThrow({
    where: { role: 'DSA', status: 'APPROVED' },
  })
  const pending = await prisma.user.findFirst({ where: { role: 'DSA', status: 'PENDING' } })

  // A rejected applicant to test the rejection message.
  const rejected = await prisma.user.create({
    data: {
      role: 'DSA',
      fullName: 'Rejected Tester',
      email: `rejected-${TAG}@example.test`,
      mobile: `70${TAG.slice(-8).replace(/\D/g, '0').padEnd(8, '0')}`.slice(0, 10),
      passwordHash: await hashPassword('Rejected@2026'),
      status: 'REJECTED',
      rejectionReason: 'The uploaded PAN card was not legible.',
    },
  })

  // ── Wrong credentials ────────────────────────────────────────────────────
  console.log('Credentials')
  const wrongPassword = await dsaPasswordLogin(null, form({
    identifier: approved.email,
    password: 'DefinitelyWrong@1',
  }))
  check('wrong password is refused', wrongPassword?.error === VAGUE_DSA, wrongPassword?.error)

  const unknownUser = await dsaPasswordLogin(null, form({
    identifier: `nobody-${TAG}@example.test`,
    password: 'Whatever@1',
  }))
  check(
    'unknown account gives the same message as a wrong password',
    unknownUser?.error === VAGUE_DSA,
    unknownUser?.error,
  )

  // ── Role separation ──────────────────────────────────────────────────────
  console.log('\nRole separation')
  const adminAtDsaLogin = await dsaPasswordLogin(null, form({
    identifier: admin.email,
    password: 'anything',
  }))
  check(
    'an admin cannot sign in at the partner login',
    adminAtDsaLogin?.error === VAGUE_DSA,
    adminAtDsaLogin?.error,
  )

  const dsaAtAdminLogin = await adminLogin(null, form({
    identifier: approved.email,
    email: approved.email,
    password: 'anything',
  }))
  check(
    'a DSA cannot sign in at the admin login',
    dsaAtAdminLogin?.error === VAGUE_ADMIN,
    dsaAtAdminLogin?.error,
  )

  // ── Status messaging (spec F2) ───────────────────────────────────────────
  console.log('\nApplication status messaging')
  if (pending) {
    const pendingLogin = await dsaPasswordLogin(null, form({
      identifier: pending.email,
      password: 'Demo@1234',
    }))
    check(
      'a pending applicant is told their application is under review',
      pendingLogin?.error === 'Your application is under review.',
      pendingLogin?.error,
    )
  }

  const rejectedLogin = await dsaPasswordLogin(null, form({
    identifier: rejected.email,
    password: 'Rejected@2026',
  }))
  check(
    'a rejected applicant is given the reason',
    Boolean(rejectedLogin?.error?.includes('not legible')),
    rejectedLogin?.error,
  )

  // ── Account enumeration ──────────────────────────────────────────────────
  console.log('\nAccount privacy')
  const otpUnknown = await requestLoginOtp(null, form({
    identifier: `ghost-${TAG}@example.test`,
  }))
  check(
    'OTP login does not reveal that an account is missing',
    otpUnknown?.notice === 'If that account exists, a code has been sent.',
    otpUnknown?.notice ?? otpUnknown?.error,
  )

  const resetUnknown = await requestPasswordReset(null, form({
    identifier: `ghost-${TAG}@example.test`,
  }))
  check(
    'password reset does not reveal that an account is missing',
    resetUnknown?.notice === 'If that account exists, a reset code has been sent.',
    resetUnknown?.notice ?? resetUnknown?.error,
  )

  const otpForPending = pending
    ? await requestLoginOtp(null, form({ identifier: pending.email }))
    : null
  if (otpForPending) {
    check(
      'OTP login is refused for a pending applicant',
      otpForPending.error === 'Your application is under review.',
      otpForPending.error ?? otpForPending.notice,
    )
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany({ where: { entityId: rejected.id } })
  await prisma.notification.deleteMany({ where: { userId: rejected.id } })
  await prisma.user.delete({ where: { id: rejected.id } })
  await prisma.otpCode.deleteMany({ where: { identifier: { contains: TAG } } })

  console.log(`\n  ${passed} passed, ${failures.length} failed\n`)
  if (failures.length > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
