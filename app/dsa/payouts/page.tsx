import { Download, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireDsa } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import {
  formatCurrency,
  formatMonth,
  PAYOUT_CATEGORY_LABELS,
  toNumber,
} from '@/lib/format'
import type { PayoutCategory, Prisma } from '@/lib/generated/prisma/client'
import { PayoutStatusBadge } from '@/app/admin/_components/status-badge'

export const metadata: Metadata = { title: 'Payouts' }

const CATEGORIES = Object.keys(PAYOUT_CATEGORY_LABELS) as PayoutCategory[]

export default async function DsaPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string }>
}) {
  const dsa = await requireDsa()
  const params = await searchParams

  const category = CATEGORIES.includes(params.category as PayoutCategory)
    ? (params.category as PayoutCategory)
    : undefined

  const from = params.from ? new Date(params.from) : null
  const to = params.to ? new Date(params.to) : null
  const monthFilter: Prisma.DateTimeFilter = {}
  if (from && !Number.isNaN(from.valueOf())) monthFilter.gte = from
  if (to && !Number.isNaN(to.valueOf())) monthFilter.lte = to

  const payouts = await prisma.payout.findMany({
    where: {
      userId: dsa.id,
      // Pending entries are invisible to the DSA (spec §9.1).
      status: { in: ['PUBLISHED', 'PAID'] },
      ...(category ? { category } : {}),
      ...(Object.keys(monthFilter).length ? { month: monthFilter } : {}),
    },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
  })

  const totals = payouts.reduce(
    (acc, p) => ({
      amount: acc.amount + toNumber(p.amount),
      paid: acc.paid + toNumber(p.paidAmount),
    }),
    { amount: 0, paid: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your published payouts across all five categories, with the salary slip our team uploaded.
        </p>
      </div>

      <Card>
        <CardContent>
          <form method="get" className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor="from" className="text-sm font-medium">
                From
              </label>
              <input
                id="from"
                name="from"
                type="month"
                defaultValue={params.from ?? ''}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="to" className="text-sm font-medium">
                To
              </label>
              <input
                id="to"
                name="to"
                type="month"
                defaultValue={params.to ?? ''}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <NativeSelect id="category" name="category" defaultValue={category ?? ''} className="h-9">
                <option value="">All categories</option>
                {CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {PAYOUT_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-navy px-4 text-sm font-medium text-navy-foreground transition-colors hover:bg-navy-deep"
            >
              Apply filters
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          {payouts.length === 0 ? (
            <p className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
              No payouts match these filters yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-(--card-spacing)">Month</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">DSA Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-(--card-spacing)">Salary slip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="pl-(--card-spacing) font-medium text-navy-deep">
                      {formatMonth(payout.month)}
                    </TableCell>
                    <TableCell>
                      <span className="text-navy-deep">
                        {PAYOUT_CATEGORY_LABELS[payout.category]}
                      </span>
                      {payout.loanType && (
                        <span className="block text-xs text-muted-foreground">
                          {payout.loanType}
                        </span>
                      )}
                      {payout.remarks && (
                        <span className="block text-xs text-muted-foreground">
                          {payout.remarks}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(payout.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(payout.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <PayoutStatusBadge status={payout.status} />
                    </TableCell>
                    <TableCell className="pr-(--card-spacing)">
                      {payout.slipFileUrl ? (
                        <a
                          href={payout.slipFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
                        >
                          <Download className="size-3.5" aria-hidden />
                          Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="size-3.5" aria-hidden />
                          Slip not uploaded yet
                        </span>
                      )}
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
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
