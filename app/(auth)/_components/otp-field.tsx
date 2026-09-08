'use client'

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmRegistrationOtp, requestRegistrationOtp } from '../_actions/otp'

const RESEND_SECONDS = 30

/**
 * An email or mobile input paired with its OTP challenge. Reports verification
 * upward so the wizard can gate submission on it; the server re-checks the
 * consumed OTP record independently at submit.
 */
export function OtpField({
  channel,
  id,
  name,
  label,
  placeholder,
  autoComplete,
  hint,
  value,
  onValueChange,
  verified,
  onVerified,
  serverError,
}: {
  channel: 'email' | 'mobile'
  id: string
  name: string
  label: string
  placeholder?: string
  autoComplete?: string
  hint?: string
  value: string
  onValueChange: (value: string) => void
  verified: boolean
  onVerified: (verified: boolean) => void
  /** Validation message returned by the server for this field, if any. */
  serverError?: string
}) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const send = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await requestRegistrationOtp(channel, value)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSent(true)
      setMessage(result?.message ?? 'Code sent.')
      setCooldown(RESEND_SECONDS)
    })
  }

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await confirmRegistrationOtp(channel, value, code)
      if (result?.error) {
        setError(result.error)
        return
      }
      onVerified(true)
      setMessage('Verified.')
    })
  }

  // A live error from this field's own OTP exchange wins over a stale one from
  // the last submit attempt.
  const shownError = error ?? serverError

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label} <span className="text-destructive">*</span>
      </Label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          name={name}
          type={channel === 'email' ? 'email' : 'tel'}
          inputMode={channel === 'email' ? 'email' : 'numeric'}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          readOnly={verified}
          aria-invalid={Boolean(shownError)}
          onChange={(event) => {
            onValueChange(event.target.value)
            // Changing the identifier invalidates any verification of the old one.
            if (verified) onVerified(false)
            setSent(false)
            setCode('')
            setMessage(null)
          }}
          className="h-10 flex-1"
        />

        {verified ? (
          <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="size-4" aria-hidden />
            Verified
          </span>
        ) : (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-10 shrink-0"
            disabled={pending || !value || cooldown > 0}
            onClick={send}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : sent ? 'Resend code' : 'Send OTP'}
          </Button>
        )}
      </div>

      {sent && !verified && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center">
          <Label htmlFor={`${id}-code`} className="shrink-0 text-sm text-muted-foreground">
            Enter code
          </Label>
          <Input
            id={`${id}-code`}
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="h-9 flex-1 font-mono tracking-[0.3em]"
          />
          <Button
            type="button"
            size="lg"
            className="h-9 shrink-0"
            disabled={pending || code.length !== 6}
            onClick={confirm}
          >
            Verify
          </Button>
        </div>
      )}

      {shownError && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {shownError}
        </p>
      )}
      {!shownError && message && <p className="text-sm text-emerald-700">{message}</p>}
      {!shownError && !message && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
