'use client'

import { AlertCircle, ArrowLeft, ArrowRight, Check, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { INDIAN_STATES } from '@/lib/validation/registration'
import { cn } from '@/lib/utils'
import { registerDsa, type RegisterState } from '../_actions/register'
import { OtpField } from './otp-field'
import { applyDraft, useFormDraft } from './use-form-draft'

const STEPS = [
  { key: 'personal', label: 'Personal' },
  { key: 'contact', label: 'Contact' },
  { key: 'kyc', label: 'KYC' },
  { key: 'bank', label: 'Bank' },
  { key: 'referral', label: 'Referral' },
  { key: 'account', label: 'Account' },
] as const

// Which step owns each field, so a server-side error jumps back to it.
const FIELD_STEP: Record<string, number> = {
  fullName: 0,
  dob: 0,
  gender: 0,
  guardianName: 0,
  email: 1,
  mobile: 1,
  alternateNumber: 1,
  addressLine1: 1,
  addressLine2: 1,
  city: 1,
  state: 1,
  pincode: 1,
  panNumber: 2,
  aadhaarNumber: 2,
  panCard: 2,
  aadhaarFront: 2,
  aadhaarBack: 2,
  photograph: 2,
  addressProof: 2,
  accountHolderName: 3,
  bankName: 3,
  accountNumber: 3,
  confirmAccountNumber: 3,
  ifsc: 3,
  cheque: 3,
  referCode: 4,
  password: 5,
  confirmPassword: 5,
  terms: 5,
}

const MB = 1024 * 1024

// Mirrors UPLOAD_LIMITS on the server, and the serverActions.bodySizeLimit in
// next.config.mjs. Checked here so an oversized file gets a clear message
// instead of a 413 that surfaces as a failed fetch.
const FILE_LIMITS: Record<string, { label: string; maxBytes: number }> = {
  panCard: { label: 'PAN card', maxBytes: 5 * MB },
  aadhaarFront: { label: 'Aadhaar (front)', maxBytes: 5 * MB },
  aadhaarBack: { label: 'Aadhaar (back)', maxBytes: 5 * MB },
  photograph: { label: 'Photograph', maxBytes: 2 * MB },
  addressProof: { label: 'Address proof', maxBytes: 5 * MB },
  cheque: { label: 'Cancelled cheque / passbook', maxBytes: 5 * MB },
}

const MAX_TOTAL_BYTES = 30 * MB

function formatBytes(bytes: number) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

/** Returns a message and the step to jump to, or null when the files are fine. */
function validateFiles(form: HTMLFormElement): { message: string; field: string } | null {
  let total = 0

  for (const [field, limit] of Object.entries(FILE_LIMITS)) {
    const input = form.elements.namedItem(field)
    const file = input instanceof HTMLInputElement ? input.files?.[0] : null
    if (!file) continue

    total += file.size
    if (file.size > limit.maxBytes) {
      return {
        field,
        message: `${limit.label} is ${formatBytes(file.size)} — the limit is ${formatBytes(limit.maxBytes)}. Choose a smaller file.`,
      }
    }
  }

  if (total > MAX_TOTAL_BYTES) {
    return {
      field: 'panCard',
      message: `Your documents total ${formatBytes(total)}, over the ${formatBytes(MAX_TOTAL_BYTES)} limit for one submission. Compress them and try again.`,
    }
  }

  return null
}

function Required() {
  return <span className="text-destructive">*</span>
}

/**
 * The message for one field, rendered directly beneath its input. Replaces the
 * field's hint while an error stands, so the applicant sees one thing to fix.
 */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  )
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

/** Live checklist so the policy is verifiable while typing, not after a rejection. */
function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value)
        return (
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              met ? 'text-emerald-700' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <Check className="size-3 shrink-0" aria-hidden />
            ) : (
              <span className="size-3 shrink-0 rounded-full border border-current" aria-hidden />
            )}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending || disabled}
      className="h-11 bg-gold-gradient font-semibold text-navy-deep hover:opacity-90"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Submitting…
        </>
      ) : (
        'Submit application'
      )}
    </Button>
  )
}

