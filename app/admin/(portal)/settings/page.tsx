import type { Metadata } from 'next'
import { NotBuiltYet } from '../../_components/not-built-yet'

export const metadata: Metadata = { title: 'Settings' }

export default function AdminSettingsPage() {
  return (
    <NotBuiltYet
      title="Platform Settings"
      description="Loan types, payout rules and OTP configuration."
      specRef="spec §7.4"
      planned={[
        'Manage the admin-configurable loan type list (seeded in the settings table)',
        'Referral payout rules used to calculate referrer incentives',
        'OTP expiry, attempt limit and resend window',
        'Add and deactivate other admin accounts',
      ]}
    />
  )
}
