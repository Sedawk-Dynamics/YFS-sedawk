import { prisma } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'

type AuditInput = {
  actorUserId?: string | null
  action: string
  entity: string
  entityId?: string | null
  meta?: Prisma.InputJsonValue
}

/**
 * Writes an audit row. Never throws — a logging failure must not roll back or
 * mask the admin action that succeeded.
 */
export async function audit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: input.meta,
      },
    })
  } catch (error) {
    console.error('[audit] failed to record', input.action, error)
  }
}
