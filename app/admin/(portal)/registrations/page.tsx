import { Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ApplicationStatus, Prisma } from '@/lib/generated/prisma/client'
import { ApplicationStatusBadge } from '../../_components/status-badge'
import { RowDecisionButtons } from '../../_components/row-decision-buttons'

export const metadata: Metadata = { title: 'DSA Registrations' }

const PAGE_SIZE = 10

const TABS = [
  { key: 'all', label: 'All', status: undefined },
  { key: 'pending', label: 'Pending', status: 'PENDING' },
  { key: 'approved', label: 'Approved', status: 'APPROVED' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED' },
] as const

type TabKey = (typeof TABS)[number]['key']

function buildHref(params: { tab: TabKey; q?: string; page?: number }) {
  const search = new URLSearchParams()
  if (params.tab !== 'all') search.set('tab', params.tab)
  if (params.q) search.set('q', params.q)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const qs = search.toString()
  return qs ? `/admin/registrations?${qs}` : '/admin/registrations'
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const tab = (TABS.find((t) => t.key === params.tab)?.key ?? 'all') as TabKey
  const status = TABS.find((t) => t.key === tab)?.status as ApplicationStatus | undefined
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, Number(params.page) || 1)

  const search: Prisma.UserWhereInput = q
    ? {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { mobile: { contains: q } },
        ],
      }
    : {}

  const where: Prisma.UserWhereInput = { role: 'DSA', ...search, ...(status ? { status } : {}) }

  const [rows, matching, counts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        status: true,
        createdAt: true,
        submittedReferCode: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({
      by: ['status'],
      where: { role: 'DSA', ...search },
      _count: { _all: true },
    }),
  ])

  const countFor = (key: TabKey) => {
    if (key === 'all') return counts.reduce((sum, c) => sum + c._count._all, 0)
    const target = TABS.find((t) => t.key === key)?.status
    return counts.find((c) => c.status === target)?._count._all ?? 0
  }

  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE))
  const first = matching === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = Math.min(page * PAGE_SIZE, matching)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">DSA Registrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review applications, verify Refer Codes, and approve or reject.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 border-b pb-(--card-spacing) lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                href={buildHref({ tab: t.key, q })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  tab === t.key
                    ? 'bg-navy text-navy-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-navy-deep',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs',
                    tab === t.key ? 'bg-navy-foreground/20' : 'bg-muted',
                  )}
                >
                  {countFor(t.key)}
                </span>
              </Link>
            ))}
          </div>

          <form method="get" className="flex items-center gap-2">
            {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search name, email or mobile"
                aria-label="Search registrations"
                className="h-9 w-full pl-8 lg:w-72"
              />
            </div>
          </form>
        </CardContent>

        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
              {q ? `No registrations match “${q}”.` : 'No registrations in this tab yet.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-(--card-spacing)">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Refer Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-(--card-spacing) text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((dsa, i) => (
                  <TableRow key={dsa.id}>
                    <TableCell className="pl-(--card-spacing) text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </TableCell>
                    <TableCell className="font-medium text-navy-deep">
                      <Link href={`/admin/registrations/${dsa.id}`} className="hover:underline">
                        {dsa.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dsa.email}</TableCell>
                    <TableCell className="text-muted-foreground">{dsa.mobile}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {dsa.submittedReferCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(dsa.createdAt)}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={dsa.status} />
                    </TableCell>
                    <TableCell className="pr-(--card-spacing) text-right">
                      <RowDecisionButtons
                        userId={dsa.id}
                        name={dsa.fullName}
                        status={dsa.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {matching > 0 && (
          <CardContent className="flex flex-col gap-3 border-t pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {first} to {last} of {matching}
            </p>
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="flex flex-wrap gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={buildHref({ tab, q, page: n })}
                    aria-current={n === page ? 'page' : undefined}
                    className={cn(
                      'inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors',
                      n === page
                        ? 'bg-navy text-navy-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-navy-deep',
                    )}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
