'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Drives the `?month=YYYY-MM` query the payout screens read. */
export function MonthPicker({ value }: { value: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="month-picker" className="text-sm text-muted-foreground">
        Month
      </Label>
      <Input
        id="month-picker"
        type="month"
        defaultValue={value}
        className="h-9 w-40"
        onChange={(event) => {
          const next = new URLSearchParams(searchParams)
          if (event.target.value) next.set('month', event.target.value)
          else next.delete('month')
          router.push(`${pathname}?${next.toString()}`)
        }}
      />
    </div>
  )
}
