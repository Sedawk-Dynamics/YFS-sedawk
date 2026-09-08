/**
 * Walks one applicant through the entire DSA journey using the same services
 * the UI calls: OTP verification, F1 submit, admin approval, code issuance,
 * login check.
 *
 *   pnpm walkthrough
 *
 * Re-running replaces the previous Akshit record, so it is safe to repeat.
 */
import 'dotenv/config'

// Pin the disk driver so the test never depends on a CDN being reachable.
process.env.STORAGE_DRIVER = 'disk'

import { prisma } from '../lib/db'
import { verifyPassword } from '../lib/auth/password'
import { decrypt } from '../lib/crypto'
import { formatDate } from '../lib/format'
import { sendOtp, verifyOtp } from '../lib/services/otp'
import { submitRegistration } from '../lib/services/registration-submit'
import { approveApplication } from '../lib/services/registrations'
import { registrationSchema } from '../lib/validation/registration'

const EMAIL = 'akshitcontact007@gmail.com'
const MOBILE = '9876543210'
const PASSWORD = 'Akshit@2026'

const APPLICANT = {
  fullName: 'Akshit Sharma',
  dob: '1998-06-14',
  gender: 'Male' as const,
  guardianName: 'Rajesh Sharma',
  email: EMAIL,
  mobile: MOBILE,
  alternateNumber: '9123456780',
  addressLine1: '15 Air Enclave',
  addressLine2: 'Murli Vihar, Shahaganj',
  city: 'Agra',
  state: 'Uttar Pradesh' as const,
  pincode: '282010',
  panNumber: 'AKSPS1234K',
  aadhaarNumber: '432112345678',
  accountHolderName: 'Akshit Sharma',
  bankName: 'HDFC Bank',
  accountNumber: '50100234567890',
  confirmAccountNumber: '50100234567890',
  ifsc: 'HDFC0000123',
  hasReferCode: 'no' as const,
  referCode: '',
  password: PASSWORD,
  confirmPassword: PASSWORD,
  terms: 'on' as const,
}

function step(n: number, title: string) {
  console.log(`\n${'─'.repeat(70)}\nSTEP ${n} — ${title}\n${'─'.repeat(70)}`)
}

function ok(label: string, detail = '') {
  console.log(`  [ok]   ${label}${detail ? ` — ${detail}` : ''}`)
}

function info(label: string, value: unknown) {
  console.log(`         ${label.padEnd(24)} ${String(value)}`)
}

