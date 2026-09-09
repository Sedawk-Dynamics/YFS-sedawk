import { randomUUID } from 'node:crypto'
import { audit } from '@/lib/audit'
import { hashPassword } from '@/lib/auth/password'
import { encrypt } from '@/lib/crypto'
import { prisma } from '@/lib/db'
import { sendEmail, sendSms } from '@/lib/mail'
import { notify } from '@/lib/notify'
import { storage, UPLOAD_LIMITS, validateUpload } from '@/lib/storage'
import { wasRecentlyVerified } from './otp'
import type { RegistrationInput } from '@/lib/validation/registration'
import type { DocType } from '@/lib/generated/prisma/client'

export type SubmitResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string; field?: string }

type UploadSlot = { field: string; docType: DocType; file: File | null; required: boolean }

/**
 * Completes a DSA registration (spec F1) in one shot: everything — password,
 * KYC, bank details — is captured here, with nothing deferred to a later step.
 */
export async function submitRegistration(
  input: RegistrationInput,
  files: {
    panCard: File | null
    aadhaarFront: File | null
    aadhaarBack: File | null
    photograph: File | null
    addressProof: File | null
    cheque: File | null
  },
): Promise<SubmitResult> {
  // Re-verify the email OTP server-side. The client marks the field "verified",
  // but only the consumed OTP record proves it.
  //
  // The mobile number is collected but not challenged: there is no SMS provider
  // wired up, so a code sent there would never arrive. It is recorded as
  // unverified, which the admin sees on the application detail page.
  if (!(await wasRecentlyVerified(input.email, 'REGISTER_EMAIL'))) {
    return { ok: false, error: 'Verify your email with the OTP before submitting.', field: 'email' }
  }

  const [emailTaken, mobileTaken, panTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { mobile: input.mobile }, select: { id: true } }),
    prisma.dsaProfile.findUnique({ where: { panNumber: input.panNumber }, select: { id: true } }),
  ])
  if (emailTaken) return { ok: false, error: 'An account with this email already exists.', field: 'email' }
  if (mobileTaken) return { ok: false, error: 'An account with this mobile number already exists.', field: 'mobile' }
  if (panTaken) return { ok: false, error: 'An account with this PAN already exists.', field: 'panNumber' }

  // Only Refer Codes are accepted. An Institution Code entered here must fail
  // exactly like an unknown code, revealing nothing (spec §1.1, §8).
  let referrerId: string | null = null
  if (input.hasReferCode === 'yes' && input.referCode) {
    const referrer = await prisma.user.findFirst({
      where: { referCode: input.referCode, status: 'APPROVED' },
      select: { id: true },
    })
    if (!referrer) return { ok: false, error: 'Invalid Refer Code', field: 'referCode' }
    referrerId = referrer.id
  }

  const slots: UploadSlot[] = [
    { field: 'panCard', docType: 'PAN', file: files.panCard, required: true },
    { field: 'aadhaarFront', docType: 'AADHAAR_FRONT', file: files.aadhaarFront, required: true },
    { field: 'aadhaarBack', docType: 'AADHAAR_BACK', file: files.aadhaarBack, required: true },
    { field: 'photograph', docType: 'PHOTO', file: files.photograph, required: true },
    { field: 'addressProof', docType: 'ADDRESS_PROOF', file: files.addressProof, required: false },
    { field: 'cheque', docType: 'CHEQUE', file: files.cheque, required: false },
  ]

  for (const slot of slots) {
    if (!slot.file || slot.file.size === 0) {
      if (slot.required) return { ok: false, error: 'This document is required.', field: slot.field }
      continue
    }
    const limit = slot.docType === 'PHOTO' ? UPLOAD_LIMITS.photo : UPLOAD_LIMITS.kyc
    const invalid = validateUpload(slot.file, limit)
    if (invalid) return { ok: false, error: invalid, field: slot.field }
  }

  // Settle the user id up front so documents can be filed under it. Using the
  // email here would put PII in every document URL, and would break the
  // ownership check in /api/files, which matches the path against the session
  // user id.
  const userId = randomUUID()

  // Upload before the transaction so a storage failure leaves no half-made user.
  const uploaded: Array<{ docType: DocType; url: string; publicId: string }> = []
  try {
    for (const slot of slots) {
      if (!slot.file || slot.file.size === 0) continue
      const stored = await storage.upload(slot.file, `yfs/kyc/${userId}`)
      uploaded.push({ docType: slot.docType, url: stored.url, publicId: stored.publicId })
    }
  } catch (error) {
    console.error('[submitRegistration] upload failed', error)
    await Promise.all(uploaded.map((u) => storage.remove(u.publicId).catch(() => {})))
    return { ok: false, error: 'Your documents could not be uploaded. Please try again.' }
  }

  let applicationId: string
  try {
    const user = await prisma.user.create({
      data: {
        id: userId,
        role: 'DSA',
        fullName: input.fullName,
        email: input.email,
        emailVerified: true,
        mobile: input.mobile,
        mobileVerified: false,
        passwordHash: await hashPassword(input.password),
        status: 'PENDING',
        // The referrer link is only committed on approval (spec §3 stage 6);
        // the code itself is retained so the admin can verify its owner.
        submittedReferCode: referrerId ? input.referCode : null,
        profile: {
          create: {
            dob: input.dob,
            gender: input.gender ?? null,
            guardianName: input.guardianName || null,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2 || null,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            panNumber: input.panNumber,
            aadhaarNumber: encrypt(input.aadhaarNumber),
            aadhaarLast4: input.aadhaarNumber.slice(-4),
            photoUrl: uploaded.find((u) => u.docType === 'PHOTO')?.url ?? null,
          },
        },
        bankDetails: {
          create: {
            accountHolderName: input.accountHolderName,
            bankName: input.bankName,
            accountNumber: encrypt(input.accountNumber),
            accountLast4: input.accountNumber.slice(-4),
            ifsc: input.ifsc,
          },
        },
        documents: {
          create: uploaded.map((u) => ({
            docType: u.docType,
            fileUrl: u.url,
            publicId: u.publicId,
          })),
        },
      },
      select: { id: true },
    })
    applicationId = user.id
  } catch (error) {
    console.error('[submitRegistration] create failed', error)
    await Promise.all(uploaded.map((u) => storage.remove(u.publicId).catch(() => {})))
    return { ok: false, error: 'Your application could not be saved. Please try again.' }
  }

  await audit({
    actorUserId: applicationId,
    action: 'registration_submitted',
    entity: 'user',
    entityId: applicationId,
    meta: { withReferCode: Boolean(referrerId) },
  })

  // Confirmation to the applicant.
  await sendEmail({
    to: input.email,
    subject: 'We have received your DSA application',
    body:
      `Dear ${input.fullName},\n\n` +
      'Thank you for applying to become a YFS Infinity DSA partner. Your application has been ' +
      'received and is now pending review by our team.\n\n' +
      'Status: Pending Approval\n\n' +
      'We will email you as soon as your documents have been verified.\n\n' +
      'YFS Infinity Private Limited',
  }).catch((error) => console.error('[submitRegistration] confirmation email failed', error))

  await sendSms({
    to: input.mobile,
    body: 'YFS Infinity: your DSA application has been received and is pending approval.',
  }).catch((error) => console.error('[submitRegistration] confirmation sms failed', error))

  // Admin notification (spec §10.2, "New Registration Submitted").
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'APPROVED' },
    select: { id: true, email: true },
  })
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      title: 'New Registration Submitted',
      message: `${input.fullName} has submitted a DSA application.`,
      type: 'new_registration',
      channels: ['IN_APP', 'EMAIL'],
      email: {
        to: admin.email,
        subject: 'New DSA registration awaiting review',
        body: `${input.fullName} (${input.email}) has submitted a DSA application.\n\nReview it in the admin portal.`,
      },
    })
  }

  return { ok: true, applicationId }
}
