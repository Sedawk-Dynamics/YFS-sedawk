const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

/** Accepts the Decimal values Prisma returns as well as plain numbers and strings. */
export function formatCurrency(value: unknown): string {
  const n = toNumber(value)
  return INR.format(n)
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (value == null) return 0
  const n = Number(value.toString())
  return Number.isFinite(n) ? n : 0
}

const DATE = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  return DATE.format(new Date(value))
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  return DATE_TIME.format(new Date(value))
}

export function formatMonth(value: Date | string) {
  return MONTH.format(new Date(value))
}

/** `2026-05` → Date(2026-05-01T00:00:00Z), the canonical payout-month key. */
export function monthInputToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return new Date(Date.UTC(year, month - 1, 1))
}

export function dateToMonthInput(value: Date | string): string {
  const d = new Date(value)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function currentMonthInput(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export const PAYOUT_CATEGORY_LABELS = {
  LOAN: 'Loan Categories',
  REFERRAL: 'Referrals',
  INSTITUTION_MEMBER: 'Institution Member Code',
  INCENTIVE: 'Other Incentives & Bonuses',
  ADJUSTMENT: 'Adjustments',
} as const

export type PayoutCategoryKey = keyof typeof PAYOUT_CATEGORY_LABELS
