import { ExternalLink, FileText, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { requireDsa } from '@/lib/auth/guards'
import { maskAllButLast4 } from '@/lib/crypto'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'My Profile' }

const DOC_LABELS = {
  PAN: 'PAN Card',
  AADHAAR_FRONT: 'Aadhaar (front)',
  AADHAAR_BACK: 'Aadhaar (back)',
  PHOTO: 'Photograph',
  ADDRESS_PROOF: 'Address Proof',
  CHEQUE: 'Cancelled Cheque / Passbook',
} as const

function Field({
  label,
  value,
  locked,
}: {
  label: string
  value: React.ReactNode
  locked?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
        {label}
        {locked && <Lock className="size-3" aria-label="Locked after approval" />}
      </dt>
      <dd className="text-sm text-navy-deep">{value || '—'}</dd>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="border-b pb-(--card-spacing)">
        <h2 className="text-base font-medium text-navy-deep">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardContent>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default async function DsaProfilePage() {
  const session = await requireDsa()

  const dsa = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      profile: true,
      bankDetails: true,
      documents: { orderBy: { uploadedAt: 'asc' } },
    },
  })

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fields marked with a lock cannot be changed after approval. Contact our team to update
          them.
        </p>
      </div>

      <Section title="Personal details">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" value={dsa.fullName} locked />
          <Field label="Date of birth" value={formatDate(dsa.profile?.dob)} />
          <Field label="Gender" value={dsa.profile?.gender} />
          <Field label="Father's / Spouse's name" value={dsa.profile?.guardianName} />
        </dl>
      </Section>

      <Section title="Contact information">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Email"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {dsa.email}
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                  Verified
                </Badge>
              </span>
            }
          />
          <Field
            label="Mobile"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {dsa.mobile}
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                  Verified
                </Badge>
              </span>
            }
          />
          <Field
            label="Address"
            value={
              dsa.profile
                ? [dsa.profile.addressLine1, dsa.profile.addressLine2].filter(Boolean).join(', ')
                : null
            }
          />
          <Field
            label="City / State / PIN"
            value={
              dsa.profile
                ? `${dsa.profile.city}, ${dsa.profile.state} — ${dsa.profile.pincode}`
                : null
            }
          />
        </dl>
      </Section>

      <Section title="KYC" subtitle="Your identity documents as submitted at registration.">
        <dl className="mb-6 grid gap-5 sm:grid-cols-2">
          <Field label="PAN number" value={dsa.profile?.panNumber} locked />
          <Field
            label="Aadhaar number"
            value={
              dsa.profile?.aadhaarLast4
                ? maskAllButLast4(`00000000${dsa.profile.aadhaarLast4}`)
                : null
            }
            locked
          />
        </dl>

        {dsa.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents on file.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {dsa.documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:border-gold/60 hover:bg-muted/50"
                >
                  <FileText className="size-4 shrink-0 text-gold-dark" aria-hidden />
                  <span className="flex-1 text-navy-deep">{DOC_LABELS[doc.docType]}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Bank details" subtitle="Where your payouts are settled.">
        {dsa.bankDetails ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Account holder" value={dsa.bankDetails.accountHolderName} />
            <Field label="Bank" value={dsa.bankDetails.bankName} />
            <Field
              label="Account number"
              value={maskAllButLast4(`000000${dsa.bankDetails.accountLast4}`)}
            />
            <Field label="IFSC" value={dsa.bankDetails.ifsc} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No bank details on file.</p>
        )}
        <p className="mt-5 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Changing your bank details requires re-verification by our team. Contact support to
          request a change.
        </p>
      </Section>
    </div>
  )
}
