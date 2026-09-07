'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Reveal, SectionHeading } from './motion'

const faqs = [
  {
    q: 'What is a Corporate DSA?',
    a: 'A Corporate Direct Selling Associate is an MCA-registered company empanelled with Banks, NBFCs and HFCs to source loan applications. YFS Infinity holds these institutional tie-ups and extends them to Individual DSAs through authorized sourcing codes.',
  },
  {
    q: 'How do payouts to Individual DSAs work?',
    a: 'When a partner lender sanctions and disburses a loan sourced under our code, the commission is credited to YFS Infinity. We then settle the DSA share according to the predefined payout structure — with full visibility in the partner portal.',
  },
  {
    q: 'Which loan products can I source?',
    a: 'Personal, Business, Home, Loan Against Property, Mortgage, Working Capital, MSME, Balance Transfer and Top-Up loans — plus other products offered by our partner institutions.',
  },
  {
    q: 'Do I need prior experience to become a partner?',
    a: 'No. We onboard both experienced DSAs and new channel partners. Our team provides operational support, documentation guidance and training on the partner portal.',
  },
  {
    q: 'How are customer applications tracked?',
    a: 'Every file is tracked in our lead management system — from enquiry, documentation and submission through to sanction and disbursement — with real-time status updates and MIS reports.',
  },
]

export function Faq() {
  return (
    <section className="bg-ivory py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SectionHeading
          eyebrow="Frequently Asked"
          title={
            <>
              Clear answers, <span className="text-gold-gradient">no fine print</span>
            </>
          }
          description="Everything partners and customers ask us before getting started."
        />
        <Reveal delay={0.15}>
          <Accordion multiple={false} className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-navy/10">
                <AccordionTrigger className="py-6 text-left font-serif text-xl font-semibold text-navy-deep hover:no-underline hover:text-gold-dark aria-expanded:text-gold-dark **:data-[slot=accordion-trigger-icon]:text-gold-dark">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
