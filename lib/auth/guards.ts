import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession, type SessionPayload } from './session'

/**
 * Resolves the signed-in admin, re-checking the database on every call so a
 * demoted or deleted account cannot keep using an unexpired token.
 * Redirects to the admin login when there is no valid admin session.
 */
export async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/admin/login')

  const admin = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, fullName: true, email: true, role: true, status: true },
  })
  if (!admin || admin.role !== 'ADMIN' || admin.status !== 'APPROVED') redirect('/admin/login')

  return admin
}

/**
 * Resolves the signed-in DSA. Only an approved account reaches the dashboard —
 * pending and rejected applicants are sent back to the login page, which
 * explains their status (spec §1.1).
 */
export async function requireDsa() {
  const session = await getSession()
  if (!session || session.role !== 'DSA') redirect('/login')

  const dsa = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      institutionCode: true,
      referCode: true,
      approvedAt: true,
    },
  })
  if (!dsa || dsa.role !== 'DSA' || dsa.status !== 'APPROVED') redirect('/login')

  return dsa
}

/** Same check for route handlers, which return a response instead of redirecting. */
export async function getAdminOrNull(): Promise<SessionPayload | null> {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  const admin = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, status: true },
  })
  if (!admin || admin.role !== 'ADMIN' || admin.status !== 'APPROVED') return null
  return session
}
