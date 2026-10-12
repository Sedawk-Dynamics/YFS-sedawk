'use client'

import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Reveal, SectionHeading } from './motion'

/**
 * Principal and interest read as two categories, so they take two categorical
 * hues rather than two steps of one ramp. These sit on the brand's blue and
 * gold hues, lifted into the lightness/chroma band a fill needs: validated
 * against the ivory surface at ΔE 33.0 normal vision and 29.2 protanopia.
 * Each segment is also directly labelled, so identity never rests on colour.
 */
const PRINCIPAL_COLOR = '#1d60bc'
const INTEREST_COLOR = '#bb881a'

const AMOUNT = { min: 100_000, max: 500_000_000 }
const RATE = { min: 8, max: 28, step: 0.1 }
const TENURE = { min: 1, max: 30, step: 1 }

/**
 * The amount slider is logarithmic.
 *
 * Spread linearly from ₹1 L to ₹50 Cr, a typical ₹25 L loan would sit within
 * the first half-percent of the track — a single pixel on most screens. On a
 * log scale each drag changes the amount by a proportion rather than a fixed
 * sum, so the lakhs stay as reachable as the crores.
 */
const AMOUNT_POSITIONS = 1000
const LOG_MIN = Math.log(AMOUNT.min)
const LOG_SPAN = Math.log(AMOUNT.max) - LOG_MIN

/** Rounds to a figure someone would actually say out loud at that magnitude. */
function snapAmount(value: number) {
  const grain =
    value >= 100_000_000 ? 2_500_000 : value >= 10_000_000 ? 500_000 : value >= 1_000_000 ? 100_000 : 25_000
  return Math.round(value / grain) * grain
}

function positionToAmount(position: number) {
  const raw = Math.exp(LOG_MIN + (position / AMOUNT_POSITIONS) * LOG_SPAN)
  return Math.min(AMOUNT.max, Math.max(AMOUNT.min, snapAmount(raw)))
}

