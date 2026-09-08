import { EyeOff, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { requireDsa } from '@/lib/auth/guards'
import { CopyButton } from '../_components/copy-button'

export const metadata: Metadata = { title: 'Institution Code' }

export default async function InstitutionCodePage() {
  const dsa = await requireDsa()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Institution Code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your private code. It is visible only to you and to YFS Infinity administrators.
        </p>
      </div>

      <Card className="ring-red-200">
        <CardContent className="flex items-start gap-3 border-b pb-(--card-spacing)">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="text-sm font-medium text-navy-deep">Do not share this code</p>
            <p className="text-sm text-muted-foreground">
              Never give your Institution Code to anyone — not to other DSAs, and not to anyone
              claiming to be from YFS Infinity. It is not a referral code and will never work as
              one. To refer someone, share your Refer Code instead.
            </p>
          </div>
        </CardContent>

        <CardContent className="flex flex-col gap-3">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Your Institution Code
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-4 py-3 font-mono text-xl text-navy-deep">
              {dsa.institutionCode}
            </code>
            <CopyButton value={dsa.institutionCode ?? ''} label="Copy Institution Code" />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <EyeOff className="size-3.5" aria-hidden />
            Not shown anywhere else in the portal.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-navy-deep">Refer Code vs Institution Code</h2>
          <dl className="mt-1 flex flex-col gap-4 text-sm">
            <div>
              <dt className="font-medium text-navy-deep">
                Refer Code — <span className="text-emerald-700">share freely</span>
              </dt>
              <dd className="text-muted-foreground">
                Give this to prospective DSAs so they can register under you. It grants no access to
                your account by itself.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-navy-deep">
                Institution Code — <span className="text-destructive">never share</span>
              </dt>
              <dd className="text-muted-foreground">
                Identifies your membership internally. The registration form rejects it outright, so
                nobody can join using it.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
