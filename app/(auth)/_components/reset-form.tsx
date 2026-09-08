'use client'

import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  completePasswordReset,
  requestPasswordReset,
  type ResetState,
} from '../_actions/login'

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-11 w-full bg-gold-gradient font-semibold text-navy-deep hover:opacity-90"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Please wait…
        </>
      ) : (
        label
      )}
    </Button>
  )
}

function Feedback({ state }: { state: ResetState }) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {state.error}
      </p>
    )
  }
  if (state?.notice) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {state.notice}
      </p>
    )
  }
  return null
}

export function ResetForm() {
  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)

  const [requestState, requestAction] = useActionState<ResetState, FormData>(
    async (prev, formData) => {
      const result = await requestPasswordReset(prev, formData)
      if (result?.notice) setSent(true)
      return result
    },
    null,
  )
  const [resetState, resetAction] = useActionState<ResetState, FormData>(
    completePasswordReset,
    null,
  )

  if (resetState?.done) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can now log in with your new password.
        </p>
        <Button size="lg" className="h-11 w-full" nativeButton={false} render={<Link href="/login" />}>
          Go to login
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={requestAction} className="flex flex-col gap-5">
        <Feedback state={requestState} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="identifier">Email or mobile number</Label>
          <Input
            id="identifier"
            name="identifier"
            required
            autoComplete="username"
            autoFocus
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value)
              setSent(false)
            }}
            placeholder="you@example.com or 9876543210"
            className="h-11"
          />
        </div>

        <Submit label={sent ? 'Resend reset code' : 'Send reset code'} />
      </form>

      {sent && (
        <form action={resetAction} className="flex flex-col gap-5 border-t border-border pt-5">
          <Feedback state={resetState} />
          <input type="hidden" name="identifier" value={identifier} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="123456"
              className="h-11 font-mono tracking-[0.3em]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              8+ characters with an uppercase letter, a number and a special character.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          <Submit label="Reset password" />
        </form>
      )}
    </div>
  )
}
