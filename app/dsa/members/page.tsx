import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { requireDsa } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { ApplicationStatusBadge } from '@/app/admin/_components/status-badge'

export const metadata: Metadata = { title: 'Institution Members' }

type Member = {
  id: string
  fullName: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt: Date | null
  children: Member[]
}

/**
 * Walks the downline breadth-first, capped at a fixed depth so a deep or
 * accidentally cyclic chain cannot run away.
 */
async function loadDownline(rootId: string, maxDepth = 5): Promise<Member[]> {
  const roots: Member[] = []
  let frontier: Array<{ id: string; bucket: Member[] }> = [{ id: rootId, bucket: roots }]
  const seen = new Set<string>([rootId])

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const ids = frontier.map((f) => f.id)
    const children = await prisma.user.findMany({
      where: { referredById: { in: ids } },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, status: true, approvedAt: true, referredById: true },
    })
    if (children.length === 0) break

    const next: typeof frontier = []
    for (const child of children) {
      if (seen.has(child.id)) continue
      seen.add(child.id)
      const parent = frontier.find((f) => f.id === child.referredById)
      if (!parent) continue
      const node: Member = {
        id: child.id,
        fullName: child.fullName,
        status: child.status,
        approvedAt: child.approvedAt,
        children: [],
      }
      parent.bucket.push(node)
      next.push({ id: child.id, bucket: node.children })
    }
    frontier = next
  }

  return roots
}

function MemberNode({ member, level }: { member: Member; level: number }) {
  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/60"
        style={{ paddingLeft: 12 + level * 20 }}
      >
        <span className="text-sm font-medium text-navy-deep">{member.fullName}</span>
        <ApplicationStatusBadge status={member.status} />
        {member.approvedAt && (
          <span className="text-xs text-muted-foreground">
            joined {formatDate(member.approvedAt)}
          </span>
        )}
        {member.children.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" aria-hidden />
            {member.children.length}
          </span>
        )}
      </div>
      {member.children.length > 0 && (
        <ul>
          {member.children.map((child) => (
            <MemberNode key={child.id} member={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

function countAll(members: Member[]): number {
  return members.reduce((sum, m) => sum + 1 + countAll(m.children), 0)
}

export default async function MembersPage() {
  const dsa = await requireDsa()
  const downline = await loadDownline(dsa.id)
  const total = countAll(downline)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Institution Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone in your network — the DSAs you referred, and the DSAs they went on to refer.
          {total > 0 ? ` ${total} member${total === 1 ? '' : 's'} in total.` : ''}
        </p>
      </div>

      <Card>
        <CardContent className={downline.length === 0 ? undefined : 'px-0'}>
          {downline.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Your network is empty. Share your Refer Code to bring partners on board.
            </p>
          ) : (
            <ul className="flex flex-col">
              {downline.map((member) => (
                <MemberNode key={member.id} member={member} level={0} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
