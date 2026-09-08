'use client'

import { AlertCircle, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  dsaOtpLogin,
  dsaPasswordLogin,
  requestLoginOtp,
  type LoginState,
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

function Feedback({ state }: { state: LoginState }) {
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

/** Both login methods from spec F2; neither replaces the other. */
export function LoginForm() {
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [identifier, setIdentifier] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const [passwordState, passwordAction] = useActionState<LoginState, FormData>(
    dsaPasswordLogin,
    null,
  )
  const [requestState, requestAction] = useActionState<LoginState, FormData>(
    async (prev, formData) => {
      const result = await requestLoginOtp(prev, formData)
      if (result?.notice) setCodeSent(true)
      return result
    },
    null,
  )
  const [otpState, otpAction] = useActionState<LoginState, FormData>(dsaOtpLogin, null)

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Login method" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['password', 'otp'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-background text-navy-deep shadow-sm'
                : 'text-muted-foreground hover:text-navy-deep',
            )}
          >
            {m === 'password' ? 'Password' : 'Login with OTP'}
          </button>
        ))}
      </div>

      {mode === 'password' ? (
        <form action={passwordAction} className="flex flex-col gap-5">
          <Feedback state={passwordState} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">Email or mobile number</Label>
            <Input
              id="identifier"
              name="identifier"
              required
              autoComplete="username"
              autoFocus
              placeholder="you@example.com or 9876543210"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-gold-dark hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="remember" className="size-4 accent-[var(--gold-dark)]" />
            Remember me
          </label>

          <Submit label="Log in" />
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <form action={requestAction} className="flex flex-col gap-5">
            <Feedback state={requestState} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="otp-identifier">Email or mobile number</Label>
              <Input
                id="otp-identifier"
                name="identifier"
                required
                autoComplete="username"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value)
                  setCodeSent(false)
                }}
                placeholder="you@example.com or 9876543210"
                className="h-11"
              />
            </div>

            <Submit label={codeSent ? 'Resend code' : 'Send code'} />
          </form>

          {codeSent && (
            <form action={otpAction} className="flex flex-col gap-5 border-t border-border pt-5">
              <Feedback state={otpState} />
              <input type="hidden" name="identifier" value={identifier} />

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

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="remember" className="size-4 accent-[var(--gold-dark)]" />
                Remember me
              </label>

              <Submit label="Verify and log in" />
            </form>
          )}
        </div>
      )}
    </div>
  )
}
