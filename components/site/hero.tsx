'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Counter, easeOut, fadeUp, stagger } from './motion'

const stats = [
  { value: 40, suffix: '+', label: 'Bank & NBFC partners' },
  { value: 500, suffix: '+', label: 'Active DSA partners' },
  { value: 9, suffix: '', label: 'Loan product categories' },
  { value: 100, suffix: '%', label: 'Transparent payouts' },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section
      id="top"
      ref={ref}
      className="relative isolate overflow-hidden bg-navy-gradient text-navy-foreground"
    >
      <div aria-hidden className="grid-fade absolute inset-0 -z-10" />

      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 pt-36 pb-20 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-44 lg:pb-32">
        <motion.div style={{ y: textY, opacity: fade }}>
          <motion.div variants={stagger(0.12, 0.2)} initial="hidden" animate="show" className="flex flex-col gap-7">
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold" />
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-gold-light">
                MCA-Registered Corporate DSA
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-serif text-5xl leading-[1.02] font-medium text-balance sm:text-6xl lg:text-7xl xl:text-[5.25rem]"
            >
              The Benchmark of{' '}
              <em className="text-gold-gradient not-italic">Financial Excellence</em>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-xl text-base leading-relaxed text-pretty text-navy-foreground/75 md:text-lg"
            >
              YFS Infinity bridges Banks, NBFCs and Housing Finance Companies with a nationwide
              network of DSA partners — delivering reliable, transparent and efficient loan
              distribution from lead to payout.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="group h-12 bg-gold-gradient px-6 text-base font-semibold text-navy-deep shadow-lg shadow-gold/20 hover:opacity-90"
               nativeButton={false} render={<Link href="#partners" />}>
                  Partner with us
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-navy-foreground/25 bg-transparent px-6 text-base text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground"
               nativeButton={false} render={<Link href="#products" />}>Explore loan products</Button>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-center gap-2 text-sm text-navy-foreground/60">
              <ShieldCheck className="size-4 text-gold" />
              Incorporated under the Ministry of Corporate Affairs, Government of India
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: imgY }}
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, ease: easeOut, delay: 0.3 }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-gold/30 shadow-2xl shadow-navy-deep/60">
            <Image
              src="/images/hero-tower.png"
              alt="Modern financial tower reflecting golden light"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="scale-110 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-transparent to-transparent" />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: easeOut, delay: 0.9 }}
            className="absolute -bottom-6 -left-4 flex flex-col gap-1 rounded-md border border-gold/30 bg-navy-deep/90 p-5 backdrop-blur md:-left-10"
          >
            <span className="text-xs uppercase tracking-[0.2em] text-gold-light">Sourcing model</span>
            <span className="font-serif text-2xl font-medium">Corporate code · Direct payouts</span>
            <span className="text-sm text-navy-foreground/60">Predefined structures. Timely settlement.</span>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: easeOut, delay: 1 }}
        className="border-t border-navy-foreground/10"
      >
        <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-navy-foreground/10 px-5 md:grid-cols-4 md:divide-x md:px-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 py-8 md:px-8 md:first:pl-0">
              <dt className="order-2 text-sm text-navy-foreground/60">{s.label}</dt>
              <dd className="order-1 font-serif text-4xl font-medium text-gold-light md:text-5xl">
                <Counter value={s.value} suffix={s.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  )
}
