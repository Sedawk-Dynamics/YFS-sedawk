import { KeyRound } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Profile' }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-navy-deep">{value}</dd>
    </div>
  )
}

export default async function AdminProfilePage() {
  const session = await requireAdmin()
  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { fullName: true, email: true, mobile: true, createdAt: true },
  })

  const recentActions = await prisma.auditLog.findMany({
    where: { actorUserId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, action: true, entity: true, createdAt: true },
  })

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin accounts are created by the operations team. Contact your super admin to change
          these details.
        </p>
      </div>

      <Card>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" value={admin.fullName} />
            <Field label="Email" value={admin.email} />
            <Field label="Mobile" value={admin.mobile.startsWith('admin-') ? '—' : admin.mobile} />
            <Field label="Account created" value={formatDateTime(admin.createdAt)} />
          </dl>
        </CardContent>
        <CardContent className="border-t pt-(--card-spacing)">
          <Link
            href="/admin/change-password"
            className="inline-flex items-center gap-2 text-sm font-medium text-gold-dark hover:underline"
          >
            <KeyRound className="size-4" aria-hidden />
            Change password
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="border-b pb-(--card-spacing)">
          <h2 className="text-base font-medium text-navy-deep">Your recent actions</h2>
          <p className="text-sm text-muted-foreground">
            Every admin action is recorded in the audit trail.
          </p>
        </CardContent>
        <CardContent>
          {recentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentActions.map((log) => (
                <li key={log.id} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-navy-deep">{log.action.replace(/_/g, ' ')}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
