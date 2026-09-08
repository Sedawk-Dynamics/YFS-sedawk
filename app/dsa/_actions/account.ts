'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { requireDsa } from '@/lib/auth/guards'
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/db'

export type AccountState = { error?: string; success?: string } | null

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'New password must differ from the current one',
    path: ['newPassword'],
  })

export async function changeDsaPassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const dsa = await requireDsa()

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: dsa.id } })
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { error: 'Current password is incorrect.' }
  }

  await prisma.user.update({
    where: { id: dsa.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  })
  await audit({ actorUserId: dsa.id, action: 'password_changed', entity: 'user', entityId: dsa.id })

  return { success: 'Password updated.' }
}

export async function markNotificationsRead(): Promise<void> {
  const dsa = await requireDsa()
  await prisma.notification.updateMany({
    where: { userId: dsa.id, readAt: null },
    data: { readAt: new Date() },
  })
  revalidatePath('/dsa/notifications')
  revalidatePath('/dsa/dashboard')
}
