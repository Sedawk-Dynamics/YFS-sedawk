'use client'

import { AlertCircle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { PAYOUT_CATEGORY_LABELS } from '@/lib/format'
import { addPayout, type PayoutState } from '../_actions/payouts'

type Dsa = { id: string; fullName: string; email: string; mobile: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Saving…' : 'Save payout'}
    </Button>
  )
}

export function AddPayoutDialog({
  dsas,
  loanTypes,
  defaultMonth,
}: {
  dsas: Dsa[]
  loanTypes: string[]
  defaultMonth: string
}) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>('LOAN')
  const [status, setStatus] = useState<string>('PENDING')
  const [query, setQuery] = useState('')
  const [state, formAction] = useActionState<PayoutState, FormData>(addPayout, null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  const needle = query.trim().toLowerCase()
  const matches = needle
    ? dsas.filter(
        (d) =>
          d.fullName.toLowerCase().includes(needle) ||
          d.email.toLowerCase().includes(needle) ||
          d.mobile.includes(needle),
      )
    : dsas

  return (
    <>
      <Button
        type="button"
        size="lg"
        onClick={() => setOpen(true)}
        disabled={dsas.length === 0}
        className="bg-gold-gradient font-semibold text-navy-deep hover:opacity-90"
      >
        <Plus className="size-4" aria-hidden />
        Add Payout
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-payout-title"
        onCancel={(event) => {
          event.preventDefault()
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl backdrop:bg-navy-deep/50 backdrop:backdrop-blur-sm"
      >
        <form action={formAction} className="flex max-h-[85vh] flex-col">
          <div className="border-b border-border px-6 py-4">
            <h2 id="add-payout-title" className="font-serif text-xl font-medium text-navy-deep">
              Add payout
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the figures manually and attach the salary slip you prepared.
            </p>
          </div>

          <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            {state?.error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {state.error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="dsa-search">DSA</Label>
              <Input
                id="dsa-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, email or mobile"
                className="h-9"
              />
              <NativeSelect id="userId" name="userId" required size={1} className="h-9">
                <option value="">Select a DSA…</option>
                {matches.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.email}
                  </option>
                ))}
              </NativeSelect>
              {matches.length === 0 && (
                <p className="text-xs text-muted-foreground">No approved DSA matches that search.</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="month">Payout month</Label>
                <Input id="month" name="month" type="month" required defaultValue={defaultMonth} className="h-9" />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="category">Category</Label>
                <NativeSelect
                  id="category"
                  name="category"
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-9"
                >
                  {Object.entries(PAYOUT_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {category === 'LOAN' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="loanType">Loan type</Label>
                <NativeSelect id="loanType" name="loanType" required className="h-9">
                  <option value="">Select a loan type…</option>
                  {loanTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  {category === 'ADJUSTMENT'
                    ? 'May be negative for a deduction.'
                    : 'Must be a positive amount.'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="paidAmount">DSA Payout (₹)</Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Drives the Paid / Partial / Unpaid indicator.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="remarks">Description / remarks</Label>
              <Textarea id="remarks" name="remarks" rows={2} placeholder="Optional" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="slip">Salary slip</Label>
              <Input
                id="slip"
                name="slip"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="h-9 py-1"
              />
              <p className="text-xs text-muted-foreground">
                PDF, JPG or PNG up to 5 MB. This exact file is what the DSA downloads — the panel
                never generates a slip. Required before publishing.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                name="status"
                required
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-9"
              >
                <option value="PENDING">Pending — not visible to the DSA</option>
                <option value="PUBLISHED">Published — visible to the DSA</option>
                <option value="PAID">Paid — payment completed</option>
              </NativeSelect>
              {status !== 'PENDING' && (
                <p className="text-xs text-amber-700">
                  Publishing notifies the DSA by email, SMS and in-app notification.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </dialog>
    </>
  )
}
