'use client'

import { MoreHorizontal, Send, Trash2, Upload, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deletePayout,
  publishPayout,
  updatePaidAmount,
  uploadSlip,
  type PayoutState,
} from '../_actions/payouts'
import { ConfirmDialog } from './confirm-dialog'

type Mode = 'publish' | 'pay' | 'slip' | 'delete' | null

export function PayoutRowActions({
  payoutId,
  status,
  amount,
  paidAmount,
  hasSlip,
}: {
  payoutId: string
  status: 'PENDING' | 'PUBLISHED' | 'PAID'
  amount: number
  paidAmount: number
  hasSlip: boolean
}) {
  const [mode, setMode] = useState<Mode>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paid, setPaid] = useState(String(paidAmount))
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const run = (
    action: (prev: PayoutState, formData: FormData) => Promise<PayoutState>,
    build: (formData: FormData) => void,
  ) => {
    const formData = new FormData()
    formData.set('payoutId', payoutId)
    build(formData)

    startTransition(async () => {
      const result = await action(null, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setMode(null)
      setError(null)
      router.refresh()
    })
  }

  const close = () => {
    if (pending) return
    setMode(null)
    setError(null)
  }

  const open = (next: Mode) => {
    setError(null)
    setMenuOpen(false)
    setMode(next)
  }

  return (
    <>
      <div className="relative inline-block">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Payout actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover text-left shadow-lg"
            >
              {status === 'PENDING' && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => open('publish')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-navy-deep hover:bg-muted"
                >
                  <Send className="size-4" aria-hidden />
                  Publish to DSA
                </button>
              )}
              {status !== 'PENDING' && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => open('pay')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-navy-deep hover:bg-muted"
                >
                  <Wallet className="size-4" aria-hidden />
                  Record payment
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => open('slip')}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-navy-deep hover:bg-muted"
              >
                <Upload className="size-4" aria-hidden />
                {hasSlip ? 'Replace salary slip' : 'Upload salary slip'}
              </button>
              {status !== 'PAID' && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => open('delete')}
                  className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete entry
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={mode === 'publish'}
        title="Publish this payout?"
        description="The DSA will see this entry in their dashboard and be notified by email, SMS and in-app notification."
        confirmLabel="Publish"
        pending={pending}
        onCancel={close}
        onConfirm={() => run(publishPayout, () => {})}
      >
        {!hasSlip && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            No salary slip has been uploaded. Upload one first — publishing is blocked without it.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={mode === 'pay'}
        title="Record a payment"
        description={`Entry total is ₹${amount.toLocaleString('en-IN')}. Entering the full amount marks this payout Paid.`}
        confirmLabel="Save"
        pending={pending}
        onCancel={close}
        onConfirm={() => run(updatePaidAmount, (fd) => fd.set('paidAmount', paid))}
      >
        <div className="flex flex-col gap-2 text-left">
          <Label htmlFor={`paid-${payoutId}`}>DSA Payout (₹)</Label>
          <Input
            id={`paid-${payoutId}`}
            type="number"
            step="0.01"
            min="0"
            value={paid}
            onChange={(event) => setPaid(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={mode === 'slip'}
        title={hasSlip ? 'Replace the salary slip' : 'Upload the salary slip'}
        description="This exact file is what the DSA downloads. The panel never generates a slip."
        confirmLabel="Upload"
        pending={pending}
        onCancel={close}
        onConfirm={() => {
          if (!file) {
            setError('Choose a file first.')
            return
          }
          run(uploadSlip, (fd) => fd.set('slip', file))
        }}
      >
        <div className="flex flex-col gap-2 text-left">
          <Label htmlFor={`slip-${payoutId}`}>Salary slip file</Label>
          <Input
            id={`slip-${payoutId}`}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="py-1"
          />
          <p className="text-xs text-muted-foreground">PDF, JPG or PNG up to 5 MB.</p>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={mode === 'delete'}
        title="Delete this payout entry?"
        description="The entry and its uploaded slip are removed permanently. This cannot be undone."
        confirmLabel="Delete"
        confirmTone="destructive"
        pending={pending}
        onCancel={close}
        onConfirm={() => run(deletePayout, () => {})}
      >
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
