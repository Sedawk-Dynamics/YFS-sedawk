import { audit } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { formatMonth } from '@/lib/format'
import { payoutPublishedEmail } from '@/lib/mail'
import { notify } from '@/lib/notify'
import { isStorageConfigured, storage, UPLOAD_LIMITS, validateUpload } from '@/lib/storage'
import type { PayoutCategory, PayoutStatus } from '@/lib/generated/prisma/client'

export type PayoutResult =
  | { ok: true; message: string; payoutId?: string }
  | { ok: false; error: string }

type Recipient = { id: string; fullName: string; email: string; mobile: string }

/** Spec §10.2 — "Payout Published", on in-app, email and SMS. */
async function notifyPublished(dsa: Recipient, month: Date, hasSlip: boolean) {
  const label = formatMonth(month)
  await notify({
    userId: dsa.id,
    title: 'Payout Published',
    message: `Your payout for ${label} is now available in your dashboard.`,
    type: 'payout_published',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    email: { to: dsa.email, ...payoutPublishedEmail(dsa.fullName, label, hasSlip) },
    sms: { to: dsa.mobile, body: `YFS Infinity: your payout for ${label} has been published.` },
  })
}

async function notifyPaid(dsa: Recipient, month: Date) {
  const label = formatMonth(month)
  await notify({
    userId: dsa.id,
    title: 'Payment Received',
    message: `Your payout for ${label} has been paid in full.`,
    type: 'payout_paid',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    email: {
      to: dsa.email,
      subject: 'Your payout has been paid',
      body: `Dear ${dsa.fullName},\n\nYour payout for ${label} has been paid in full.\n\nYFS Infinity Private Limited`,
    },
    sms: { to: dsa.mobile, body: `YFS Infinity: your payout for ${label} has been paid.` },
  })
}

type SlipResult =
  | { ok: true; url: string; publicId: string }
  | { ok: false; error: string }

async function storeSlip(file: File, userId: string): Promise<SlipResult> {
  const invalid = validateUpload(file, UPLOAD_LIMITS.slip)
  if (invalid) return { ok: false, error: invalid }

  if (!isStorageConfigured() && process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'File storage is not configured.' }
  }

  try {
    const stored = await storage.upload(file, `yfs/salary-slips/${userId}`)
    return { ok: true, url: stored.url, publicId: stored.publicId }
  } catch (error) {
    console.error('[storeSlip] upload failed', error)
    return { ok: false, error: 'The salary slip could not be uploaded.' }
  }
}

/**
 * Records a payout (spec F8). Every figure is supplied by the admin — nothing
 * here is calculated, and no slip is generated.
 */
export async function createPayout(input: {
  adminId: string
  userId: string
  month: Date
  category: PayoutCategory
  loanType?: string | null
  amount: number
  paidAmount?: number
  remarks?: string | null
  status: PayoutStatus
  slip?: File | null
}): Promise<PayoutResult> {
  const dsa = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, status: true, fullName: true, email: true, mobile: true },
  })
  if (!dsa || dsa.role !== 'DSA' || dsa.status !== 'APPROVED') {
    return { ok: false, error: 'Payouts can only be recorded against an approved DSA.' }
  }

  const hasSlip = Boolean(input.slip && input.slip.size > 0)

  // The DSA downloads the uploaded file itself, so publishing without one would
  // show a payout with nothing to download.
  if (input.status !== 'PENDING' && !hasSlip) {
    return { ok: false, error: 'Upload the salary slip before publishing this payout.' }
  }

  let slipFileUrl: string | null = null
  let slipFilePublicId: string | null = null
  if (hasSlip) {
    const stored = await storeSlip(input.slip!, dsa.id)
    if (!stored.ok) return { ok: false, error: stored.error }
    slipFileUrl = stored.url
    slipFilePublicId = stored.publicId
  }

  const payout = await prisma.payout.create({
    data: {
      userId: dsa.id,
      month: input.month,
      category: input.category,
      loanType: input.category === 'LOAN' ? (input.loanType ?? null) : null,
      amount: input.amount,
      paidAmount: input.paidAmount ?? 0,
      remarks: input.remarks ?? null,
      slipFileUrl,
      slipFilePublicId,
      status: input.status,
      createdById: input.adminId,
      publishedAt: input.status === 'PENDING' ? null : new Date(),
      paidAt: input.status === 'PAID' ? new Date() : null,
    },
  })

  await audit({
    actorUserId: input.adminId,
    action: 'payout_created',
    entity: 'payout',
    entityId: payout.id,
    meta: { userId: dsa.id, category: input.category, amount: input.amount, status: input.status },
  })

  if (input.status !== 'PENDING') await notifyPublished(dsa, input.month, hasSlip)

  return { ok: true, message: `Payout recorded for ${dsa.fullName}.`, payoutId: payout.id }
}

