import { audit } from '@/lib/audit'
import { generateUniqueCodes } from '@/lib/codes'
import { prisma } from '@/lib/db'
import { approvalEmail, newReferralEmail, rejectionEmail } from '@/lib/mail'
import { notify } from '@/lib/notify'

export type ServiceResult = { ok: true; message: string } | { ok: false; error: string }

/**
 * Approves a DSA application.
 *
 * Kept free of request context so it can be driven from a server action, a
 * script, or a test. Callers are responsible for authenticating the admin.
 *
 * The status flip, code issuance and referrer link happen in one transaction so
 * an account can never end up approved without codes, or with only one of them.
 * Notifications fire afterwards — a mail outage must not roll back an approval.
 */
export async function approveApplication({
  adminId,
  userId,
}: {
  adminId: string
  userId: string
}): Promise<ServiceResult> {
  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      fullName: true,
      email: true,
      mobile: true,
      submittedReferCode: true,
    },
  })

  if (!applicant || applicant.role !== 'DSA') return { ok: false, error: 'Application not found.' }
  if (applicant.status === 'APPROVED') {
    return { ok: false, error: 'This application is already approved.' }
  }

  // Resolve the referrer from the code the applicant typed. Only Refer Codes are
  // ever accepted — an Institution Code must not link anybody (spec §8).
  let referrer: { id: string; fullName: string; email: string } | null = null
  if (applicant.submittedReferCode) {
    referrer = await prisma.user.findFirst({
      where: { referCode: applicant.submittedReferCode, status: 'APPROVED' },
      select: { id: true, fullName: true, email: true },
    })
    if (!referrer) {
      return {
        ok: false,
        error: `Refer Code ${applicant.submittedReferCode} no longer resolves to an approved DSA. Resolve this before approving.`,
      }
    }
  }

  const { institutionCode, referCode } = await generateUniqueCodes()

  try {
    await prisma.$transaction(async (tx) => {
      // Guard on status inside the transaction so two admins clicking Approve
      // at once cannot both issue codes.
      const updated = await tx.user.updateMany({
        where: { id: userId, status: { not: 'APPROVED' } },
        data: {
          status: 'APPROVED',
          rejectionReason: null,
          institutionCode,
          referCode,
          referredById: referrer?.id ?? null,
          approvedAt: new Date(),
        },
      })
      if (updated.count === 0) throw new Error('ALREADY_APPROVED')
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_APPROVED') {
      return { ok: false, error: 'This application was just approved by someone else.' }
    }
    console.error('[approveApplication] transaction failed', error)
    return { ok: false, error: 'Could not approve the application. Please try again.' }
  }

  await audit({
    actorUserId: adminId,
    action: 'registration_approved',
    entity: 'user',
    entityId: userId,
    meta: { institutionCode, referCode, referrerId: referrer?.id ?? null },
  })

  // Mandatory approval email — identical for referred and non-referred DSAs.
  await notify({
    userId,
    title: 'Application Approved',
    message: 'Your documents have been successfully verified. You can now log in.',
    type: 'application_approved',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    email: { to: applicant.email, ...approvalEmail(applicant.fullName) },
    sms: {
      to: applicant.mobile,
      body: 'YFS Infinity: your documents have been verified. You can now log in to the DSA Portal.',
    },
  })

  if (referrer) {
    await notify({
      userId: referrer.id,
      title: 'New DSA Joined Under You',
      message: `${applicant.fullName} has been approved and linked under your Refer Code.`,
      type: 'new_downline_member',
      channels: ['IN_APP', 'EMAIL'],
      email: {
        to: referrer.email,
        ...newReferralEmail(referrer.fullName, applicant.fullName),
      },
    })
  }

  return { ok: true, message: `Approved. Codes issued: ${institutionCode} / ${referCode}.` }
}

export async function rejectApplication({
  adminId,
  userId,
  reason,
}: {
  adminId: string
  userId: string
  reason: string
}): Promise<ServiceResult> {
  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, fullName: true, email: true, mobile: true },
  })
  if (!applicant || applicant.role !== 'DSA') return { ok: false, error: 'Application not found.' }
  if (applicant.status === 'APPROVED') {
    return {
      ok: false,
      error: 'This DSA is already approved. Rejecting an active account is not supported.',
    }
  }

  // No codes are issued on rejection (spec §3.1).
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'REJECTED', rejectionReason: reason },
  })

  await audit({
    actorUserId: adminId,
    action: 'registration_rejected',
    entity: 'user',
    entityId: userId,
    meta: { reason },
  })

  await notify({
    userId,
    title: 'Application Rejected',
    message: reason,
    type: 'application_rejected',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    email: { to: applicant.email, ...rejectionEmail(applicant.fullName, reason) },
    sms: {
      to: applicant.mobile,
      body: `YFS Infinity: your DSA application could not be approved. Reason: ${reason}`,
    },
  })

  return { ok: true, message: 'Application rejected and the applicant has been notified.' }
}

/** Spec F7 — regeneration is exceptional and always leaves an audit trail. */
export async function regenerateCode({
  adminId,
  userId,
  which,
}: {
  adminId: string
  userId: string
  which: 'institution' | 'refer'
}): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, institutionCode: true, referCode: true },
  })
  if (!user || user.status !== 'APPROVED') {
    return { ok: false, error: 'Codes exist only for approved DSAs.' }
  }

  const { institutionCode, referCode } = await generateUniqueCodes()
  const next = which === 'institution' ? institutionCode : referCode
  const previous = which === 'institution' ? user.institutionCode : user.referCode

  await prisma.user.update({
    where: { id: userId },
    data: which === 'institution' ? { institutionCode } : { referCode },
  })
  await audit({
    actorUserId: adminId,
    action: 'code_regenerated',
    entity: 'user',
    entityId: userId,
    meta: { which, previous, next },
  })

  return {
    ok: true,
    message: `${which === 'institution' ? 'Institution' : 'Refer'} Code regenerated. The previous code no longer works.`,
  }
}
