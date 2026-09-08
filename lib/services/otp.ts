import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/db'
import { sendEmail, sendSms } from '@/lib/mail'
import type { OtpPurpose } from '@/lib/generated/prisma/client'

export const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 5,
  maxAttempts: 3,
  resendSeconds: 30,
} as const

export type OtpResult =
  | { ok: true; message: string; devCode?: string }
  | { ok: false; error: string }

/**
 * Whether to return the plaintext code to the caller.
 *
 * Local development only: with no mail or SMS provider wired up there is
 * otherwise no way to receive a code. Hard-gated on NODE_ENV so it can never
 * be switched on in production, however OTP_ECHO is set.
 */
function echoCodes() {
  return process.env.NODE_ENV !== 'production' && process.env.OTP_ECHO === '1'
}

function generateCode() {
  return String(randomInt(0, 10 ** OTP_CONFIG.length)).padStart(OTP_CONFIG.length, '0')
}

function isEmail(identifier: string) {
  return identifier.includes('@')
}

/**
 * Issues a one-time code for an email or mobile.
 *
 * Any previous unconsumed code for the same identifier and purpose is discarded,
 * so only the most recent code can be redeemed.
 */
export async function sendOtp(identifier: string, purpose: OtpPurpose): Promise<OtpResult> {
  const target = identifier.trim().toLowerCase()

  const recent = await prisma.otpCode.findFirst({
    where: { identifier: target, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  if (recent) {
    const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000
    if (elapsed < OTP_CONFIG.resendSeconds) {
      const wait = Math.ceil(OTP_CONFIG.resendSeconds - elapsed)
      return { ok: false, error: `Please wait ${wait}s before requesting another code.` }
    }
  }

  const code = generateCode()

  await prisma.$transaction([
    prisma.otpCode.deleteMany({ where: { identifier: target, purpose, consumedAt: null } }),
    prisma.otpCode.create({
      data: {
        identifier: target,
        codeHash: await bcrypt.hash(code, 10),
        purpose,
        expiresAt: new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60_000),
      },
    }),
  ])

  const body = `Your YFS Infinity verification code is ${code}. It expires in ${OTP_CONFIG.expiryMinutes} minutes. Do not share this code with anyone.`

  if (isEmail(target)) {
    await sendEmail({ to: target, subject: 'Your YFS Infinity verification code', body })
  } else {
    await sendSms({ to: target, body })
  }

  return {
    ok: true,
    message: `A ${OTP_CONFIG.length}-digit code has been sent to ${maskIdentifier(target)}.`,
    ...(echoCodes() ? { devCode: code } : {}),
  }
}

/**
 * Redeems a code. Consumes it on success; counts the attempt and locks the code
 * out after the configured maximum on failure.
 */
export async function verifyOtp(
  identifier: string,
  purpose: OtpPurpose,
  code: string,
): Promise<OtpResult> {
  const target = identifier.trim().toLowerCase()

  const record = await prisma.otpCode.findFirst({
    where: { identifier: target, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) return { ok: false, error: 'No active code. Request a new one.' }

  if (record.expiresAt < new Date()) {
    await prisma.otpCode.delete({ where: { id: record.id } })
    return { ok: false, error: 'That code has expired. Request a new one.' }
  }

  if (record.attempts >= OTP_CONFIG.maxAttempts) {
    return { ok: false, error: 'Too many incorrect attempts. Request a new code.' }
  }

  if (!(await bcrypt.compare(code.trim(), record.codeHash))) {
    const updated = await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    })
    const left = OTP_CONFIG.maxAttempts - updated.attempts
    return {
      ok: false,
      error:
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Request a new code.',
    }
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
  return { ok: true, message: 'Verified.' }
}

/**
 * Confirms a code was verified recently, without needing the code again.
 * Used at registration submit to re-check that email and mobile really were
 * verified rather than trusting a client-side flag.
 */
export async function wasRecentlyVerified(
  identifier: string,
  purpose: OtpPurpose,
  withinMinutes = 60,
) {
  const since = new Date(Date.now() - withinMinutes * 60_000)
  const record = await prisma.otpCode.findFirst({
    where: {
      identifier: identifier.trim().toLowerCase(),
      purpose,
      consumedAt: { not: null, gte: since },
    },
  })
  return Boolean(record)
}

export function maskIdentifier(identifier: string) {
  if (isEmail(identifier)) {
    const [name, domain] = identifier.split('@')
    const head = name.slice(0, 2)
    return `${head}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`
  }
  return `${'*'.repeat(Math.max(0, identifier.length - 4))}${identifier.slice(-4)}`
}

/** Housekeeping for expired and consumed codes. */
export async function purgeStaleOtps() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000)
  const { count } = await prisma.otpCode.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { consumedAt: { lt: cutoff } }] },
  })
  return count
}