export async function publishPayoutEntry(input: {
  adminId: string
  payoutId: string
}): Promise<PayoutResult> {
  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    include: { user: { select: { id: true, fullName: true, email: true, mobile: true } } },
  })
  if (!payout) return { ok: false, error: 'Payout not found.' }
  if (payout.status !== 'PENDING') return { ok: false, error: 'This payout is already published.' }
  if (!payout.slipFileUrl) {
    return {
      ok: false,
      error: 'Upload the salary slip before publishing — the DSA downloads that exact file.',
    }
  }

  await prisma.payout.update({
    where: { id: payout.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  })
  await audit({
    actorUserId: input.adminId,
    action: 'payout_published',
    entity: 'payout',
    entityId: payout.id,
    meta: { userId: payout.userId },
  })

  await notifyPublished(payout.user, payout.month, true)

  return { ok: true, message: 'Payout published. The DSA can now see it.' }
}

/**
 * Records money actually paid. Reaching the full amount flips the entry to PAID
 * and notifies the DSA; anything less leaves it PUBLISHED and partially paid.
 */
export async function recordPayment(input: {
  adminId: string
  payoutId: string
  paidAmount: number
}): Promise<PayoutResult> {
  if (input.paidAmount < 0) return { ok: false, error: 'Paid amount cannot be negative.' }

  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    include: { user: { select: { id: true, fullName: true, email: true, mobile: true } } },
  })
  if (!payout) return { ok: false, error: 'Payout not found.' }
  if (payout.status === 'PENDING') {
    return { ok: false, error: 'Publish this payout before recording a payment against it.' }
  }

  const amount = Number(payout.amount.toString())
  const fullyPaid = input.paidAmount >= amount && amount > 0
  const wasAlreadyPaid = payout.status === 'PAID'

  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      paidAmount: input.paidAmount,
      status: fullyPaid ? 'PAID' : 'PUBLISHED',
      paidAt: fullyPaid ? (payout.paidAt ?? new Date()) : null,
    },
  })
  await audit({
    actorUserId: input.adminId,
    action: 'payout_payment_recorded',
    entity: 'payout',
    entityId: payout.id,
    meta: { paidAmount: input.paidAmount, amount, fullyPaid },
  })

  // Only announce the transition into PAID, so correcting a paid entry does not
  // send a second "payment received" notice.
  if (fullyPaid && !wasAlreadyPaid) await notifyPaid(payout.user, payout.month)

  return {
    ok: true,
    message: fullyPaid ? 'Recorded as paid in full.' : 'Partial payment recorded.',
  }
}

/** Replaces the manually uploaded slip. The DSA always sees the latest version. */
export async function replaceSlip(input: {
  adminId: string
  payoutId: string
  file: File
}): Promise<PayoutResult> {
  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    select: { id: true, userId: true, slipFilePublicId: true },
  })
  if (!payout) return { ok: false, error: 'Payout not found.' }

  const stored = await storeSlip(input.file, payout.userId)
  if (!stored.ok) return { ok: false, error: stored.error }

  const previousPublicId = payout.slipFilePublicId

  await prisma.payout.update({
    where: { id: payout.id },
    data: { slipFileUrl: stored.url, slipFilePublicId: stored.publicId },
  })

  // Drop the old file only once the new one is committed, so a failed delete
  // never leaves the payout pointing at nothing.
  if (previousPublicId && previousPublicId !== stored.publicId) {
    storage
      .remove(previousPublicId)
      .catch((error) => console.error('[replaceSlip] could not remove replaced file', error))
  }

  await audit({
    actorUserId: input.adminId,
    action: 'payout_slip_uploaded',
    entity: 'payout',
    entityId: payout.id,
    meta: { replaced: Boolean(previousPublicId) },
  })

  return { ok: true, message: 'Salary slip uploaded.' }
}

export async function deletePayoutEntry(input: {
  adminId: string
  payoutId: string
}): Promise<PayoutResult> {
  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    select: { id: true, userId: true, status: true, slipFilePublicId: true, amount: true },
  })
  if (!payout) return { ok: false, error: 'Payout not found.' }
  if (payout.status === 'PAID') {
    return { ok: false, error: 'A paid payout cannot be deleted. Record an Adjustment instead.' }
  }

  await prisma.payout.delete({ where: { id: payout.id } })
  if (payout.slipFilePublicId) {
    storage
      .remove(payout.slipFilePublicId)
      .catch((error) => console.error('[deletePayoutEntry] could not remove slip', error))
  }

  await audit({
    actorUserId: input.adminId,
    action: 'payout_deleted',
    entity: 'payout',
    entityId: payout.id,
    meta: { userId: payout.userId, amount: payout.amount.toString() },
  })

  return { ok: true, message: 'Payout deleted.' }
}
