'use client'

import {
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { adminLogout } from '../_actions/auth'

const mainNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/registrations', label: 'DSA Registrations', icon: Users },
  { href: '/admin/payouts', label: 'Payout Management', icon: Wallet },
  { href: '/admin/referrals', label: 'Referral Hierarchy', icon: Network },
]

const accountNav = [
  { href: '/admin/profile', label: 'Profile', icon: UserCircle },
  { href: '/admin/change-password', label: 'Change Password', icon: KeyRound },
]

type NavLink = { href: string; label: string; icon: typeof Users }

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  const item = (link: NavLink) => {
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
          {link.label}
        </Link>
      </li>
    )
  }

  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-1">{mainNav.map(item)}</ul>
      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.2em] text-navy-foreground/35 uppercase">
          Account
        </p>
        <ul className="flex flex-col gap-1">{accountNav.map(item)}</ul>
      </div>
    </nav>
  )
}

function SidebarBrand() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-navy-foreground/10 px-5">
      <span className="flex size-8 items-center justify-center rounded-md bg-gold-gradient font-serif text-sm font-bold text-navy-deep">
        Y
      </span>
      <span className="font-serif text-lg font-medium text-navy-foreground">DSA Admin Portal</span>
    </div>
  )
}

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; email: string }
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-deep lg:flex">
        <SidebarBrand />
        <NavList />
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
            <SidebarBrand />
            <NavList onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="inline-flex size-9 items-center justify-center rounded-md text-navy-deep hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-navy-foreground">
                  {admin.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm leading-tight font-medium text-navy-deep">
                    {admin.name}
                  </span>
                  <span className="block text-xs leading-tight text-muted-foreground">Admin</span>
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
                      <p className="truncate text-sm font-medium text-navy-deep">{admin.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                    {accountNav.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-navy-deep hover:bg-muted"
                      >
                        <link.icon className="size-4" aria-hidden />
                        {link.label}
                      </Link>
                    ))}
                    <form action={adminLogout} className="border-t border-border">
                      <button
                        type="submit"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" aria-hidden />
                        Sign out
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
