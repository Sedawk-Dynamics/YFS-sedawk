'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { sendOtp, verifyOtp } from '@/lib/services/otp'
import { mobileSchema } from '@/lib/validation/registration'

export type OtpState = { ok?: boolean; error?: string; message?: string } | null

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address')

/**
 * Sends a registration OTP. Rejects an identifier that already belongs to an
 * account so the applicant finds out now rather than at submit.
 */
export async function requestRegistrationOtp(
  channel: 'email' | 'mobile',
  value: string,
): Promise<OtpState> {
  const parsed = channel === 'email' ? emailSchema.safeParse(value) : mobileSchema.safeParse(value)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const identifier = parsed.data
  const existing = await prisma.user.findUnique({
    where: channel === 'email' ? { email: identifier } : { mobile: identifier },
    select: { id: true },
  })
  if (existing) {
    return {
      error:
        channel === 'email'
          ? 'An account with this email already exists. Try logging in instead.'
          : 'An account with this mobile number already exists.',
    }
  }

  const result = await sendOtp(identifier, channel === 'email' ? 'REGISTER_EMAIL' : 'REGISTER_MOBILE')
  if (!result.ok) return { error: result.error }
  // devCode is only populated by the OTP_ECHO dev hook, never in production.
  return {
    ok: true,
    message: result.devCode
      ? `${result.message} Development code: ${result.devCode}`
      : result.message,
  }
}

export async function confirmRegistrationOtp(
  channel: 'email' | 'mobile',
  value: string,
  code: string,
): Promise<OtpState> {
  const parsed = channel === 'email' ? emailSchema.safeParse(value) : mobileSchema.safeParse(value)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (!/^\d{6}$/.test(code.trim())) return { error: 'Enter the 6-digit code.' }

  const result = await verifyOtp(
    parsed.data,
    channel === 'email' ? 'REGISTER_EMAIL' : 'REGISTER_MOBILE',
    code,
  )
  return result.ok ? { ok: true, message: 'Verified.' } : { error: result.error }
}
