'use client'

import { motion, useInView, useMotionValue, useSpring, type Variants } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'

export const easeOut = [0.22, 1, 0.36, 1] as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
}

export const stagger = (delay = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren } },
})

export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'p' | 'h2' | 'h3' | 'li' | 'span'
}) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: easeOut, delay }}
    >
      {children}
    </Comp>
  )
}

export function StaggerGroup({
  children,
  className,
  delay = 0.08,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      variants={stagger(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  )
}

export function Counter({
  value,
  suffix = '',
  prefix = '',
  className,
}: {
  value: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 60, damping: 20 })

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${Math.round(v).toLocaleString('en-IN')}${suffix}`
    })
    return unsub
  }, [spring, prefix, suffix])

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  )
}

export function GoldRule({ className = '' }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`block h-px bg-gold-gradient ${className}`}
      initial={{ scaleX: 0, originX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: easeOut }}
    />
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'light',
}: {
  eyebrow: string
  title: ReactNode
  description?: string
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <StaggerGroup
      className={`flex flex-col gap-4 ${align === 'center' ? 'items-center text-center' : 'items-start'}`}
    >
      <StaggerItem className="flex items-center gap-3">
        <span className="h-px w-8 bg-gold" />
        <span className={`text-xs font-medium uppercase tracking-[0.22em] ${dark ? 'text-gold-light' : 'text-gold-dark'}`}>
          {eyebrow}
        </span>
      </StaggerItem>
      <StaggerItem>
        <h2
          className={`font-serif text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl ${
            dark ? 'text-navy-foreground' : 'text-navy-deep'
          }`}
        >
          {title}
        </h2>
      </StaggerItem>
      {description && (
        <StaggerItem>
          <p
            className={`max-w-2xl text-base leading-relaxed text-pretty md:text-lg ${
              dark ? 'text-navy-foreground/70' : 'text-muted-foreground'
            }`}
          >
            {description}
          </p>
        </StaggerItem>
      )}
    </StaggerGroup>
  )
}
