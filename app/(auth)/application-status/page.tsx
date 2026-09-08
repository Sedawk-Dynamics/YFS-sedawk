import type { Metadata } from 'next'
import Link from 'next/link'
import { StatusForm } from '../_components/status-form'

export const metadata: Metadata = {
  title: 'Application Status | YFS Infinity',
  robots: { index: false, follow: false },
}

export default function ApplicationStatusPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 py-16">
      <div className="mb-8 flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Check your application</h1>
        <p className="text-sm text-muted-foreground">
          We will send a one-time code to confirm it is you before showing your status.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 md:p-7">
        <StatusForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not applied yet?{' '}
        <Link href="/register" className="font-medium text-gold-dark hover:underline">
          Start an application
        </Link>
      </p>
    </div>
  )
}
