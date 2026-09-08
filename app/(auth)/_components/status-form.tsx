'use client'

import { AlertCircle, CheckCircle2, Clock, Info, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  checkApplicationStatus,
  requestStatusOtp,
  type StatusState,
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

const RESULT = {
  PENDING: {
    icon: Clock,
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    iconTone: 'text-amber-700',
    heading: 'Pending approval',
    body: 'Your application is under review. We will email you as soon as your documents have been verified.',
  },
  APPROVED: {
    icon: CheckCircle2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    iconTone: 'text-emerald-700',
    heading: 'Approved',
    body: 'Your documents have been verified. You can log in with the email and password you created at registration.',
  },
  REJECTED: {
    icon: XCircle,
    tone: 'border-red-200 bg-red-50 text-red-900',
    iconTone: 'text-destructive',
    heading: 'Not approved',
    body: 'Your application was not approved.',
  },
} as const

export function StatusForm() {
  // Both steps share one state machine: request the code, then redeem it.
  const [state, action] = useActionState<StatusState, FormData>(
    async (prev, formData) =>
      formData.get('code')
        ? checkApplicationStatus(prev, formData)
        : requestStatusOtp(prev, formData),
    { stage: 'request' },
  )

  if (state.stage === 'result') {
    const config = RESULT[state.status]
    const Icon = config.icon

    return (
      <div className="flex flex-col gap-5">
        <div className={`flex items-start gap-3 rounded-lg border p-4 ${config.tone}`}>
          <Icon className={`mt-0.5 size-5 shrink-0 ${config.iconTone}`} aria-hidden />
          <div>
            <p className="font-medium">{config.heading}</p>
            <p className="mt-1 text-sm">{config.body}</p>
            {state.status === 'REJECTED' && state.rejectionReason && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Reason:</span> {state.rejectionReason}
              </p>
            )}
          </div>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Applicant</dt>
            <dd className="font-medium text-navy-deep">{state.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="text-navy-deep">
              {new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }).format(new Date(state.submittedAt))}
            </dd>
          </div>
        </dl>

        {state.status === 'APPROVED' && (
          <Button size="lg" className="h-11 w-full" nativeButton={false} render={<Link href="/login" />}>
            Log in to your dashboard
          </Button>
        )}
      </div>
    )
  }

  const sent = Boolean(state.notice)

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.notice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="identifier">Email or mobile number</Label>
        <Input
          id="identifier"
          name="identifier"
          required
          autoFocus={!sent}
          defaultValue={state.identifier ?? ''}
          placeholder="you@example.com or 9876543210"
          className="h-11"
        />
      </div>

      {sent && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
            className="h-11 font-mono tracking-[0.3em]"
          />
        </div>
      )}

      <Submit label={sent ? 'Check status' : 'Send verification code'} />
    </form>
  )
}
