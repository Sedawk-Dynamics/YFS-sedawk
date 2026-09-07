'use client'

import { motion } from 'framer-motion'
import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  Coins,
  Headset,
  LayoutDashboard,
  Network,
  Route,
  UserPlus,
  Users2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeading, fadeUp, stagger } from './motion'

const services = [
  {
    icon: Briefcase,
    title: 'Corporate DSA Services',
    text: 'Authorized distribution connecting customers with leading Banks, NBFCs and HFCs across a compliant network.',
  },
  {
    icon: UserPlus,
    title: 'Individual DSA Onboarding',
    text: 'Corporate sourcing codes for Individual DSAs and Channel Partners to originate loans under the YFS network.',
  },
  {
    icon: Route,
    title: 'Loan Distribution Solutions',
    text: 'Sourcing, verification, processing and tracking — engineered for faster approvals and a seamless experience.',
  },
  {
    icon: Network,
    title: 'Multi-Bank Loan Marketplace',
    text: 'Access multiple lending institutions from one platform and match products to eligibility.',
  },
  {
    icon: Coins,
    title: 'Commission & Payout Management',
    text: 'Transparent tracking of disbursements with timely, accurate payouts on predefined structures.',
  },
  {
    icon: Users2,
    title: 'Lead Management System',
    text: 'Capture, assign, monitor and track customer leads from first enquiry to disbursement.',
  },
  {
    icon: LayoutDashboard,
    title: 'DSA Partner Portal',
    text: 'Submit applications, monitor status, view commissions and download reports from one dashboard.',
  },
  {
    icon: Headset,
    title: 'Customer Loan Assistance',
    text: 'End-to-end guidance — eligibility, documentation, submission and lender coordination.',
  },
  {
    icon: BarChart3,
    title: 'Business Analytics & Reporting',
    text: 'Real-time dashboards and MIS reports to track conversions, payouts and performance.',
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance & Operational Support',
    text: 'Onboarding and processing aligned to regulatory and partner-bank requirements, with dedicated support.',
  },
]

export function Services() {
  return (
    <section id="services" className="bg-ivory py-24 md:py-32">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 md:px-8">
        <SectionHeading
          align="center"
          eyebrow="Services & Products"
          title={
            <>
              Everything a lending network needs,{' '}
              <span className="text-gold-gradient">under one code</span>
            </>
          }
          description="From partner onboarding to commission settlement, YFS Infinity digitizes the complete DSA lifecycle in a secure, scalable, enterprise-grade ecosystem."
        />

        <motion.ul
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {services.map((s, i) => (
            <motion.li key={s.title} variants={fadeUp} className="h-full">
              <Card className="group relative h-full overflow-hidden border-border/70 bg-card shadow-none transition-all duration-500 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_24px_50px_-24px_rgba(21,43,82,0.35)]">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold-gradient transition-transform duration-500 group-hover:scale-x-100"
                />
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-md bg-navy text-gold-light transition-colors duration-500 group-hover:bg-gold group-hover:text-navy-deep">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-serif text-sm text-muted-foreground/60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl leading-tight font-semibold text-navy-deep">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
