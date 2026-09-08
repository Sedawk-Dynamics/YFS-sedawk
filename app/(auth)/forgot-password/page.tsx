import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetForm } from '../_components/reset-form'

export const metadata: Metadata = {
  title: 'Reset Password | YFS Infinity',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 py-16">
      <div className="mb-8 flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          We will send a one-time code to your registered email or mobile number.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 md:p-7">
        <ResetForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-gold-dark hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  )
}
