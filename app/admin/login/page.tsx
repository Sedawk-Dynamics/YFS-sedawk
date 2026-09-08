import { ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { AdminLoginForm } from '../_components/admin-login-form'

export const metadata: Metadata = {
  title: 'Admin Login | YFS Infinity DSA Portal',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy-gradient px-5 py-12">
      <div aria-hidden className="grid-fade pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg border border-gold/40 text-gold-light">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <h1 className="font-serif text-3xl font-medium text-navy-foreground">DSA Admin Portal</h1>
          <p className="text-sm text-navy-foreground/60">
            Authorized personnel only. All actions are logged.
          </p>
        </div>

        <div className="rounded-lg border border-gold/25 bg-navy-deep/70 p-7 backdrop-blur">
          <AdminLoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-navy-foreground/40">
          Are you a DSA partner? Use the{' '}
          <a href="/login" className="text-gold-light underline underline-offset-4">
            partner login
          </a>
          .
        </p>
      </div>
    </main>
  )
}
