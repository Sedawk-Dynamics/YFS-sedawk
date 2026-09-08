import { ArrowRight, CheckCircle2, Clock, Users, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, toNumber } from '@/lib/format'
import { ApplicationStatusBadge } from '../../_components/status-badge'

export const metadata: Metadata = { title: 'Dashboard' }

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  href,
  highlight,
}: {
  label: string
  value: string
  subtitle?: string
  icon: typeof Users
  href?: string
  highlight?: boolean
}) {
  const body = (
    <Card
      className={
        highlight
          ? 'h-full ring-1 ring-gold/50 transition-shadow hover:shadow-md'
          : 'h-full transition-shadow hover:shadow-md'
      }
    >
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-serif text-3xl font-medium text-navy-deep">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span
          className={
            highlight
              ? 'flex size-10 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-dark'
              : 'flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/10 text-navy'
          }
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

export default async function AdminDashboardPage() {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [total, pending, approved, monthPayouts, recent] = await Promise.all([
    prisma.user.count({ where: { role: 'DSA' } }),
    prisma.user.count({ where: { role: 'DSA', status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'DSA', status: 'APPROVED' } }),
    prisma.payout.findMany({
      where: { month: monthStart },
      select: { paidAmount: true, userId: true },
    }),
    prisma.user.findMany({
      where: { role: 'DSA' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  const paidThisMonth = monthPayouts.reduce((sum, p) => sum + toNumber(p.paidAmount), 0)
  const paidDsaCount = new Set(
    monthPayouts.filter((p) => toNumber(p.paidAmount) > 0).map((p) => p.userId),
  ).size

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of registrations and payouts across the portal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total DSA Registrations"
          value={total.toLocaleString('en-IN')}
          subtitle="All time"
          icon={Users}
          href="/admin/registrations"
        />
        <StatCard
          label="Pending Approvals"
          value={pending.toLocaleString('en-IN')}
          subtitle={pending > 0 ? 'Awaiting your review' : 'Nothing waiting'}
          icon={Clock}
          href="/admin/registrations?tab=pending"
          highlight={pending > 0}
        />
        <StatCard
          label="Approved DSAs"
          value={approved.toLocaleString('en-IN')}
          subtitle="Active accounts"
          icon={CheckCircle2}
          href="/admin/registrations?tab=approved"
        />
        <StatCard
          label="Total Payouts (This Month)"
          value={formatCurrency(paidThisMonth)}
          subtitle={`Paid to ${paidDsaCount} DSA${paidDsaCount === 1 ? '' : 's'}`}
          icon={Wallet}
          href="/admin/payouts"
        />
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pb-0">
          <div>
            <h2 className="text-base font-medium text-navy-deep">Recent registrations</h2>
            <p className="text-sm text-muted-foreground">The eight most recent applications.</p>
          </div>
          <Link
            href="/admin/registrations"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
          >
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardContent>
        <CardContent className="px-0">
          {recent.length === 0 ? (
            <p className="px-(--card-spacing) py-8 text-center text-sm text-muted-foreground">
              No DSA registrations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-(--card-spacing)">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="pr-(--card-spacing)">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((dsa) => (
                  <TableRow key={dsa.id}>
                    <TableCell className="pl-(--card-spacing) font-medium text-navy-deep">
                      <Link href={`/admin/registrations/${dsa.id}`} className="hover:underline">
                        {dsa.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dsa.email}</TableCell>
                    <TableCell className="text-muted-foreground">{dsa.mobile}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(dsa.createdAt)}
                    </TableCell>
                    <TableCell className="pr-(--card-spacing)">
                      <ApplicationStatusBadge status={dsa.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
