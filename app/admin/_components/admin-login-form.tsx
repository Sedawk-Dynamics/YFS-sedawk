'use client'

import { AlertCircle, Loader2 } from 'lucide-react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminLogin, type AuthState } from '../_actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-11 w-full bg-gold-gradient text-base font-semibold text-navy-deep hover:opacity-90"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Signing in…
        </>
      ) : (
        'Sign in'
      )}
    </Button>
  )
}

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(adminLogin, null)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-xs tracking-[0.18em] text-navy-foreground/60 uppercase">
          Admin email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          placeholder="admin@yfsinfinity.com"
          className="h-11 border-navy-foreground/15 bg-navy-foreground/5 text-navy-foreground placeholder:text-navy-foreground/35 focus-visible:ring-gold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-xs tracking-[0.18em] text-navy-foreground/60 uppercase"
        >
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 border-navy-foreground/15 bg-navy-foreground/5 text-navy-foreground focus-visible:ring-gold"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-navy-foreground/70">
        <input
          type="checkbox"
          name="remember"
          className="size-4 rounded border-navy-foreground/30 bg-transparent accent-[var(--gold)]"
        />
        Keep me signed in
      </label>

      <SubmitButton />
    </form>
  )
}
