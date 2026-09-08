import type { Metadata } from 'next'
import { NotBuiltYet } from '../../_components/not-built-yet'

export const metadata: Metadata = { title: 'Notifications' }

export default function AdminNotificationsPage() {
  return (
    <NotBuiltYet
      title="Notifications"
      description="Send announcements to DSAs and review the notification feed."
      specRef="spec §7.4 and Form F9"
      planned={[
        'Compose an announcement with audience (All DSAs / single DSA / by status), title, message and channels',
        'Admin notification feed with unread badge, wired to the bell in the top bar',
        'Delivery log per notification across in-app, email and SMS',
      ]}
    />
  )
}
