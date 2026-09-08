import { requireAdmin } from '@/lib/auth/guards'
import { AdminShell } from '../_components/admin-shell'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Every portal page re-verifies against the database, not just the cookie.
  const admin = await requireAdmin()

  return <AdminShell admin={{ name: admin.fullName, email: admin.email }}>{children}</AdminShell>
}
