'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import {
  approveApplication,
  regenerateCode,
  rejectApplication,
} from '@/lib/services/registrations'

export type DecisionState = { error?: string; success?: string } | null

const approveSchema = z.object({ userId: z.string().uuid() })

const rejectSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(10, 'Give the applicant a reason of at least 10 characters'),
})

const regenerateSchema = z.object({
  userId: z.string().uuid(),
  which: z.enum(['institution', 'refer']),
})

function revalidateFor(userId: string) {
  revalidatePath('/admin/registrations')
  revalidatePath(`/admin/registrations/${userId}`)
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/referrals')
}

export async function approveRegistration(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const admin = await requireAdmin()

  const parsed = approveSchema.safeParse({ userId: formData.get('userId') })
  if (!parsed.success) return { error: 'Invalid application reference.' }

  const result = await approveApplication({ adminId: admin.id, userId: parsed.data.userId })
  if (!result.ok) return { error: result.error }

  revalidateFor(parsed.data.userId)
  return { success: result.message }
}

export async function rejectRegistration(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const admin = await requireAdmin()

  const parsed = rejectSchema.safeParse({
    userId: formData.get('userId'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const result = await rejectApplication({
    adminId: admin.id,
    userId: parsed.data.userId,
    reason: parsed.data.reason,
  })
  if (!result.ok) return { error: result.error }

  revalidateFor(parsed.data.userId)
  return { success: result.message }
}

export async function regenerateCodes(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const admin = await requireAdmin()

  const parsed = regenerateSchema.safeParse({
    userId: formData.get('userId'),
    which: formData.get('which'),
  })
  if (!parsed.success) return { error: 'Invalid code regeneration request.' }

  const result = await regenerateCode({
    adminId: admin.id,
    userId: parsed.data.userId,
    which: parsed.data.which,
  })
  if (!result.ok) return { error: result.error }

  revalidatePath(`/admin/registrations/${parsed.data.userId}`)
  return { success: result.message }
}
