import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { LoginForm } from '../_components/login-form'

export const metadata: Metadata = {
  title: 'Partner Login | YFS Infinity',
  description: 'Log in to the YFS Infinity DSA partner portal.',
}

export default async function LoginPage() {
  const session = await getSession()
  if (session?.role === 'DSA') redirect('/dsa/dashboard')
  if (session?.role === 'ADMIN') redirect('/admin/dashboard')

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 py-16">
      <div className="mb-8 flex flex-col gap-2 text-center">
        <span className="text-xs font-medium tracking-[0.22em] text-gold-dark uppercase">
          Partner Portal
        </span>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Log in with the password you created at registration, or request a one-time code.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 md:p-7">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not a partner yet?{' '}
        <Link href="/register" className="font-medium text-gold-dark hover:underline">
          Apply now
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Administrator?{' '}
        <Link href="/admin/login" className="underline underline-offset-4">
          Admin login
        </Link>
      </p>
    </div>
  )
}
