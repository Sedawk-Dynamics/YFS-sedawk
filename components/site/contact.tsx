'use client'

import { motion } from 'framer-motion'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SectionHeading, StaggerGroup, StaggerItem, easeOut } from './motion'

const details = [
  {
    icon: MapPin,
    label: 'Office',
    value: '15 Air Enclave, Murli Vihar, Shahaganj, Agra – 282010, Uttar Pradesh',
    href: 'https://maps.google.com/?q=15+Air+Enclave,+Murli+Vihar,+Shahaganj,+Agra+282010',
  },
  { icon: Phone, label: 'Phone', value: '0562-4069547 · +91 87912 52779', href: 'tel:+918791252779' },
  { icon: MessageCircle, label: 'WhatsApp', value: '+91 87912 52779', href: 'https://wa.me/918791252779' },
  { icon: Mail, label: 'Email', value: 'info@yfsinfinity.com', href: 'mailto:info@yfsinfinity.com' },
  { icon: Clock, label: 'Working hours', value: 'Mon – Sat, 10:00 AM – 6:00 PM' },
]

export function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden bg-navy-gradient py-24 text-navy-foreground md:py-32">
      <div aria-hidden className="grid-fade absolute inset-0" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-16 px-5 md:px-8 lg:grid-cols-2 lg:gap-24">
        <div className="flex flex-col gap-10">
          <SectionHeading
            tone="dark"
            eyebrow="Get in touch"
            title={
              <>
                Let&apos;s build your <span className="text-gold-gradient">financial future</span>
              </>
            }
            description="Whether you're a customer seeking the right loan or a DSA ready to scale — our team in Agra is here to help."
          />

          <StaggerGroup className="flex flex-col gap-6">
            {details.map((d) => (
              <StaggerItem key={d.label} className="flex items-start gap-4">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border border-gold/40 text-gold-light">
                  <d.icon className="size-4" aria-hidden />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-[0.2em] text-navy-foreground/50">{d.label}</span>
                  {d.href ? (
                    <a
                      href={d.href}
                      target={d.href.startsWith('http') ? '_blank' : undefined}
                      rel={d.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-base text-navy-foreground/90 transition-colors hover:text-gold-light"
                    >
                      {d.value}
                    </a>
                  ) : (
                    <span className="text-base text-navy-foreground/90">{d.value}</span>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: easeOut, delay: 0.2 }}
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-5 rounded-lg border border-gold/25 bg-navy-deep/70 p-7 backdrop-blur md:p-9"
          aria-label="Enquiry form"
        >
          <div>
            <h3 className="font-serif text-3xl font-medium">Send an enquiry</h3>
            <p className="mt-1 text-sm text-navy-foreground/60">We respond within one working day.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Full name" placeholder="Your name" />
            <Field id="phone" label="Phone" type="tel" placeholder="+91" />
          </div>
          <Field id="email" label="Email" type="email" placeholder="you@example.com" />

          <div className="flex flex-col gap-2">
            <label htmlFor="interest" className="text-xs uppercase tracking-[0.18em] text-navy-foreground/60">
              I am a
            </label>
            <select
              id="interest"
              name="interest"
              className="h-10 rounded-md border border-navy-foreground/15 bg-navy-foreground/5 px-3 text-sm text-navy-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold"
              defaultValue="customer"
            >
              <option value="customer" className="text-navy-deep">Customer looking for a loan</option>
              <option value="dsa" className="text-navy-deep">DSA / Channel Partner</option>
              <option value="lender" className="text-navy-deep">Bank / NBFC / HFC</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-xs uppercase tracking-[0.18em] text-navy-foreground/60">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              rows={4}
              placeholder="Tell us about your requirement"
              className="border-navy-foreground/15 bg-navy-foreground/5 text-navy-foreground placeholder:text-navy-foreground/35 focus-visible:ring-gold"
            />
          </div>

          <Button type="submit" size="lg" className="h-12 bg-gold-gradient text-base font-semibold text-navy-deep hover:opacity-90">
            Submit enquiry
          </Button>
        </motion.form>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  type = 'text',
  placeholder,
}: {
  id: string
  label: string
  type?: string
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs uppercase tracking-[0.18em] text-navy-foreground/60">
        {label}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        className="border-navy-foreground/15 bg-navy-foreground/5 text-navy-foreground placeholder:text-navy-foreground/35 focus-visible:ring-gold"
      />
    </div>
  )
}
