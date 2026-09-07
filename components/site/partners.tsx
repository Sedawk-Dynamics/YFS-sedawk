'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SectionHeading, StaggerGroup, StaggerItem, easeOut } from './motion'

const steps = [
  {
    title: 'Register & get your code',
    text: 'Complete a quick KYC and receive an authorized YFS Infinity corporate sourcing code.',
  },
  {
    title: 'Source across lenders',
    text: 'Log leads and submit applications to multiple Banks, NBFCs and HFCs from one portal.',
  },
  {
    title: 'Track every file',
    text: 'Monitor sanction and disbursement status in real time with MIS reporting.',
  },
  {
    title: 'Receive timely payouts',
    text: 'Commissions credited to YFS Infinity are settled to you on predefined structures.',
  },
]

const benefits = [
  'Timely, transparent payouts',
  'Hassle-free operations',
  'Dedicated support team',
  'Access to 40+ lending institutions',
  'Real-time dashboards & MIS',
  'Full regulatory compliance',
]

export function Partners() {
  return (
    <section id="partners" className="bg-background py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-7xl gap-16 px-5 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="For Individual DSAs & Channel Partners"
            title={
              <>
                Grow your practice under a <span className="text-gold-gradient">trusted corporate code</span>
              </>
            }
            description="We empower Individual DSAs to process loan applications through our corporate network — so you focus on customers while we handle lenders, compliance and settlement."
          />

          <StaggerGroup className="grid gap-3 sm:grid-cols-2">
            {benefits.map((b) => (
              <StaggerItem key={b} className="flex items-center gap-3 text-sm font-medium text-navy-deep">
                <CheckCircle2 className="size-4 shrink-0 text-gold-dark" aria-hidden />
                {b}
              </StaggerItem>
            ))}
          </StaggerGroup>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.3 }}
          >
            <Button size="lg" className="group h-12 bg-navy px-6 text-base text-navy-foreground hover:bg-navy-deep" nativeButton={false} render={<Link href="#contact" />}>
                Apply for a sourcing code
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
          </motion.div>
        </div>

        <ol className="relative flex flex-col">
          <motion.span
            aria-hidden
            className="absolute top-6 bottom-6 left-6 w-px bg-gradient-to-b from-gold via-gold-dark to-transparent"
            initial={{ scaleY: 0, originY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: easeOut }}
          />
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, ease: easeOut, delay: i * 0.12 }}
              className="relative flex gap-8 pb-12 last:pb-0"
            >
              <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-gold bg-background font-serif text-lg font-semibold text-navy-deep">
                {i + 1}
              </span>
              <div className="flex flex-col gap-2 pt-2">
                <h3 className="font-serif text-2xl font-semibold text-navy-deep">{s.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground text-pretty">{s.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
