import { ArrowLeft, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { prisma } from '@/lib/db'
import {
  currentMonthInput,
  formatCurrency,
  formatMonth,
  monthInputToDate,
  PAYOUT_CATEGORY_LABELS,
  toNumber,
} from '@/lib/format'
import { MonthPicker } from '../../../_components/month-picker'
import { PayoutRowActions } from '../../../_components/payout-row-actions'
import { PaymentStatusBadge, PayoutStatusBadge } from '../../../_components/status-badge'

export const metadata: Metadata = { title: 'Payout Details' }

export default async function DsaPayoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { userId } = await params
  const query = await searchParams
  const monthInput =
    query.month && monthInputToDate(query.month) ? query.month : currentMonthInput()
  const month = monthInputToDate(monthInput)!

  const dsa = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, referCode: true },
  })
  if (!dsa || dsa.role !== 'DSA') notFound()

  const [entries, history] = await Promise.all([
    prisma.payout.findMany({ where: { userId, month }, orderBy: { createdAt: 'asc' } }),
    prisma.payout.groupBy({
      by: ['month'],
      where: { userId },
      _sum: { amount: true, paidAmount: true },
      orderBy: { month: 'desc' },
      take: 12,
    }),
  ])

  const totals = entries.reduce(
    (acc, e) => ({
      amount: acc.amount + toNumber(e.amount),
      paid: acc.paid + toNumber(e.paidAmount),
    }),
    { amount: 0, paid: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/admin/payouts?month=${monthInput}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-navy-deep"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to payout management
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-navy-deep">{dsa.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dsa.email}
            {dsa.referCode ? ` · Refer Code ${dsa.referCode}` : ''}
          </p>
        </div>
        <MonthPicker value={monthInput} />
      </div>

      <Card>
        <CardContent className="border-b pb-(--card-spacing)">
          <h2 className="text-base font-medium text-navy-deep">
            Breakdown by category — {formatMonth(month)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Publish an entry, record a payment, or replace the uploaded slip.
          </p>
        </CardContent>

        <CardContent className="px-0">
          {entries.length === 0 ? (
            <p className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
              No payout entries for {formatMonth(month)}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-(--card-spacing)">Category</TableHead>
                  <TableHead>Loan type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">DSA Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Slip</TableHead>
                  <TableHead className="pr-(--card-spacing) text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-(--card-spacing) font-medium text-navy-deep">
                      {PAYOUT_CATEGORY_LABELS[entry.category]}
                      {entry.remarks && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {entry.remarks}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.loanType ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <PayoutStatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell>
                      {entry.slipFileUrl ? (
                        <a
                          href={entry.slipFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-gold-dark hover:underline"
                        >
                          <FileText className="size-3.5" aria-hidden />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not uploaded yet</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-(--card-spacing) text-right">
                      <PayoutRowActions
                        payoutId={entry.id}
                        status={entry.status}
                        amount={toNumber(entry.amount)}
                        paidAmount={toNumber(entry.paidAmount)}
                        hasSlip={Boolean(entry.slipFileUrl)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="pl-(--card-spacing) font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(totals.amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(totals.paid)}
                  </TableCell>
                  <TableCell colSpan={3}>
                    <PaymentStatusBadge total={totals.amount} paid={totals.paid} />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="border-b pb-(--card-spacing)">
          <h2 className="text-base font-medium text-navy-deep">Payout history</h2>
          <p className="text-sm text-muted-foreground">Last twelve months with recorded entries.</p>
        </CardContent>
        <CardContent className="px-0">
          {history.length === 0 ? (
            <p className="px-(--card-spacing) py-8 text-center text-sm text-muted-foreground">
              No payout history yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-(--card-spacing)">Month</TableHead>
                  <TableHead className="text-right">Total earnings</TableHead>
                  <TableHead className="text-right">DSA Payout</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                  <TableHead className="pr-(--card-spacing)">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => {
                  const amount = toNumber(row._sum.amount)
                  const paid = toNumber(row._sum.paidAmount)
                  return (
                    <TableRow key={row.month.toISOString()}>
                      <TableCell className="pl-(--card-spacing)">
                        <Link
                          href={`/admin/payouts/${userId}?month=${row.month.getUTCFullYear()}-${String(row.month.getUTCMonth() + 1).padStart(2, '0')}`}
                          className="font-medium text-navy-deep hover:underline"
                        >
                          {formatMonth(row.month)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(paid)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(amount - paid)}
                      </TableCell>
                      <TableCell className="pr-(--card-spacing)">
                        <PaymentStatusBadge total={amount} paid={paid} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
