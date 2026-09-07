'use client'

import { motion } from 'framer-motion'
import { Building2, Handshake, Landmark, Users } from 'lucide-react'
import Image from 'next/image'
import { Reveal, SectionHeading, StaggerGroup, StaggerItem, easeOut } from './motion'

const pillars = [
  { icon: Landmark, title: 'Banks & NBFCs', text: 'Authorized corporate tie-ups with leading lenders and HFCs.' },
  { icon: Users, title: 'Channel Partners', text: 'Individual DSAs source under our corporate code.' },
  { icon: Handshake, title: 'Customers', text: 'Guided from eligibility to disbursement.' },
  { icon: Building2, title: 'YFS Infinity', text: 'The compliant bridge that manages it all.' },
]

export function About() {
  return (
    <section id="about" className="relative bg-background py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-2 lg:items-center lg:gap-20">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: easeOut }}
          className="relative"
        >
          <div className="relative aspect-[5/4] overflow-hidden rounded-lg">
            <Image
              src="/images/about-meeting.png"
              alt="YFS Infinity advisors reviewing a loan application with a client"
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: easeOut, delay: 0.4 }}
            className="absolute -right-3 -bottom-8 max-w-xs rounded-md border border-gold/40 bg-navy-deep p-6 text-navy-foreground shadow-xl md:-right-8"
          >
            <p className="font-serif text-3xl leading-tight font-medium">
              &ldquo;Trust is our only currency.&rdquo;
            </p>
            <p className="mt-3 text-sm text-navy-foreground/60">Bablu Sharma · Director</p>
          </motion.div>
        </motion.div>

        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="About YFS Infinity"
            title={
              <>
                A professionally managed <span className="text-gold-gradient">Corporate DSA</span>
              </>
            }
            description="YFS Infinity Private Limited is incorporated under the Ministry of Corporate Affairs, Government of India. We act as the strategic partner between lending institutions and channel partners — enabling seamless sourcing, processing and management of financial products."
          />

          <Reveal delay={0.1}>
            <p className="text-base leading-relaxed text-muted-foreground text-pretty">
              We provide authorized sourcing codes to Individual DSAs and Channel Partners. When a
              partner bank sanctions and disburses a loan, commissions are credited to YFS Infinity
              and distributed to the respective DSA on predefined payout structures — accurately and
              on time.
            </p>
          </Reveal>

          <StaggerGroup className="grid grid-cols-2 gap-6">
            {pillars.map((p) => (
              <StaggerItem key={p.title} className="flex flex-col gap-2">
                <p.icon className="size-5 text-gold-dark" aria-hidden />
                <h3 className="font-serif text-xl font-semibold text-navy-deep">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  )
}
