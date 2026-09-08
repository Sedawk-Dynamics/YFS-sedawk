import type { Metadata } from 'next'
import { requireDsa } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { DsaShell } from './_components/dsa-shell'

export const metadata: Metadata = {
  title: { default: 'Partner Portal | YFS Infinity', template: '%s | YFS Partner Portal' },
  robots: { index: false, follow: false },
}

export default async function DsaLayout({ children }: { children: React.ReactNode }) {
  // Re-verified on every page: a revoked account cannot ride an unexpired token.
  const dsa = await requireDsa()

  const unread = await prisma.notification.count({
    where: { userId: dsa.id, readAt: null },
  })

  return (
    <DsaShell
      dsa={{ name: dsa.fullName, email: dsa.email, referCode: dsa.referCode }}
      unread={unread}
    >
      {children}
    </DsaShell>
  )
}
