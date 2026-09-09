/**
 * End-to-end check of the DSA-facing flow against the real database: OTP
 * verification, registration submit, referral capture, approval, and the
 * status rules that gate the dashboard.
 *
 *   pnpm verify:dsa
 *
 * Creates its own throwaway records and removes them afterwards.
 */
import 'dotenv/config'

// Pin the disk driver so the test never depends on a CDN being reachable.
process.env.STORAGE_DRIVER = 'disk'

import { prisma } from '../lib/db'
import { verifyPassword } from '../lib/auth/password'
import { OTP_CONFIG, sendOtp, verifyOtp } from '../lib/services/otp'
import { submitRegistration } from '../lib/services/registration-submit'
import { approveApplication } from '../lib/services/registrations'
import { registrationSchema } from '../lib/validation/registration'

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

const TAG = Date.now().toString(36)
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']

// PAN is globally unique, so derive a run-specific prefix rather than a fixed
// literal that could collide with seeded demo data.
const PAN_PREFIX = Array.from({ length: 4 }, (_, i) =>
  String.fromCharCode(65 + ((TAG.charCodeAt(i % TAG.length) + i * 7) % 26)),
).join('')
const PASSWORD = 'Partner@2026'

/**
 * Issues a code and reads it back through the OTP_ECHO dev hook, standing in
 * for the applicant's inbox.
 */
async function issueAndRead(
  identifier: string,
  purpose: 'REGISTER_EMAIL' | 'REGISTER_MOBILE',
): Promise<string> {
  const result = await sendOtp(identifier, purpose)
  if (!result.ok) throw new Error(`OTP not issued for ${identifier}: ${result.error}`)
  if (!result.devCode) throw new Error('OTP_ECHO=1 is required to run this verification')
  return result.devCode
}

function fileFor(name: string) {
  return new File([Buffer.from(`test-document-${name}`)], `${name}.png`, { type: 'image/png' })
}

function baseInput(index: number, referCode?: string) {
  const digits = String(index).padStart(2, '0')
  return {
    fullName: `Verify ${NAMES[index]}`,
    dob: '1995-04-12',
    gender: 'Male' as const,
    guardianName: 'Guardian Name',
    email: `dsa-${TAG}-${index}@example.test`,
    mobile: `98${digits}${String(TAG).slice(-6).replace(/\D/g, '0').padEnd(6, '0')}`.slice(0, 10),
    alternateNumber: '',
    addressLine1: '15 Air Enclave',
    addressLine2: 'Murli Vihar',
    city: 'Agra',
    state: 'Uttar Pradesh' as const,
    pincode: '282010',
    panNumber: `${PAN_PREFIX}${String.fromCharCode(65 + index)}1234F`,
    aadhaarNumber: `${index}23412341234`.slice(0, 12),
    accountHolderName: `Verify ${NAMES[index]}`,
    bankName: 'HDFC Bank',
    accountNumber: `1234567890${digits}`,
    confirmAccountNumber: `1234567890${digits}`,
    ifsc: 'HDFC0001234',
    hasReferCode: (referCode ? 'yes' : 'no') as 'yes' | 'no',
    referCode: referCode ?? '',
    password: PASSWORD,
    confirmPassword: PASSWORD,
    terms: 'on' as const,
  }
}

const docs = () => ({
  panCard: fileFor('pan'),
  aadhaarFront: fileFor('aadhaar-front'),
  aadhaarBack: fileFor('aadhaar-back'),
  photograph: fileFor('photo'),
  addressProof: null,
  cheque: null,
})

/** Only the email address is challenged; there is no SMS provider. */
async function verifyContact(email: string) {
  await verifyOtp(email, 'REGISTER_EMAIL', await issueAndRead(email, 'REGISTER_EMAIL'))
}

