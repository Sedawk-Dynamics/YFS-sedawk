'use client'

import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { approveRegistration, rejectRegistration } from '../_actions/registrations'
import { ConfirmDialog } from './confirm-dialog'

type Mode = 'approve' | 'reject' | null

export function RowDecisionButtons({
  userId,
  name,
  status,
  size = 'sm',
}: {
  userId: string
  name: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  size?: 'sm' | 'lg'
}) {
  const [mode, setMode] = useState<Mode>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // Approved accounts are terminal here: reversing one is not a table action.
  if (status === 'APPROVED') {
    return <span className="text-xs text-muted-foreground">No action needed</span>
  }

  const run = (action: typeof approveRegistration) => {
    const formData = new FormData()
    formData.set('userId', userId)
    if (mode === 'reject') formData.set('reason', reason)

    startTransition(async () => {
      const result = await action(null, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setMode(null)
      setReason('')
      setError(null)
      router.refresh()
    })
  }

  const close = () => {
    if (pending) return
    setMode(null)
    setError(null)
  }

  return (
    <>
      <div className="inline-flex gap-1.5">
        <Button
          type="button"
          size={size}
          onClick={() => {
            setError(null)
            setMode('approve')
          }}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Check className="size-3.5" aria-hidden />
          Approve
        </Button>
        <Button
          type="button"
          size={size}
          variant="destructive"
          onClick={() => {
            setError(null)
            setMode('reject')
          }}
        >
          <X className="size-3.5" aria-hidden />
          Reject
        </Button>
      </div>

      <ConfirmDialog
        open={mode === 'approve'}
        title="Approve this application?"
        description={`${name} will be activated, issued an Institution Code and a Refer Code, linked under their referrer if one was used, and emailed the approval notice.`}
        confirmLabel="Yes, approve"
        pending={pending}
        onCancel={close}
        onConfirm={() => run(approveRegistration)}
      >
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={mode === 'reject'}
        title="Reject this application?"
        description={`${name} will be notified with the reason you give below. No codes are issued.`}
        confirmLabel="Yes, reject"
        confirmTone="destructive"
        pending={pending}
        onCancel={close}
        onConfirm={() => run(rejectRegistration)}
      >
        <div className="flex flex-col gap-2 text-left">
          <Label htmlFor={`reason-${userId}`}>Rejection reason</Label>
          <Textarea
            id={`reason-${userId}`}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. The uploaded PAN card is not legible. Please re-apply with a clear scan."
          />
          <p className="text-xs text-muted-foreground">
            Sent to the applicant by email, SMS and in-app notification.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