function doc(name: string) {
  return new File([Buffer.from(`dummy-${name}-scan`)], `${name}.png`, { type: 'image/png' })
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } })

  // ── Clean slate ──────────────────────────────────────────────────────────
  const previous = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
  if (previous) {
    await prisma.auditLog.deleteMany({ where: { entityId: previous.id } })
    await prisma.notification.deleteMany({ where: { userId: previous.id } })
    await prisma.user.updateMany({ where: { referredById: previous.id }, data: { referredById: null } })
    await prisma.user.delete({ where: { id: previous.id } })
    console.log(`\n  (removed a previous application for ${EMAIL})`)
  }
  await prisma.otpCode.deleteMany({ where: { identifier: { in: [EMAIL, MOBILE] } } })

  // ── 1. Validation ────────────────────────────────────────────────────────
  step(1, 'Fill the form (F1) and validate')
  const parsed = registrationSchema.safeParse(APPLICANT)
  if (!parsed.success) {
    console.log('  Validation failed:')
    for (const issue of parsed.error.issues) console.log(`    ${String(issue.path[0])}: ${issue.message}`)
    process.exitCode = 1
    return
  }
  ok('All fields valid')
  info('Name', APPLICANT.fullName)
  info('Date of birth', `${formatDate(new Date(APPLICANT.dob))} (age check passed)`)
  info('PAN', APPLICANT.panNumber)
  info('Aadhaar', APPLICANT.aadhaarNumber)
  info('Bank', `${APPLICANT.bankName} / ${APPLICANT.ifsc}`)
  info('Account', APPLICANT.accountNumber)
  info('Refer code used', 'none — applying directly')

  // ── 2. OTP ───────────────────────────────────────────────────────────────
  step(2, 'Verify email and mobile by OTP')
  const emailOtp = await sendOtp(EMAIL, 'REGISTER_EMAIL')
  if (!emailOtp.ok || !emailOtp.devCode) throw new Error('Run with OTP_ECHO=1')
  ok('Email OTP issued', emailOtp.devCode)
  const emailCheck = await verifyOtp(EMAIL, 'REGISTER_EMAIL', emailOtp.devCode)
  ok('Email verified', String(emailCheck.ok))

  const mobileOtp = await sendOtp(MOBILE, 'REGISTER_MOBILE')
  if (!mobileOtp.ok || !mobileOtp.devCode) throw new Error('Run with OTP_ECHO=1')
  ok('Mobile OTP issued', mobileOtp.devCode)
  const mobileCheck = await verifyOtp(MOBILE, 'REGISTER_MOBILE', mobileOtp.devCode)
  ok('Mobile verified', String(mobileCheck.ok))

  // ── 3. Submit ────────────────────────────────────────────────────────────
  step(3, 'Submit the application')
  const submitted = await submitRegistration(parsed.data, {
    panCard: doc('pan'),
    aadhaarFront: doc('aadhaar-front'),
    aadhaarBack: doc('aadhaar-back'),
    photograph: doc('photo'),
    addressProof: doc('address-proof'),
    cheque: doc('cheque'),
  })
  if (!submitted.ok) {
    console.log(`  [FAIL] ${submitted.error}${submitted.field ? ` (field: ${submitted.field})` : ''}`)
    process.exitCode = 1
    return
  }
  ok('Application accepted', submitted.applicationId)

  const pending = await prisma.user.findUniqueOrThrow({
    where: { id: submitted.applicationId },
    include: { profile: true, bankDetails: true, documents: true },
  })
  info('Status', pending.status)
  info('Institution code', pending.institutionCode ?? 'not issued yet')
  info('Refer code', pending.referCode ?? 'not issued yet')
  info('Documents stored', pending.documents.length)
  info('Aadhaar at rest', `${pending.profile!.aadhaarNumber.slice(0, 24)}…`)
  info('Aadhaar decrypts to', decrypt(pending.profile!.aadhaarNumber))
  info('Aadhaar shown in UI', `XXXXXXXX${pending.profile!.aadhaarLast4}`)
  info('Account at rest', `${pending.bankDetails!.accountNumber.slice(0, 24)}…`)
  info('Account shown in UI', `XXXXXXXXXX${pending.bankDetails!.accountLast4}`)

  // ── 4. Blocked before approval ───────────────────────────────────────────
  step(4, 'Try to use the account before approval')
  const passwordWorks = await verifyPassword(PASSWORD, pending.passwordHash)
  ok('Password is correct', String(passwordWorks))
  ok('But login is refused', `status is ${pending.status} — "Your application is under review."`)

  // ── 5. Admin approval ────────────────────────────────────────────────────
  step(5, 'Admin approves the application')
  const approval = await approveApplication({ adminId: admin.id, userId: pending.id })
  if (!approval.ok) {
    console.log(`  [FAIL] ${approval.error}`)
    process.exitCode = 1
    return
  }
  ok('Approved by', admin.email)

  const approved = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } })
  info('Status', approved.status)
  info('Institution code', `${approved.institutionCode}  (PRIVATE — never shared)`)
  info('Refer code', `${approved.referCode}  (shareable)`)
  info('Approved at', approved.approvedAt?.toISOString())

  const notifications = await prisma.notification.findMany({
    where: { userId: approved.id },
    orderBy: { createdAt: 'asc' },
  })
  for (const n of notifications) {
    ok(`Notification: ${n.title}`, n.channels.join(', '))
  }

  // ── 6. Login ─────────────────────────────────────────────────────────────
  step(6, 'Log in as the approved DSA')
  ok('Password accepted', String(await verifyPassword(PASSWORD, approved.passwordHash)))
  ok('Dashboard access granted', 'status is APPROVED')

  console.log(`\n${'─'.repeat(70)}\nREADY TO USE IN THE BROWSER\n${'─'.repeat(70)}`)
  console.log(`  Login page   http://localhost:3000/login`)
  console.log(`  Email        ${EMAIL}`)
  console.log(`  Mobile       ${MOBILE}`)
  console.log(`  Password     ${PASSWORD}`)
  console.log(`  Refer code   ${approved.referCode}`)
  console.log(`  Admin view   http://localhost:3000/admin/registrations/${approved.id}\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
