/**
 * Creates an admin account. There is no public admin signup — this script is
 * the only way an admin enters the system.
 *
 *   pnpm admin:create -- --email ops@yfsinfinity.com --name "Ops Lead"
 *   pnpm admin:create -- --email ops@yfsinfinity.com --name "Ops Lead" --password 'Chosen@Pass1'
 *
 * The generated password is printed once and never stored in plaintext.
 */
import 'dotenv/config'
import { randomInt } from 'node:crypto'
import { prisma } from '../lib/db'
import { hashPassword, passwordSchema } from '../lib/auth/password'
import { audit } from '../lib/audit'

const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*?-_'

function generatePassword(length = 20) {
  const all = UPPER + LOWER + DIGITS + SYMBOLS
  // Seed one of each required class so the result always satisfies the policy.
  const chars = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SYMBOLS[randomInt(SYMBOLS.length)],
  ]
  while (chars.length < length) chars.push(all[randomInt(all.length)])
  // Fisher-Yates, so the seeded characters are not always in the first four slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function arg(name: string) {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`))
  return inline ? inline.slice(flag.length + 1) : undefined
}

export async function createAdmin(opts: {
  email: string
  name: string
  mobile?: string
  password?: string
}) {
  const email = opts.email.trim().toLowerCase()
  const password = opts.password ?? generatePassword()

  const check = passwordSchema.safeParse(password)
  if (!check.success) {
    throw new Error(`Password does not meet policy: ${check.error.issues.map((i) => i.message).join(', ')}`)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error(`A user with email ${email} already exists (role ${existing.role}).`)

  // Mobile is unique and non-null on User; admins get a placeholder unless supplied.
  const mobile = opts.mobile ?? `admin-${Date.now().toString(36)}`

  const admin = await prisma.user.create({
    data: {
      role: 'ADMIN',
      fullName: opts.name,
      email,
      emailVerified: true,
      mobile,
      mobileVerified: Boolean(opts.mobile),
      passwordHash: await hashPassword(password),
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  await audit({
    actorUserId: admin.id,
    action: 'admin_created',
    entity: 'user',
    entityId: admin.id,
    meta: { email, via: 'cli' },
  })

  return { admin, password, generated: !opts.password }
}

async function main() {
  const email = arg('email')
  const name = arg('name')
  if (!email || !name) {
    console.error('Usage: pnpm admin:create -- --email <email> --name "<full name>" [--mobile <10 digits>] [--password <password>]')
    process.exit(1)
  }

  const { admin, password, generated } = await createAdmin({
    email,
    name,
    mobile: arg('mobile'),
    password: arg('password'),
  })

  console.log('\n  Admin account created.\n')
  console.log(`    Login URL   http://localhost:3000/admin/login`)
  console.log(`    Email       ${admin.email}`)
  if (generated) {
    console.log(`    Password    ${password}`)
    console.log('\n  This password is shown once and is not recoverable. Store it in a password manager now.\n')
  } else {
    console.log('    Password    (the one you supplied)\n')
  }
}

// Only run when invoked directly, so prisma/seed.ts can import createAdmin.
if (process.argv[1] && process.argv[1].includes('create-admin')) {
  main()
    .catch((error) => {
      console.error(`\n  ${error instanceof Error ? error.message : error}\n`)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