const created: string[] = []

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } })
  console.log('\nRunning DSA flow verification\n')

  // ── 1. OTP mechanics ─────────────────────────────────────────────────────
  const otpTarget = `otp-${TAG}@example.test`
  const realCode = await issueAndRead(otpTarget, 'REGISTER_EMAIL')
  check('OTP is issued', /^\d{6}$/.test(realCode))

  const immediate = await sendOtp(otpTarget, 'REGISTER_EMAIL')
  check('resend is throttled inside the cooldown', !immediate.ok)

  const decoy = realCode === '000000' ? '111111' : '000000'
  const wrong = await verifyOtp(otpTarget, 'REGISTER_EMAIL', decoy)
  check('a wrong code is rejected', !wrong.ok)

  const good = await verifyOtp(otpTarget, 'REGISTER_EMAIL', realCode)
  check('the correct code verifies', good.ok)

  const replay = await verifyOtp(otpTarget, 'REGISTER_EMAIL', realCode)
  check('a consumed code cannot be reused', !replay.ok)

  const expired = await prisma.otpCode.create({
    data: {
      identifier: `expired-${TAG}@example.test`,
      codeHash: (await import('bcryptjs')).default.hashSync('111111', 10),
      purpose: 'REGISTER_EMAIL',
      expiresAt: new Date(Date.now() - 1000),
    },
  })
  const expiredResult = await verifyOtp(expired.identifier, 'REGISTER_EMAIL', '111111')
  check('an expired code is rejected', !expiredResult.ok)
  check('OTP policy matches the spec', OTP_CONFIG.expiryMinutes === 5 && OTP_CONFIG.maxAttempts === 3)

  // ── 2. Registration requires verified contact details ────────────────────
  const unverified = registrationSchema.parse(baseInput(1))
  const blocked = await submitRegistration(unverified, docs())
  check('submit is blocked without email OTP verification', !blocked.ok)

  // ── 3. A complete registration ───────────────────────────────────────────
  const soloInput = registrationSchema.parse(baseInput(2))
  await verifyContact(soloInput.email)
  const solo = await submitRegistration(soloInput, docs())
  check('a fully verified application is accepted', solo.ok)
  if (!solo.ok) throw new Error(solo.error)
  created.push(solo.applicationId)

  const saved = await prisma.user.findUniqueOrThrow({
    where: { id: solo.applicationId },
    include: { profile: true, bankDetails: true, documents: true },
  })
  check('status starts as PENDING', saved.status === 'PENDING')
  check('no codes before approval', saved.institutionCode === null && saved.referCode === null)
  check('email marked verified', saved.emailVerified)
  check('mobile recorded as unverified', saved.mobileVerified === false)
  check('password is stored hashed, not in plaintext', saved.passwordHash !== PASSWORD)
  check('the chosen password verifies', await verifyPassword(PASSWORD, saved.passwordHash))
  check('all four required documents stored', saved.documents.length === 4)
  check(
    'Aadhaar is encrypted at rest',
    saved.profile?.aadhaarNumber !== soloInput.aadhaarNumber &&
      saved.profile?.aadhaarLast4 === soloInput.aadhaarNumber.slice(-4),
  )
  check(
    'bank account number is encrypted at rest',
    saved.bankDetails?.accountNumber !== soloInput.accountNumber &&
      saved.bankDetails?.accountLast4 === soloInput.accountNumber.slice(-4),
  )
  check(
    'admin notified of the new registration',
    (await prisma.notification.count({
      where: { userId: admin.id, type: 'new_registration' },
    })) > 0,
  )

  // ── 4. Duplicate email is refused ────────────────────────────────────────
  const dupInput = registrationSchema.parse({ ...baseInput(3), email: soloInput.email })
  await verifyContact(dupInput.email)
  const dup = await submitRegistration(dupInput, docs())
  check('a duplicate email is refused', !dup.ok)

  // ── 5. Referral: valid code captured, Institution Code refused ───────────
  const approved = await approveApplication({ adminId: admin.id, userId: solo.applicationId })
  check('the application can be approved', approved.ok)
  const referrer = await prisma.user.findUniqueOrThrow({ where: { id: solo.applicationId } })

  const referredInput = registrationSchema.parse(baseInput(4, referrer.referCode!))
  await verifyContact(referredInput.email)
  const referred = await submitRegistration(referredInput, docs())
  check(
    'registration with a valid Refer Code is accepted',
    referred.ok,
    referred.ok ? undefined : `${referred.error} (field: ${referred.field ?? 'none'})`,
  )
  if (referred.ok) {
    created.push(referred.applicationId)
    const row = await prisma.user.findUniqueOrThrow({ where: { id: referred.applicationId } })
    check('the Refer Code is retained on the application', row.submittedReferCode === referrer.referCode)
    check('the referrer link waits for approval', row.referredById === null)
  }

  const impostorInput = registrationSchema.parse(baseInput(5, referrer.institutionCode!))
  await verifyContact(impostorInput.email)
  const impostor = await submitRegistration(impostorInput, docs())
  check('an Institution Code is refused at registration', !impostor.ok)
  check(
    'the refusal reveals nothing about the code',
    !impostor.ok && impostor.error === 'Invalid Refer Code',
  )

  const unknownInput = registrationSchema.parse(baseInput(6, 'REF-ZZZZZZ'))
  await verifyContact(unknownInput.email)
  const unknown = await submitRegistration(unknownInput, docs())
  check('an unknown Refer Code is refused', !unknown.ok)

  // ── 6. Validation rules ──────────────────────────────────────────────────
  check(
    'an applicant under 18 is rejected',
    !registrationSchema.safeParse({ ...baseInput(7), dob: '2015-01-01' }).success,
  )
  check(
    'a malformed PAN is rejected',
    !registrationSchema.safeParse({ ...baseInput(7), panNumber: 'BAD123' }).success,
  )
  check(
    'a malformed IFSC is rejected',
    !registrationSchema.safeParse({ ...baseInput(7), ifsc: 'XX1' }).success,
  )
  check(
    'mismatched account numbers are rejected',
    !registrationSchema.safeParse({ ...baseInput(7), confirmAccountNumber: '999999999' }).success,
  )
  check(
    'a weak password is rejected',
    !registrationSchema.safeParse({ ...baseInput(7), password: 'password', confirmPassword: 'password' })
      .success,
  )
  check(
    'unchecked terms are rejected',
    !registrationSchema.safeParse({ ...baseInput(7), terms: '' }).success,
  )

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const all = await prisma.user.findMany({
    where: { email: { contains: `-${TAG}-` } },
    select: { id: true },
  })
  const ids = [...new Set([...created, ...all.map((u) => u.id)])]
  await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { userId: admin.id, type: 'new_registration' } })
  await prisma.user.updateMany({ where: { referredById: { in: ids } }, data: { referredById: null } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.otpCode.deleteMany({ where: { identifier: { contains: TAG } } })

  console.log(`\n  ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
