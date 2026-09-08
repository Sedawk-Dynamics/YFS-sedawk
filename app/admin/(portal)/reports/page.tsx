import type { Metadata } from 'next'
import { NotBuiltYet } from '../../_components/not-built-yet'

export const metadata: Metadata = { title: 'Reports' }

export default function AdminReportsPage() {
  return (
    <NotBuiltYet
      title="Reports & Analytics"
      description="Payout and registration analytics with export."
      specRef="spec §7.4 and §13"
      planned={[
        'Payout reports filtered by date range, category and status (Form F10)',
        'Registration and conversion analytics',
        'Export to Excel and PDF',
      ]}
    />
  )
}
