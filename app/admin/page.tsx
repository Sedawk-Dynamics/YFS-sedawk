import { redirect } from 'next/navigation'

export default function AdminIndexPage() {
  // Middleware sends unauthenticated visitors to /admin/login before this runs.
  redirect('/admin/dashboard')
}
