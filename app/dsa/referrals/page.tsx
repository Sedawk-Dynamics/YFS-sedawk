import { Share2 } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireDsa } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { ApplicationStatusBadge } from '@/app/admin/_components/status-badge'
import { CopyButton } from '../_components/copy-button'

export const metadata: Metadata = { title: 'My Referrals' }

export default async function ReferralsPage() {
  const dsa = await requireDsa()

  const referrals = await prisma.user.findMany({
    where: { referredById: dsa.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fullName: true, email: true, status: true, createdAt: true, approvedAt: true },
  })

  const approved = referrals.filter((r) => r.status === 'APPROVED').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">My Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {referrals.length} referral{referrals.length === 1 ? '' : 's'} · {approved} approved
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Your Refer Code</p>
            <code className="font-mono text-2xl text-navy-deep">{dsa.referCode}</code>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Share2 className="size-3.5" aria-hidden />
              Share this code — never your Institution Code.
            </p>
          </div>
          <CopyButton value={dsa.referCode ?? ''} label="Copy Refer Code" className="h-11" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="border-b pb-(--card-spacing)">
          <h2 className="text-base font-medium text-navy-deep">Referred DSAs</h2>
          <p className="text-sm text-muted-foreground">
            Everyone who registered using your Refer Code, and where their application stands.
          </p>
        </CardContent>
        <CardContent className="px-0">
          {referrals.length === 0 ? (
            <p className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
              Nobody has registered with your code yet. Share it to start building your network.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-(--card-spacing)">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="pr-(--card-spacing)">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral, i) => (
                  <TableRow key={referral.id}>
                    <TableCell className="pl-(--card-spacing) text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium text-navy-deep">
                      {referral.fullName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{referral.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(referral.createdAt)}
                    </TableCell>
                    <TableCell className="pr-(--card-spacing)">
                      <ApplicationStatusBadge status={referral.status} />
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
