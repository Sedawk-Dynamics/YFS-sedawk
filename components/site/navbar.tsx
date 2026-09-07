'use client'

import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Menu, Phone, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { easeOut } from './motion'

const links = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#products', label: 'Loan Products' },
  { href: '#partners', label: 'For DSAs' },
  { href: '#contact', label: 'Contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24))

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: easeOut }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-border/80 bg-background/85 shadow-[0_8px_30px_-16px_rgba(21,43,82,0.35)] backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 md:px-8"
      >
        <Link href="#top" className="flex items-center" aria-label="YFS Infinity home">
          <Image
            src="/images/yfs-logo.png"
            alt="YFS Infinity — The Benchmark of Financial Excellence"
            width={2144}
            height={378}
            priority
            className={`h-9 w-auto transition-all duration-500 md:h-11 ${
              scrolled ? '' : 'brightness-0 invert'
            }`}
          />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`group relative text-sm font-medium tracking-wide transition-colors ${
                  scrolled ? 'text-navy-deep/80 hover:text-navy-deep' : 'text-navy-foreground/80 hover:text-navy-foreground'
                }`}
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="tel:+918791252779"
            className={`flex items-center gap-2 text-sm font-medium ${
              scrolled ? 'text-navy-deep' : 'text-navy-foreground'
            }`}
          >
            <Phone className="size-4 text-gold" />
            +91 87912 52779
          </a>
          <Button className="bg-gold-gradient text-navy-deep hover:opacity-90 font-semibold shadow-md" nativeButton={false} render={<Link href="#partners" />}>Become a Partner</Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className={`inline-flex size-10 items-center justify-center rounded-md lg:hidden ${
            scrolled ? 'text-navy-deep' : 'text-navy-foreground'
          }`}
        >
          <span className="sr-only">Toggle navigation</span>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-5 py-4">
              {links.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-3 text-base font-medium text-navy-deep hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
              <li className="pt-2">
                <Button
                  className="w-full bg-gold-gradient text-navy-deep font-semibold"
                  nativeButton={false} render={<Link href="#partners" onClick={() => setOpen(false)} />}
                >
                  Become a Partner
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
