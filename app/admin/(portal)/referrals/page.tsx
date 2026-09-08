import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { ApplicationStatusBadge } from '../../_components/status-badge'

export const metadata: Metadata = { title: 'Referral Hierarchy' }

type Node = {
  id: string
  fullName: string
  referCode: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  children: Node[]
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/60"
        style={{ marginLeft: depth * 20 }}
      >
        <Link
          href={`/admin/registrations/${node.id}`}
          className="text-sm font-medium text-navy-deep hover:underline"
        >
          {node.fullName}
        </Link>
        {node.referCode && (
          <span className="font-mono text-xs text-muted-foreground">{node.referCode}</span>
        )}
        <ApplicationStatusBadge status={node.status} />
        {node.children.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" aria-hidden />
            {node.children.length}
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="border-l border-border/60" style={{ marginLeft: depth * 20 + 12 }}>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={0} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default async function ReferralsPage() {
  const dsas = await prisma.user.findMany({
    where: { role: 'DSA' },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, referCode: true, status: true, referredById: true },
  })

  // Build the tree in one pass; anyone whose referrer is missing becomes a root.
  const nodes = new Map<string, Node>()
  for (const dsa of dsas) {
    nodes.set(dsa.id, {
      id: dsa.id,
      fullName: dsa.fullName,
      referCode: dsa.referCode,
      status: dsa.status,
      children: [],
    })
  }
  const roots: Node[] = []
  for (const dsa of dsas) {
    const node = nodes.get(dsa.id)!
    const parent = dsa.referredById ? nodes.get(dsa.referredById) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const referredCount = dsas.filter((d) => d.referredById).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Referral Hierarchy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dsas.length} DSA{dsas.length === 1 ? '' : 's'} total · {referredCount} joined through a
          Refer Code.
        </p>
      </div>

      <Card>
        <CardContent>
          {roots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No DSAs registered yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {roots.map((node) => (
                <TreeNode key={node.id} node={node} depth={0} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
