'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { monthInputToDate } from '@/lib/format'
import {
  createPayout,
  deletePayoutEntry,
  publishPayoutEntry,
  recordPayment,
  replaceSlip,
} from '@/lib/services/payouts'

export type PayoutState = { error?: string; success?: string } | null

const CATEGORIES = ['LOAN', 'REFERRAL', 'INSTITUTION_MEMBER', 'INCENTIVE', 'ADJUSTMENT'] as const

const addPayoutSchema = z
  .object({
    userId: z.string().uuid('Select a DSA'),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Select a payout month'),
    category: z.enum(CATEGORIES),
    loanType: z.string().trim().optional(),
    amount: z.coerce.number().finite('Enter a valid amount'),
    paidAmount: z.coerce.number().finite().min(0, 'Paid amount cannot be negative').default(0),
    remarks: z.string().trim().max(2000).optional(),
    status: z.enum(['PENDING', 'PUBLISHED', 'PAID']),
  })
  .refine((v) => v.category !== 'LOAN' || Boolean(v.loanType), {
    message: 'Select a loan type for a Loan Categories payout',
    path: ['loanType'],
  })
  .refine((v) => v.category === 'ADJUSTMENT' || v.amount > 0, {
    message: 'Amount must be positive. Only Adjustments may be negative.',
    path: ['amount'],
  })

const idSchema = z.string().uuid()

function revalidateFor(userId?: string) {
  revalidatePath('/admin/payouts')
  if (userId) revalidatePath(`/admin/payouts/${userId}`)
  revalidatePath('/admin/dashboard')
}

export async function addPayout(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const admin = await requireAdmin()

  const parsed = addPayoutSchema.safeParse({
    userId: formData.get('userId'),
    month: formData.get('month'),
    category: formData.get('category'),
    loanType: formData.get('loanType') || undefined,
    amount: formData.get('amount'),
    paidAmount: formData.get('paidAmount') || 0,
    remarks: formData.get('remarks') || undefined,
    status: formData.get('status'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const month = monthInputToDate(parsed.data.month)
  if (!month) return { error: 'Select a valid payout month.' }

  const slip = formData.get('slip')

  const result = await createPayout({
    adminId: admin.id,
    userId: parsed.data.userId,
    month,
    category: parsed.data.category,
    loanType: parsed.data.loanType,
    amount: parsed.data.amount,
    paidAmount: parsed.data.paidAmount,
    remarks: parsed.data.remarks,
    status: parsed.data.status,
    slip: slip instanceof File && slip.size > 0 ? slip : null,
  })
  if (!result.ok) return { error: result.error }

  revalidateFor(parsed.data.userId)
  return { success: result.message }
}

export async function publishPayout(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const admin = await requireAdmin()
  const payoutId = String(formData.get('payoutId') ?? '')
  if (!idSchema.safeParse(payoutId).success) return { error: 'Invalid payout reference.' }

  const result = await publishPayoutEntry({ adminId: admin.id, payoutId })
  if (!result.ok) return { error: result.error }

  revalidateFor()
  return { success: result.message }
}

export async function updatePaidAmount(
  _prev: PayoutState,
  formData: FormData,
): Promise<PayoutState> {
  const admin = await requireAdmin()

  const parsed = z
    .object({ payoutId: z.string().uuid(), paidAmount: z.coerce.number().finite().min(0) })
    .safeParse({
      payoutId: formData.get('payoutId'),
      paidAmount: formData.get('paidAmount'),
    })
  if (!parsed.success) return { error: 'Enter a valid paid amount.' }

  const result = await recordPayment({
    adminId: admin.id,
    payoutId: parsed.data.payoutId,
    paidAmount: parsed.data.paidAmount,
  })
  if (!result.ok) return { error: result.error }

  revalidateFor()
  return { success: result.message }
}

export async function uploadSlip(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const admin = await requireAdmin()

  const payoutId = String(formData.get('payoutId') ?? '')
  if (!idSchema.safeParse(payoutId).success) return { error: 'Invalid payout reference.' }

  const slip = formData.get('slip')
  if (!(slip instanceof File) || slip.size === 0) return { error: 'Choose a file to upload.' }

  const result = await replaceSlip({ adminId: admin.id, payoutId, file: slip })
  if (!result.ok) return { error: result.error }

  revalidateFor()
  return { success: result.message }
}

export async function deletePayout(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const admin = await requireAdmin()
  const payoutId = String(formData.get('payoutId') ?? '')
  if (!idSchema.safeParse(payoutId).success) return { error: 'Invalid payout reference.' }

  const result = await deletePayoutEntry({ adminId: admin.id, payoutId })
  if (!result.ok) return { error: result.error }

  revalidateFor()
  return { success: result.message }
}
