'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/auth/password'
import { createSessionCookie, destroySessionCookie } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { sendOtp, verifyOtp } from '@/lib/services/otp'

export type LoginState = { error?: string; notice?: string } | null

/**
 * Appends the code to the on-screen notice when the OTP_ECHO dev hook is on.
 * `devCode` is only ever populated outside production, so this cannot leak on
 * a live server.
 */
function withDevCode(message: string, devCode?: string) {
  return devCode ? `${message} Development code: ${devCode}` : message
}

// Deliberately vague, so the form never reveals whether an account exists.
const INVALID = 'Invalid credentials. Check your details and try again.'
const DUMMY_HASH = '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu'

const identifierSchema = z.string().trim().min(1, 'Enter your email or mobile number')

/** Accepts either a registered email or a 10-digit mobile. */
async function findByIdentifier(raw: string) {
  const identifier = raw.trim().toLowerCase()
  return prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { mobile: identifier }] },
  })
}

/**
 * Translates account status into what the applicant should be told.
 * Pending and rejected DSAs get a specific message (spec F2).
 */
function statusMessage(status: string, reason: string | null) {
  if (status === 'PENDING') return 'Your application is under review.'
  if (status === 'REJECTED') {
    return reason
      ? `Your application was not approved. Reason: ${reason}`
      : 'Your application was not approved.'
  }
  return null
}

export async function dsaPasswordLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsedId = identifierSchema.safeParse(formData.get('identifier'))
  const password = String(formData.get('password') ?? '')
  if (!parsedId.success) return { error: parsedId.error.issues[0].message }
  if (!password) return { error: 'Enter your password' }

  const user = await findByIdentifier(parsedId.data)
  if (!user) {
    // Keep the timing comparable to a real password check.
    await verifyPassword(password, DUMMY_HASH)
    return { error: INVALID }
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    await audit({ actorUserId: user.id, action: 'login_failed', entity: 'user', entityId: user.id })
    return { error: INVALID }
  }

  // The admin portal has its own login; admins are not accepted here.
  if (user.role !== 'DSA') return { error: INVALID }

  const blocked = statusMessage(user.status, user.rejectionReason)
  if (blocked) return { error: blocked }

  await createSessionCookie(
    { sub: user.id, role: 'DSA', email: user.email, name: user.fullName },
    formData.get('remember') === 'on',
  )
  await audit({ actorUserId: user.id, action: 'login', entity: 'user', entityId: user.id })

  redirect('/dsa/dashboard')
}

/** Step 1 of "Login with OTP" — send the code. */
export async function requestLoginOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = identifierSchema.safeParse(formData.get('identifier'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const user = await findByIdentifier(parsed.data)

  // Report success either way, so this cannot be used to enumerate accounts.
  if (!user || user.role !== 'DSA') {
    return { notice: 'If that account exists, a code has been sent.' }
  }

  const blocked = statusMessage(user.status, user.rejectionReason)
  if (blocked) return { error: blocked }

  const target = parsed.data.includes('@') ? user.email : user.mobile
  const result = await sendOtp(target, 'LOGIN')
  return result.ok ? { notice: withDevCode(result.message, result.devCode) } : { error: result.error }
}

/** Step 2 of "Login with OTP" — redeem the code. */
export async function dsaOtpLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = identifierSchema.safeParse(formData.get('identifier'))
  const code = String(formData.get('code') ?? '').trim()
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit code.' }

  const user = await findByIdentifier(parsed.data)
  if (!user || user.role !== 'DSA') return { error: INVALID }

  const blocked = statusMessage(user.status, user.rejectionReason)
  if (blocked) return { error: blocked }

  const target = parsed.data.includes('@') ? user.email : user.mobile
  const result = await verifyOtp(target, 'LOGIN', code)
  if (!result.ok) return { error: result.error }

  await createSessionCookie(
    { sub: user.id, role: 'DSA', email: user.email, name: user.fullName },
    formData.get('remember') === 'on',
  )
  await audit({ actorUserId: user.id, action: 'login_otp', entity: 'user', entityId: user.id })

  redirect('/dsa/dashboard')
}

export async function dsaLogout() {
  await destroySessionCookie()
  redirect('/login')
}

// ── Forgot / reset password (spec F3) ──────────────────────────────────────

export type ResetState = { error?: string; notice?: string; done?: boolean } | null

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = identifierSchema.safeParse(formData.get('identifier'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const user = await findByIdentifier(parsed.data)
  if (!user) return { notice: 'If that account exists, a reset code has been sent.' }

  const target = parsed.data.includes('@') ? user.email : user.mobile
  const result = await sendOtp(target, 'RESET')
  return result.ok ? { notice: withDevCode(result.message, result.devCode) } : { error: result.error }
}

const resetSchema = z
  .object({
    identifier: identifierSchema,
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export async function completePasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    identifier: formData.get('identifier'),
    code: formData.get('code'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const user = await findByIdentifier(parsed.data.identifier)
  if (!user) return { error: 'Invalid or expired code.' }

  const target = parsed.data.identifier.includes('@') ? user.email : user.mobile
  const result = await verifyOtp(target, 'RESET', parsed.data.code)
  if (!result.ok) return { error: result.error }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  })
  await audit({ actorUserId: user.id, action: 'password_reset', entity: 'user', entityId: user.id })

  return { done: true, notice: 'Your password has been reset. You can now log in.' }
}

// ── Application status lookup ──────────────────────────────────────────────

export type StatusState =
  | { stage: 'request'; error?: string; notice?: string; identifier?: string }
  | {
      stage: 'result'
      status: 'PENDING' | 'APPROVED' | 'REJECTED'
      fullName: string
      submittedAt: string
      rejectionReason: string | null
    }

export async function requestStatusOtp(
  _prev: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const parsed = identifierSchema.safeParse(formData.get('identifier'))
  if (!parsed.success) return { stage: 'request', error: parsed.error.issues[0].message }

  const user = await findByIdentifier(parsed.data)
  if (!user || user.role !== 'DSA') {
    return {
      stage: 'request',
      notice: 'If an application exists for those details, a code has been sent.',
      identifier: parsed.data,
    }
  }

  const target = parsed.data.includes('@') ? user.email : user.mobile
  const result = await sendOtp(target, 'LOGIN')
  return result.ok
    ? { stage: 'request', notice: withDevCode(result.message, result.devCode), identifier: parsed.data }
    : { stage: 'request', error: result.error, identifier: parsed.data }
}

export async function checkApplicationStatus(
  _prev: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const identifier = String(formData.get('identifier') ?? '')
  const code = String(formData.get('code') ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    return { stage: 'request', error: 'Enter the 6-digit code.', identifier }
  }

  const user = await findByIdentifier(identifier)
  if (!user || user.role !== 'DSA') {
    return { stage: 'request', error: 'Invalid or expired code.', identifier }
  }

  const target = identifier.includes('@') ? user.email : user.mobile
  const result = await verifyOtp(target, 'LOGIN', code)
  if (!result.ok) return { stage: 'request', error: result.error, identifier }

  return {
    stage: 'result',
    status: user.status,
    fullName: user.fullName,
    submittedAt: user.createdAt.toISOString(),
    rejectionReason: user.rejectionReason,
  }
}
