import Image from 'next/image'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

const cols = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Services', href: '#services' },
      { label: 'For DSAs', href: '#partners' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Loan Products',
    links: [
      { label: 'Home Loans', href: '#products' },
      { label: 'Business Loans', href: '#products' },
      { label: 'Personal Loans', href: '#products' },
      { label: 'Loan Against Property', href: '#products' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-16 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Image
              src="/images/yfs-logo.png"
              alt="YFS Infinity"
              width={2144}
              height={378}
              className="h-12 w-auto self-start"
            />
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              YFS Infinity Private Limited — a professionally managed Corporate DSA incorporated
              under the Ministry of Corporate Affairs, Government of India.
            </p>
            <p className="text-sm text-muted-foreground">
              15 Air Enclave, Murli Vihar, Shahaganj, Agra – 282010, Uttar Pradesh
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.title} className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">{c.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-navy-deep/80 transition-colors hover:text-gold-dark">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} YFS Infinity Private Limited. All rights reserved.</p>
          <p className="font-serif text-sm italic text-navy-deep/70">The Benchmark of Financial Excellence</p>
        </div>
      </div>
    </footer>
  )
}
