import { ArrowLeft, ExternalLink, FileText, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { maskAllButLast4 } from '@/lib/crypto'
import { formatDate, formatDateTime } from '@/lib/format'
import { ApplicationStatusBadge } from '../../../_components/status-badge'
import { RowDecisionButtons } from '../../../_components/row-decision-buttons'

export const metadata: Metadata = { title: 'Application Detail' }

const DOC_LABELS = {
  PAN: 'PAN Card',
  AADHAAR_FRONT: 'Aadhaar (front)',
  AADHAAR_BACK: 'Aadhaar (back)',
  PHOTO: 'Photograph',
  ADDRESS_PROOF: 'Address Proof',
  CHEQUE: 'Cancelled Cheque / Passbook',
} as const

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-navy-deep">{value || '—'}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="border-b pb-(--card-spacing)">
        <h2 className="text-base font-medium text-navy-deep">{title}</h2>
      </CardContent>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const dsa = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      bankDetails: true,
      documents: { orderBy: { uploadedAt: 'asc' } },
      referredBy: { select: { id: true, fullName: true, referCode: true, status: true } },
    },
  })

  if (!dsa || dsa.role !== 'DSA') notFound()

  // Resolve the code the applicant typed, so the admin can verify its owner
  // before approving (spec F6, "Refer Code Verification").
  const referrerByCode = dsa.submittedReferCode
    ? await prisma.user.findFirst({
        where: { referCode: dsa.submittedReferCode },
        select: { id: true, fullName: true, email: true, status: true },
      })
    : null

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/registrations"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-navy-deep"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to registrations
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-medium text-navy-deep">{dsa.fullName}</h1>
            <ApplicationStatusBadge status={dsa.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Applied {formatDateTime(dsa.createdAt)}
            {dsa.approvedAt ? ` · Approved ${formatDateTime(dsa.approvedAt)}` : ''}
          </p>
        </div>

        {dsa.status !== 'APPROVED' && (
          <RowDecisionButtons userId={dsa.id} name={dsa.fullName} status={dsa.status} size="lg" />
        )}
      </div>

      {dsa.status === 'REJECTED' && dsa.rejectionReason && (
        <Card className="ring-red-200">
          <CardContent className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="text-sm font-medium text-navy-deep">Rejection reason</p>
              <p className="text-sm text-muted-foreground">{dsa.rejectionReason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Section title="Personal details">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" value={dsa.fullName} />
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
                    {dsa.emailVerified ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        OTP verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                        Unverified
                      </Badge>
                    )}
                  </span>
                }
              />
              <Field
                label="Mobile"
                value={
                  <span className="flex flex-wrap items-center gap-2">
                    {dsa.mobile}
                    {dsa.mobileVerified ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        OTP verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                        Unverified
                      </Badge>
                    )}
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

          <Section title="KYC">
            <dl className="mb-6 grid gap-5 sm:grid-cols-2">
              <Field label="PAN number" value={dsa.profile?.panNumber} />
              <Field
                label="Aadhaar number"
                value={
                  dsa.profile?.aadhaarLast4
                    ? maskAllButLast4(`00000000${dsa.profile.aadhaarLast4}`)
                    : null
                }
              />
            </dl>

            {dsa.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
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

          <Section title="Bank details">
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
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <Section title="Refer Code verification">
            {!dsa.submittedReferCode ? (
              <p className="text-sm text-muted-foreground">
                This applicant registered without a Refer Code. They still receive the same approval
                email on approval.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <Field
                  label="Code submitted"
                  value={<span className="font-mono">{dsa.submittedReferCode}</span>}
                />
                {referrerByCode ? (
                  <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-900">
                        Code belongs to {referrerByCode.fullName}
                      </p>
                      <p className="text-emerald-800">{referrerByCode.email}</p>
                      <p className="mt-1 text-xs text-emerald-800">
                        Owner status: {referrerByCode.status}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                    <p className="text-sm text-red-900">
                      This code does not match any issued Refer Code. Do not approve until it is
                      resolved.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Section>

          {dsa.status === 'APPROVED' && (
            <Section title="Issued codes">
              <div className="flex flex-col gap-5">
                <Field
                  label="Refer Code (shareable)"
                  value={<span className="font-mono">{dsa.referCode}</span>}
                />
                <div className="flex flex-col gap-1">
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Institution Code (private)
                  </dt>
                  <dd className="font-mono text-sm text-navy-deep">{dsa.institutionCode}</dd>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Never share this code with anyone, including other DSAs.
                  </p>
                </div>
                {dsa.referredBy && (
                  <Field
                    label="Linked under"
                    value={
                      <Link
                        href={`/admin/registrations/${dsa.referredBy.id}`}
                        className="hover:underline"
                      >
                        {dsa.referredBy.fullName}{' '}
                        <span className="font-mono text-xs text-muted-foreground">
                          ({dsa.referredBy.referCode})
                        </span>
                      </Link>
                    }
                  />
                )}
              </div>
            </Section>
          )}

          {dsa.status === 'APPROVED' && (
            <Card>
              <CardContent>
                <Link
                  href={`/admin/payouts/${dsa.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
                >
                  View payout history
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
