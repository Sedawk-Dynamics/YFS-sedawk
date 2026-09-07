'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SectionHeading, fadeUp, stagger } from './motion'

const products = [
  { name: 'Personal Loans', tag: 'Unsecured', text: 'Quick, collateral-free funding for personal needs with competitive rates.' },
  { name: 'Business Loans', tag: 'Growth', text: 'Capital for expansion, equipment and operations from leading lenders.' },
  { name: 'Home Loans', tag: 'Secured', text: 'Purchase, construction and renovation finance via partner HFCs.' },
  { name: 'Loan Against Property', tag: 'Secured', text: 'Unlock the value of residential or commercial property.' },
  { name: 'Mortgage Loans', tag: 'Secured', text: 'Structured long-tenure financing backed by real estate.' },
  { name: 'Working Capital Finance', tag: 'MSME', text: 'Cash-flow solutions for day-to-day business requirements.' },
  { name: 'MSME Loans', tag: 'MSME', text: 'Tailored credit for micro, small and medium enterprises.' },
  { name: 'Balance Transfer', tag: 'Refinance', text: 'Move existing loans to better rates and lower EMIs.' },
  { name: 'Top-Up Loans', tag: 'Refinance', text: 'Additional funds over an existing loan with minimal paperwork.' },
]

const marquee = [
  'Personal Loans',
  'Business Loans',
  'Home Loans',
  'Loan Against Property',
  'Mortgage Loans',
  'Working Capital',
  'MSME Loans',
  'Balance Transfer',
  'Top-Up Loans',
]

export function Products() {
  return (
    <section id="products" className="relative overflow-hidden bg-navy-gradient py-24 text-navy-foreground md:py-32">
      <div aria-hidden className="grid-fade absolute inset-0" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 md:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            tone="dark"
            eyebrow="Financial Products We Facilitate"
            title={
              <>
                A complete <span className="text-gold-gradient">loan portfolio</span>
              </>
            }
            description="Offered through our partner Banks, NBFCs and Housing Finance Companies — matched to eligibility and requirement."
          />
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="#contact"
              className="group inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-medium tracking-wide text-gold-light"
            >
              Check your eligibility
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>

        <motion.ul
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-px overflow-hidden rounded-lg border border-navy-foreground/10 bg-navy-foreground/10 sm:grid-cols-2 lg:grid-cols-3"
        >
          {products.map((p) => (
            <motion.li
              key={p.name}
              variants={fadeUp}
              className="group relative flex flex-col gap-4 bg-navy-deep/80 p-7 transition-colors duration-500 hover:bg-navy"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-serif text-2xl font-medium">{p.name}</h3>
                <Badge className="shrink-0 border-gold/40 bg-transparent text-gold-light hover:bg-transparent">
                  {p.tag}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-navy-foreground/60">{p.text}</p>
              <span
                aria-hidden
                className="mt-auto h-px w-8 bg-gold transition-all duration-500 group-hover:w-full"
              />
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <div className="relative mt-20 border-y border-navy-foreground/10 py-5" aria-hidden>
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
          {[...marquee, ...marquee].map((m, i) => (
            <span key={i} className="flex items-center gap-12 font-serif text-2xl text-navy-foreground/50">
              {m}
              <span className="size-1.5 rounded-full bg-gold" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