export function RegisterForm() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [hasReferCode, setHasReferCode] = useState<'yes' | 'no'>('no')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  // Fields edited since the last submit. Their errors are stale, so they are
  // suppressed until the form is submitted again and re-validated.
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [state, formAction] = useActionState<RegisterState, FormData>(registerDsa, {
    status: 'idle',
  })
  const formRef = useRef<HTMLFormElement>(null)
  const { draft, restored, save, clear, readSaved } = useFormDraft('yfs-registration-draft')
  const [draftNotice, setDraftNotice] = useState(false)

  // Put the saved answers back once, after the first render.
  useEffect(() => {
    if (!restored || !draft || !formRef.current) return
    applyDraft(formRef.current, draft)
    if (draft.email) setEmail(draft.email)
    if (draft.mobile) setMobile(draft.mobile)
    if (draft.hasReferCode === 'yes' || draft.hasReferCode === 'no') {
      setHasReferCode(draft.hasReferCode)
    }
    setDraftNotice(Object.keys(draft).length > 0)
  }, [restored, draft])

  // The draft has served its purpose once the application is in.
  useEffect(() => {
    if (state.status === 'success') clear()
  }, [state.status, clear])

  // React 19 resets the form once a server action settles, which clears every
  // uncontrolled input. Restore the saved answers, then send the applicant to
  // the earliest step that still needs attention.
  useEffect(() => {
    if (state.status !== 'error') return

    const form = formRef.current
    const saved = readSaved()
    if (form && saved) applyDraft(form, saved)

    const invalid = Object.keys(state.fieldErrors)
    const steps = invalid
      .map((field) => FIELD_STEP[field])
      .filter((index) => index !== undefined)
    if (steps.length > 0) setStep(Math.min(...steps))

    // Focus and select the first bad field so it can be corrected in one go,
    // without losing what was typed.
    if (form && invalid.length > 0) {
      const first = invalid
        .slice()
        .sort((a, b) => (FIELD_STEP[a] ?? 99) - (FIELD_STEP[b] ?? 99))[0]
      const element = form.elements.namedItem(first)
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        requestAnimationFrame(() => {
          element.focus()
          if (element.type !== 'file' && element.type !== 'checkbox') element.select?.()
        })
      }
    }
  }, [state, readSaved])

  const rawFieldErrors = state.status === 'error' ? state.fieldErrors : {}
  const fieldErrors = Object.fromEntries(
    Object.entries(rawFieldErrors).filter(([field]) => !editedFields.has(field)),
  )
  const errorCount = Object.keys(fieldErrors).length

  /** The inline message for a field, or undefined when it is valid or edited. */
  const errorFor = (field: string) => fieldErrors[field]

  /** Whether a step contains any invalid field, for the progress bar. */
  const stepHasError = (index: number) =>
    Object.keys(fieldErrors).some((field) => FIELD_STEP[field] === index)

  // A short summary only — the detail belongs under the offending input.
  const banner =
    fileError ??
    (state.status === 'error' && state.error) ??
    (errorCount > 0
      ? errorCount === 1
        ? 'One field needs your attention. It is highlighted below.'
        : `${errorCount} fields need your attention. They are highlighted below.`
      : null)

  // Only email is OTP-verified; there is no SMS provider wired up.
  const contactVerified = emailVerified
  const isLast = step === STEPS.length - 1

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="size-7" aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-medium text-navy-deep">Application submitted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Status: <span className="font-medium text-navy-deep">Pending Approval</span>
          </p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Our team will verify your documents and email you once your account is approved. You can
          then log in with the email and password you just created.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/application-status" />}>
            Check application status
          </Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      ref={formRef}
      onInput={(event) => {
        save(event.currentTarget)
        const name = (event.target as HTMLInputElement | HTMLSelectElement).name
        if (!name) return
        setFileError(null)
        setEditedFields((previous) => {
          if (previous.has(name)) return previous
          const next = new Set(previous)
          next.add(name)
          return next
        })
      }}
      onChange={(event) => save(event.currentTarget)}
      onSubmit={(event) => {
        // Runs before the action fires, so an oversized upload never reaches
        // the network and the applicant is sent to the step that owns it.
        const problem = validateFiles(event.currentTarget)
        if (problem) {
          event.preventDefault()
          setFileError(problem.message)
          setStep(FIELD_STEP[problem.field] ?? 2)
          return
        }
        setFileError(null)
        setEditedFields(new Set())
      }}
      className="flex flex-col gap-6"
    >
      <ol className="flex flex-wrap gap-1.5" aria-label="Registration progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'flex w-full flex-col gap-1.5 rounded-md pt-1 text-left text-xs transition-colors',
                i === step ? 'text-navy-deep' : 'text-muted-foreground hover:text-navy-deep',
              )}
            >
              <span
                className={cn(
                  'h-1 w-full rounded-full',
                  stepHasError(i)
                    ? 'bg-destructive'
                    : i < step
                      ? 'bg-gold-dark'
                      : i === step
                        ? 'bg-navy'
                        : 'bg-border',
                )}
              />
              <span
                className={cn('px-0.5 font-medium', stepHasError(i) && 'text-destructive')}
              >
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {draftNotice && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            We restored your earlier answers. Documents cannot be restored by the browser, so
            please re-attach them in the KYC step.
          </p>
          <button
            type="button"
            onClick={() => {
              clear()
              setDraftNotice(false)
              formRef.current?.reset()
              setEmail('')
              setMobile('')
              setPassword('')
              setConfirmPassword('')
              setEmailVerified(false)
                      setHasReferCode('no')
            }}
            className="shrink-0 font-medium underline underline-offset-4"
          >
            Start over
          </button>
        </div>
      )}

      {banner && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {banner}
        </p>
      )}

      {/* Every step stays mounted so its inputs are always part of the submitted
          form data; only the active one is visible. */}
      <div hidden={step !== 0} className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-medium text-navy-deep">Personal details</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">
            Full name <Required />
          </Label>
          <Input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            aria-invalid={Boolean(errorFor('fullName'))}
            className="h-10"
          />
          <FieldError message={errorFor('fullName')} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dob">
              Date of birth <Required />
            </Label>
            <Input
              id="dob"
              name="dob"
              type="date"
              required
              aria-invalid={Boolean(errorFor('dob'))}
              className="h-10"
            />
            {errorFor('dob') ? (
              <FieldError message={errorFor('dob')} />
            ) : (
              <p className="text-xs text-muted-foreground">You must be 18 or older.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gender">Gender</Label>
            <NativeSelect id="gender" name="gender" className="h-10">
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="guardianName">Father&apos;s / Spouse&apos;s name</Label>
          <Input
            id="guardianName"
            name="guardianName"
            aria-invalid={Boolean(errorFor('guardianName'))}
            className="h-10"
          />
          <FieldError message={errorFor('guardianName')} />
        </div>
      </div>

      <div hidden={step !== 1} className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-medium text-navy-deep">Contact information</h2>

        <OtpField
          channel="email"
          id="email"
          name="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          hint="We send a 6-digit code to confirm this address."
          value={email}
          onValueChange={setEmail}
          verified={emailVerified}
          onVerified={setEmailVerified}
          serverError={errorFor('email')}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="mobile">
            Mobile number <Required />
          </Label>
          <Input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="numeric"
            required
            autoComplete="tel-national"
            placeholder="9876543210"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            aria-invalid={Boolean(errorFor('mobile'))}
            className="h-10"
          />
          {errorFor('mobile') ? (
            <FieldError message={errorFor('mobile')} />
          ) : (
            <p className="text-xs text-muted-foreground">10-digit Indian mobile number.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="alternateNumber">Alternate number</Label>
          <Input
            id="alternateNumber"
            name="alternateNumber"
            type="tel"
            inputMode="numeric"
            aria-invalid={Boolean(errorFor('alternateNumber'))}
            className="h-10"
          />
          <FieldError message={errorFor('alternateNumber')} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="addressLine1">
            Address line 1 <Required />
          </Label>
          <Input
            id="addressLine1"
            name="addressLine1"
            required
            autoComplete="address-line1"
            aria-invalid={Boolean(errorFor('addressLine1'))}
            className="h-10"
          />
          <FieldError message={errorFor('addressLine1')} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input
            id="addressLine2"
            name="addressLine2"
            autoComplete="address-line2"
            className="h-10"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">
              City <Required />
            </Label>
            <Input
              id="city"
              name="city"
              required
              autoComplete="address-level2"
              aria-invalid={Boolean(errorFor('city'))}
              className="h-10"
            />
            <FieldError message={errorFor('city')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="state">
              State <Required />
            </Label>
            <NativeSelect id="state" name="state" required defaultValue="" className="h-10">
              <option value="" disabled>
                Select…
              </option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errorFor('state')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pincode">
              PIN code <Required />
            </Label>
            <Input
              id="pincode"
              name="pincode"
              required
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
              aria-invalid={Boolean(errorFor('pincode'))}
              className="h-10"
            />
            <FieldError message={errorFor('pincode')} />
          </div>
        </div>
      </div>

      <div hidden={step !== 2} className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-medium text-navy-deep">KYC documents</h2>
        <p className="text-sm text-muted-foreground">
          JPG, PNG or PDF up to 5 MB each. Your photograph must be JPG or PNG up to 2 MB.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="panNumber">
              PAN number <Required />
            </Label>
            <Input
              id="panNumber"
              name="panNumber"
              required
              maxLength={10}
              placeholder="ABCDE1234F"
              aria-invalid={Boolean(errorFor('panNumber'))}
              className="h-10 uppercase"
            />
            {errorFor('panNumber') ? (
              <FieldError message={errorFor('panNumber')} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Five letters, four digits, one letter.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="aadhaarNumber">
              Aadhaar number <Required />
            </Label>
            <Input
              id="aadhaarNumber"
              name="aadhaarNumber"
              required
              inputMode="numeric"
              maxLength={12}
              placeholder="123456789012"
              aria-invalid={Boolean(errorFor('aadhaarNumber'))}
              className="h-10"
            />
            {errorFor('aadhaarNumber') ? (
              <FieldError message={errorFor('aadhaarNumber')} />
            ) : (
              <p className="text-xs text-muted-foreground">Stored encrypted and shown masked.</p>
            )}
          </div>
        </div>

        {[
          { id: 'panCard', label: 'PAN card', required: true, accept: 'image/jpeg,image/png,application/pdf' },
          { id: 'aadhaarFront', label: 'Aadhaar — front', required: true, accept: 'image/jpeg,image/png,application/pdf' },
          { id: 'aadhaarBack', label: 'Aadhaar — back', required: true, accept: 'image/jpeg,image/png,application/pdf' },
          { id: 'photograph', label: 'Photograph', required: true, accept: 'image/jpeg,image/png' },
          { id: 'addressProof', label: 'Address proof', required: false, accept: 'image/jpeg,image/png,application/pdf' },
        ].map((doc) => (
          <div key={doc.id} className="flex flex-col gap-2">
            <Label htmlFor={doc.id}>
              {doc.label} {doc.required && <Required />}
            </Label>
            <Input
              id={doc.id}
              name={doc.id}
              type="file"
              accept={doc.accept}
              required={doc.required}
              className="h-10 py-1.5"
            />
            <p className="text-xs text-muted-foreground">
              Maximum {formatBytes(FILE_LIMITS[doc.id].maxBytes)}.
            </p>
          </div>
        ))}
      </div>

      <div hidden={step !== 3} className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-medium text-navy-deep">Bank details</h2>
        <p className="text-sm text-muted-foreground">
          Used for your payouts. The name must match your bank records.
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="accountHolderName">
            Account holder name <Required />
          </Label>
          <Input
            id="accountHolderName"
            name="accountHolderName"
            required
            aria-invalid={Boolean(errorFor('accountHolderName'))}
            className="h-10"
          />
          <FieldError message={errorFor('accountHolderName')} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bankName">
            Bank name <Required />
          </Label>
          <Input
            id="bankName"
            name="bankName"
            required
            placeholder="HDFC Bank"
            aria-invalid={Boolean(errorFor('bankName'))}
            className="h-10"
          />
          <FieldError message={errorFor('bankName')} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountNumber">
              Account number <Required />
            </Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              required
              inputMode="numeric"
              aria-invalid={Boolean(errorFor('accountNumber'))}
              className="h-10"
            />
            <FieldError message={errorFor('accountNumber')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmAccountNumber">
              Confirm account number <Required />
            </Label>
            <Input
              id="confirmAccountNumber"
              name="confirmAccountNumber"
              required
              inputMode="numeric"
              onPaste={(event) => event.preventDefault()}
              aria-invalid={Boolean(errorFor('confirmAccountNumber'))}
              className="h-10"
            />
            <FieldError message={errorFor('confirmAccountNumber')} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ifsc">
            IFSC code <Required />
          </Label>
          <Input
            id="ifsc"
            name="ifsc"
            required
            maxLength={11}
            placeholder="HDFC0001234"
            aria-invalid={Boolean(errorFor('ifsc'))}
            className="h-10 uppercase"
          />
          <FieldError message={errorFor('ifsc')} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cheque">Cancelled cheque / passbook</Label>
          <Input
            id="cheque"
            name="cheque"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="h-10 py-1.5"
          />
        </div>
      </div>

      <div hidden={step !== 4} className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-medium text-navy-deep">Referral</h2>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">
            Do you have a Refer Code? <Required />
          </legend>
          {(['no', 'yes'] as const).map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm has-checked:border-gold has-checked:bg-gold/5"
            >
              <input
                type="radio"
                name="hasReferCode"
                value={option}
                checked={hasReferCode === option}
                onChange={() => setHasReferCode(option)}
                className="size-4 accent-[var(--gold-dark)]"
              />
              {option === 'no'
                ? 'No — I am applying directly'
                : 'Yes — another DSA referred me'}
            </label>
          ))}
        </fieldset>

        {hasReferCode === 'yes' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="referCode">
              Refer Code <Required />
            </Label>
            <Input
              id="referCode"
              name="referCode"
              placeholder="REF-ABC123"
              aria-invalid={Boolean(errorFor('referCode'))}
              className="h-10 font-mono uppercase"
            />
            {errorFor('referCode') ? (
              <FieldError message={errorFor('referCode')} />
            ) : (
              <p className="text-xs text-muted-foreground">
                The code your referrer shared with you. It always starts with REF-.
              </p>
            )}
          </div>
        )}
      </div>

      <div hidden={step !== 5} className="flex flex-col gap-5">
        <h2 className="font-serif text-xl font-medium text-navy-deep">Account &amp; consent</h2>
        <p className="text-sm text-muted-foreground">
          This is the password you will use to log in once approved. We never email you a password.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">
              Password <Required />
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errorFor('password'))}
              className="h-10"
            />
            <PasswordRules value={password} />
            <FieldError message={errorFor('password')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">
              Confirm password <Required />
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(errorFor('confirmPassword'))}
              className="h-10"
            />
            <FieldError message={errorFor('confirmPassword')} />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-0.5 size-4 accent-[var(--gold-dark)]"
          />
          <span>
            I accept the Terms &amp; Conditions and consent to YFS Infinity processing my personal
            and KYC information for DSA onboarding. <Required />
          </span>
        </label>
        <FieldError message={errorFor('terms')} />

        {!contactVerified && (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Verify your email address in the Contact step before submitting.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>

        {isLast ? (
          <SubmitButton disabled={!contactVerified} />
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-11"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}
