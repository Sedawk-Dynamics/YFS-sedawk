'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { requireAdmin } from '@/lib/auth/guards'
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/auth/password'
import { createSessionCookie, destroySessionCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export type AuthState = { error?: string } | null

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
})

// Deliberately vague: never reveal whether the email exists or the account is an admin.
const INVALID = 'Invalid email or password.'

export async function adminLogin(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    remember: formData.get('remember') === 'on',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { email, password, remember } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // Hash a throwaway value when no user matches so a missing account and a wrong
  // password take comparable time.
  if (!user) {
    await verifyPassword(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu')
    return { error: INVALID }
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    await audit({ actorUserId: user.id, action: 'admin_login_failed', entity: 'user', entityId: user.id })
    return { error: INVALID }
  }

  // Admin login accepts admins only. A DSA hitting this form is rejected outright.
  if (user.role !== 'ADMIN') return { error: INVALID }
  if (user.status !== 'APPROVED') return { error: 'This admin account is not active.' }

  await createSessionCookie(
    { sub: user.id, role: 'ADMIN', email: user.email, name: user.fullName },
    remember,
  )
  await audit({ actorUserId: user.id, action: 'admin_login', entity: 'user', entityId: user.id })

  const next = String(formData.get('next') ?? '')
  // Only accept same-origin admin paths, so `next` cannot be used as an open redirect.
  redirect(next.startsWith('/admin/') && !next.startsWith('/admin/login') ? next : '/admin/dashboard')
}

export async function adminLogout() {
  const session = await prisma.user
    .findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
    .catch(() => null)
  await destroySessionCookie()
  if (session) await audit({ actorUserId: session.id, action: 'admin_logout', entity: 'user' })
  redirect('/admin/login')
}

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

export type ChangePasswordState = { error?: string; success?: boolean } | null

export async function adminChangePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const admin = await requireAdmin()

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { error: 'Current password is incorrect.' }
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  })
  await audit({ actorUserId: admin.id, action: 'admin_password_changed', entity: 'user', entityId: admin.id })

  return { success: true }
}
