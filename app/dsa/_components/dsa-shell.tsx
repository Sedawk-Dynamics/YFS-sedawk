'use client'

import {
  Bell,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Settings,
  ShieldAlert,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { dsaLogout } from '@/app/(auth)/_actions/login'

const nav = [
  { href: '/dsa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dsa/profile', label: 'My Profile', icon: UserCircle },
  { href: '/dsa/payouts', label: 'Payouts', icon: Wallet },
  { href: '/dsa/referrals', label: 'My Referrals', icon: Network },
  { href: '/dsa/members', label: 'Institution Members', icon: Users },
  { href: '/dsa/institution-code', label: 'Institution Code', icon: ShieldAlert },
  { href: '/dsa/notifications', label: 'Notifications', icon: Bell },
  { href: '/dsa/settings', label: 'Settings', icon: Settings },
]

function NavList({ onNavigate, unread }: { onNavigate?: () => void; unread: number }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Partner" className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-1">
        {nav.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-gold/15 font-medium text-gold-light'
                    : 'text-navy-foreground/65 hover:bg-navy-foreground/5 hover:text-navy-foreground',
                )}
              >
                <link.icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{link.label}</span>
                {link.href === '/dsa/notifications' && unread > 0 && (
                  <span className="rounded-full bg-gold px-1.5 text-xs font-semibold text-navy-deep">
                    {unread}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-navy-foreground/10 px-5">
      <Image
        src="/images/yfs-logo.png"
        alt="YFS Infinity"
        width={2144}
        height={378}
        className="h-7 w-auto brightness-0 invert"
      />
    </div>
  )
}

export function DsaShell({
  dsa,
  unread,
  children,
}: {
  dsa: { name: string; email: string; referCode: string | null }
  unread: number
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-deep lg:flex">
        <Brand />
        <NavList unread={unread} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-navy-deep/60 backdrop-blur-sm"
          />
          <aside className="relative flex h-full w-64 flex-col bg-navy-deep">
            <Brand />
            <NavList unread={unread} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="inline-flex size-9 items-center justify-center rounded-md text-navy-deep hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          {dsa.referCode && (
            <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              Your Refer Code
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-navy-deep">
                {dsa.referCode}
              </span>
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dsa/notifications"
              className="relative inline-flex size-9 items-center justify-center rounded-md text-navy-deep hover:bg-muted"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            >
              <Bell className="size-5" aria-hidden />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-gold-dark" />
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-navy-foreground">
                  {dsa.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm leading-tight font-medium text-navy-deep">
                    {dsa.name}
                  </span>
                  <span className="block text-xs leading-tight text-muted-foreground">
                    DSA Partner
                  </span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
                  >
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-navy-deep">{dsa.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{dsa.email}</p>
                    </div>
                    <Link
                      href="/dsa/profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-navy-deep hover:bg-muted"
                    >
                      <UserCircle className="size-4" aria-hidden />
                      My Profile
                    </Link>
                    <Link
                      href="/dsa/settings"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-navy-deep hover:bg-muted"
                    >
                      <KeyRound className="size-4" aria-hidden />
                      Change Password
                    </Link>
                    <form action={dsaLogout} className="border-t border-border">
                      <button
                        type="submit"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" aria-hidden />
                        Log out
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
