import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const APPLICATION_STYLES = {
  PENDING: 'border-amber-300 bg-amber-50 text-amber-800',
  APPROVED: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-300 bg-red-50 text-red-800',
} as const

const APPLICATION_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: keyof typeof APPLICATION_LABELS
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(APPLICATION_STYLES[status], className)}>
      {APPLICATION_LABELS[status]}
    </Badge>
  )
}

const PAYOUT_STYLES = {
  PENDING: 'border-slate-300 bg-slate-50 text-slate-700',
  PUBLISHED: 'border-blue-300 bg-blue-50 text-blue-800',
  PAID: 'border-emerald-300 bg-emerald-50 text-emerald-800',
} as const

const PAYOUT_LABELS = {
  PENDING: 'Pending',
  PUBLISHED: 'Published',
  PAID: 'Paid',
} as const

export function PayoutStatusBadge({
  status,
  className,
}: {
  status: keyof typeof PAYOUT_LABELS
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(PAYOUT_STYLES[status], className)}>
      {PAYOUT_LABELS[status]}
    </Badge>
  )
}

/**
 * The payment-tracking indicator from spec §7.3 — derived from paid vs total,
 * separate from the payout's own workflow status.
 */
export function PaymentStatusBadge({ total, paid }: { total: number; paid: number }) {
  if (paid >= total && total > 0) {
    return (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
        Paid
      </Badge>
    )
  }
  if (paid > 0) {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
        Partial
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
      Unpaid
    </Badge>
  )
}