function amountToPosition(amount: number) {
  return Math.round(((Math.log(amount) - LOG_MIN) / LOG_SPAN) * AMOUNT_POSITIONS)
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/**
 * Indian-style short form, so figures stay readable at a glance.
 *
 * The unit is chosen from the *rounded* value, not the raw one. Picking it
 * first meant ₹99,99,999 rounded to "₹100 L" rather than promoting to "₹1 Cr".
 */
function compactRupees(value: number) {
  const trim = (n: string) => n.replace(/\.00$/, '')

  const crore = (value / 10_000_000).toFixed(2)
  if (Number(crore) >= 1) return `₹${trim(crore)} Cr`

  const lakh = (value / 100_000).toFixed(2)
  if (Number(lakh) >= 1) return `₹${trim(lakh)} L`

  return rupees.format(value)
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  minLabel,
  maxLabel,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  display: string
  minLabel: string
  maxLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-navy-deep">
          {label}
        </label>
        <output htmlFor={id} className="font-serif text-xl font-medium text-navy-deep tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-navy/15 accent-[var(--gold-dark)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

/**
 * Past a crore the full figure stops being readable — ₹3,70,10,40,383 takes
 * real effort to parse. Those show the compact form with the exact rupee
 * amount kept directly beneath, so nothing is lost. Everyday loans stay well
 * under the threshold and are unchanged.
 */
const COMPACT_ABOVE = 10_000_000

function Figure({
  label,
  amount,
  emphasis,
}: {
  label: string
  amount: number
  emphasis?: boolean
}) {
  const compacted = amount >= COMPACT_ABOVE

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={
          emphasis
            ? 'font-serif text-4xl leading-none font-medium text-navy-deep tabular-nums md:text-5xl'
            : 'font-serif text-2xl leading-none font-medium text-navy-deep tabular-nums'
        }
      >
        {compacted ? compactRupees(amount) : rupees.format(amount)}
      </p>
      {compacted && (
        <p className="text-xs text-muted-foreground tabular-nums">{rupees.format(amount)}</p>
      )}
    </div>
  )
}

export function EmiCalculator() {
  const [amount, setAmount] = useState(2_500_000)
  const [rate, setRate] = useState(9.5)
  const [years, setYears] = useState(20)

  const { emi, totalInterest, totalPayable, principalShare } = useMemo(() => {
    const months = years * 12
    const monthlyRate = rate / 12 / 100

    // Guarded for completeness; the slider floor is 8%, so the rate is never 0.
    const instalment =
      monthlyRate === 0
        ? amount / months
        : (amount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1)

    const payable = instalment * months
    return {
      emi: instalment,
      totalInterest: payable - amount,
      totalPayable: payable,
      principalShare: (amount / payable) * 100,
    }
  }, [amount, rate, years])

  const interestShare = 100 - principalShare

  return (
    <section id="emi-calculator" className="bg-ivory py-24 md:py-32">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-5 md:px-8">
        <SectionHeading
          eyebrow="Plan before you apply"
          title={
            <>
              EMI <span className="text-gold-gradient">Calculator</span>
            </>
          }
          description="Estimate your monthly instalment across the 8% to 28% range our partner Banks, NBFCs and HFCs offer, from personal loans to large secured facilities. Move the sliders to see what fits your budget."
        />

        <Reveal>
          <div className="grid gap-10 rounded-xl border border-navy/10 bg-background p-6 md:p-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            {/* ── Inputs ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-8">
              <Slider
                id="emi-amount"
                label="Loan amount"
                value={amountToPosition(amount)}
                min={0}
                max={AMOUNT_POSITIONS}
                step={1}
                onChange={(position) => setAmount(positionToAmount(position))}
                display={compactRupees(amount)}
                minLabel="₹1 L"
                maxLabel="₹50 Cr"
              />

              <Slider
                id="emi-rate"
                label="Interest rate"
                value={rate}
                min={RATE.min}
                max={RATE.max}
                step={RATE.step}
                onChange={setRate}
                display={`${rate.toFixed(1)}%`}
                minLabel="8%"
                maxLabel="28%"
              />

              <Slider
                id="emi-tenure"
                label="Tenure"
                value={years}
                min={TENURE.min}
                max={TENURE.max}
                step={TENURE.step}
                onChange={setYears}
                display={`${years} ${years === 1 ? 'year' : 'years'}`}
                minLabel="1 year"
                maxLabel="30 years"
              />

              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Indicative only. Your actual rate, eligibility and charges are set by the lending
                institution after assessment.
              </p>
            </div>

            {/* ── Results ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 border-t border-navy/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16">
              <Figure label="Monthly EMI" amount={emi} emphasis />

              <div className="grid grid-cols-2 gap-6">
                <Figure label="Total interest" amount={totalInterest} />
                <Figure label="Total payable" amount={totalPayable} />
              </div>

              <div className="flex flex-col gap-3">
                <div
                  role="img"
                  aria-label={`Of ${rupees.format(totalPayable)} payable, ${rupees.format(amount)} is principal (${principalShare.toFixed(0)}%) and ${rupees.format(totalInterest)} is interest (${interestShare.toFixed(0)}%).`}
                  className="flex h-3 w-full gap-0.5 overflow-hidden"
                >
                  <span
                    className="h-full rounded-l-sm transition-[width] duration-300"
                    style={{ width: `${principalShare}%`, backgroundColor: PRINCIPAL_COLOR }}
                  />
                  <span
                    className="h-full rounded-r-sm transition-[width] duration-300"
                    style={{ width: `${interestShare}%`, backgroundColor: INTEREST_COLOR }}
                  />
                </div>

                <ul className="flex flex-wrap gap-x-6 gap-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PRINCIPAL_COLOR }}
                    />
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-medium text-navy-deep tabular-nums">
                      {principalShare.toFixed(0)}%
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: INTEREST_COLOR }}
                    />
                    <span className="text-muted-foreground">Interest</span>
                    <span className="font-medium text-navy-deep tabular-nums">
                      {interestShare.toFixed(0)}%
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
