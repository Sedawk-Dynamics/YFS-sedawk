import 'dotenv/config'
import { prisma } from '../lib/db'
import { createAdmin } from '../scripts/create-admin'

/**
 * Seeds the first super-admin plus the default admin-configurable settings.
 * Safe to re-run: it skips anything that already exists.
 */
async function main() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

  if (existingAdmin) {
    console.log(`  Admin already present (${existingAdmin.email}) — skipping admin seed.`)
  } else {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@yfsinfinity.com'
    const { admin, password } = await createAdmin({ email, name: 'Super Admin' })
    console.log('\n  Super admin created.\n')
    console.log(`    Login URL   ${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/login`)
    console.log(`    Email       ${admin.email}`)
    console.log(`    Password    ${password}`)
    console.log('\n  Shown once only. Save it now.\n')
  }

  const defaults: Array<{ key: string; value: unknown }> = [
    {
      key: 'loan_types',
      value: [
        'Personal Loan',
        'Business Loan',
        'Home Loan',
        'Loan Against Property',
        'Mortgage Loan',
        'Working Capital Finance',
        'MSME Loan',
        'Balance Transfer',
        'Top-Up Loan',
      ],
    },
    { key: 'otp_expiry_minutes', value: 5 },
    { key: 'otp_max_attempts', value: 3 },
    { key: 'otp_resend_seconds', value: 30 },
  ]

  for (const setting of defaults) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value as never },
    })
  }
  console.log(`  Settings seeded (${defaults.length} keys).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
