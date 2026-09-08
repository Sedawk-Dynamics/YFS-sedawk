import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/guards'
import { ChangePasswordForm } from '../../_components/change-password-form'

export const metadata: Metadata = { title: 'Change Password' }

export default async function ChangePasswordPage() {
  await requireAdmin()

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-navy-deep">Change password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Minimum 8 characters with an uppercase letter, a number and a special character.
        </p>
      </div>

      <Card>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
