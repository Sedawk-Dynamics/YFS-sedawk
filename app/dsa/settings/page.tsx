import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { requireDsa } from '@/lib/auth/guards'
import { DsaPasswordForm } from '../_components/password-form'

export const metadata: Metadata = { title: 'Settings' }

export default async function DsaSettingsPage() {
  await requireDsa()

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account security.</p>
      </div>

      <Card>
        <CardContent className="border-b pb-(--card-spacing)">
          <h2 className="text-base font-medium text-navy-deep">Change password</h2>
          <p className="text-sm text-muted-foreground">
            Minimum 8 characters with an uppercase letter, a number and a special character.
          </p>
        </CardContent>
        <CardContent>
          <DsaPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
