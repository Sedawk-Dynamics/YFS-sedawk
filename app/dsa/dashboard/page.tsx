import { ArrowRight, Bell, CheckCircle2, Network, Users, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { requireDsa } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, formatMonth, toNumber } from '@/lib/format'
import { PayoutStatusBadge } from '@/app/admin/_components/status-badge'
import { CopyButton } from '../_components/copy-button'

export const metadata: Metadata = { title: 'Dashboard' }

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  label: string
  value: string
  subtitle?: string
  icon: typeof Users
  href?: string
}) {
  const body = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-serif text-3xl font-medium text-navy-deep">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/10 text-navy">
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

export default async function DsaDashboardPage() {
  const dsa = await requireDsa()

  const [referralCount, payoutAgg, recentPayouts, unread] = await Promise.all([
    prisma.user.count({ where: { referredById: dsa.id } }),
    // Only published and paid entries are visible to the DSA (spec §9.1).
    prisma.payout.aggregate({
      where: { userId: dsa.id, status: { in: ['PUBLISHED', 'PAID'] } },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.payout.findMany({
      where: { userId: dsa.id, status: { in: ['PUBLISHED', 'PAID'] } },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.notification.count({ where: { userId: dsa.id, readAt: null } }),
  ])

  const earned = toNumber(payoutAgg._sum.amount)
  const paid = toNumber(payoutAgg._sum.paidAmount)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">
          Welcome back, {dsa.fullName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account has been active since {formatDate(dsa.approvedAt)}.
        </p>
      </div>

      <Card className="ring-emerald-200">
        <CardContent className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
          <div>
            <p className="text-sm font-medium text-navy-deep">Account status: Approved</p>
            <p className="text-sm text-muted-foreground">
              Your documents have been verified and both codes have been issued.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total referrals"
          value={referralCount.toLocaleString('en-IN')}
          subtitle="DSAs joined under your code"
          icon={Network}
          href="/dsa/referrals"
        />
        <StatCard
          label="Total earnings"
          value={formatCurrency(earned)}
          subtitle="Published payouts"
          icon={Wallet}
          href="/dsa/payouts"
        />
        <StatCard
          label="Received"
          value={formatCurrency(paid)}
          subtitle={`${formatCurrency(earned - paid)} outstanding`}
          icon={CheckCircle2}
          href="/dsa/payouts"
        />
        <StatCard
          label="Unread notifications"
          value={unread.toLocaleString('en-IN')}
          subtitle={unread > 0 ? 'Needs your attention' : 'All caught up'}
          icon={Bell}
          href="/dsa/notifications"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-medium text-navy-deep">Your Refer Code</h2>
              <p className="text-sm text-muted-foreground">
                Share this with prospective DSAs so they can register under you.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2.5 font-mono text-lg text-navy-deep">
                {dsa.referCode}
              </code>
              <CopyButton value={dsa.referCode ?? ''} label="Copy Refer Code" />
            </div>
            <Link
              href="/dsa/referrals"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
            >
              Manage referrals
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-4 border-b pb-(--card-spacing)">
            <h2 className="text-base font-medium text-navy-deep">Recent payouts</h2>
            <Link
              href="/dsa/payouts"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
            >
              View all
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </CardContent>
          <CardContent>
            {recentPayouts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payouts published yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentPayouts.map((payout) => (
                  <li key={payout.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-navy-deep">
                        {formatMonth(payout.month)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payout.loanType ?? payout.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-navy-deep">
                        {formatCurrency(payout.amount)}
                      </span>
                      <PayoutStatusBadge status={payout.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
