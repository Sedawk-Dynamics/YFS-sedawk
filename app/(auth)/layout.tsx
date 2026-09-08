import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="YFS Infinity home" className="flex items-center">
            <Image
              src="/images/yfs-logo.png"
              alt="YFS Infinity"
              width={2144}
              height={378}
              priority
              className="h-8 w-auto md:h-9"
            />
          </Link>
          <Link
            href="/#contact"
            className="text-sm font-medium text-navy-deep/70 transition-colors hover:text-navy-deep"
          >
            Need help?
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>© {new Date().getFullYear()} YFS Infinity Private Limited.</p>
          <p>All information is transmitted over an encrypted connection.</p>
        </div>
      </footer>
    </div>
  )
}
