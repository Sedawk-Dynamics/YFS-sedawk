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
    secure: process.env.NODE_ENV === 'production',
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
