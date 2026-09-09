import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'yfs_session'

const DEFAULT_MAX_AGE = 60 * 60 * 8 // 8 hours
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export type SessionRole = 'ADMIN' | 'DSA'

export type SessionPayload = {
  sub: string
  role: SessionRole
  email: string
  name: string
}

function secret() {
  const raw = process.env.AUTH_SECRET
  if (!raw) throw new Error('AUTH_SECRET is not set. See .env.example.')
  return new TextEncoder().encode(raw)
}

/**
 * Whether to mark the session cookie `Secure`.
 *
 * A `Secure` cookie is silently discarded by the browser over plain HTTP, which
 * makes login appear to succeed and then bounce straight back to the login
 * page. Deriving this from the configured app URL keeps the flag on for every
 * https:// deployment while letting an http:// test host (a Dokploy
 * *.traefik.me domain, say) actually work.
 *
 * COOKIE_SECURE overrides the inference in either direction.
 */
function useSecureCookies() {
  const override = process.env.COOKIE_SECURE
  if (override === 'true') return true
  if (override === 'false') return false

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) return appUrl.startsWith('https://')

  return process.env.NODE_ENV === 'production'
}

export async function signSession(payload: SessionPayload, remember = false) {
  const maxAge = remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE
  const token = await new SignJWT({ role: payload.role, email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret())
  return { token, maxAge }
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    if (!payload.sub || (payload.role !== 'ADMIN' && payload.role !== 'DSA')) return null
    return {
      sub: payload.sub,
      role: payload.role,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
    }
  } catch {
    return null
  }
}

export async function createSessionCookie(payload: SessionPayload, remember = false) {
  const { token, maxAge } = await signSession(payload, remember)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: useSecureCookies(),
    path: '/',
    maxAge,
  })
}

export async function destroySessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}
