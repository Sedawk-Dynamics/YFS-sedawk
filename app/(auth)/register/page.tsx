import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '../_components/register-form'

export const metadata: Metadata = {
  title: 'Become a DSA Partner | YFS Infinity',
  description:
    'Register as a YFS Infinity DSA partner. Complete your KYC, bank details and account in one application.',
}

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 md:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <span className="text-xs font-medium tracking-[0.22em] text-gold-dark uppercase">
          DSA Registration
        </span>
        <h1 className="font-serif text-4xl font-medium text-navy-deep">
          Apply to join the YFS Infinity network
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One application — personal details, KYC, bank details and your login password. Nothing is
          deferred to a later step. Our team reviews every application before activating your
          account.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 md:p-8">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already applied?{' '}
        <Link href="/application-status" className="font-medium text-gold-dark hover:underline">
          Check your status
        </Link>{' '}
        ·{' '}
        <Link href="/login" className="font-medium text-gold-dark hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
