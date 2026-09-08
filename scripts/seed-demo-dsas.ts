/**
 * Development fixtures: a handful of DSA applications in varied states so the
 * admin screens have something to show. Never run this against production.
 *
 *   pnpm demo:dsas
 */
import 'dotenv/config'
import { prisma } from '../lib/db'
import { hashPassword } from '../lib/auth/password'
import { encrypt } from '../lib/crypto'

const PASSWORD = 'Demo@1234'

const applicants = [
  {
    fullName: 'Rohit Verma',
    email: 'rohit.verma@example.com',
    mobile: '9812345671',
    city: 'Agra',
    state: 'Uttar Pradesh',
    pan: 'ABCDE1234F',
    aadhaar: '123412341234',
    account: '123456789012',
    ifsc: 'HDFC0001234',
    bank: 'HDFC Bank',
  },
  {
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    mobile: '9812345672',
    city: 'Mathura',
    state: 'Uttar Pradesh',
    pan: 'BCDEA2345G',
    aadhaar: '223412341234',
    account: '223456789012',
    ifsc: 'ICIC0004321',
    bank: 'ICICI Bank',
  },
  {
    fullName: 'Imran Qureshi',
    email: 'imran.qureshi@example.com',
    mobile: '9812345673',
    city: 'Firozabad',
    state: 'Uttar Pradesh',
    pan: 'CDEAB3456H',
    aadhaar: '323412341234',
    account: '323456789012',
    ifsc: 'SBIN0009876',
    bank: 'State Bank of India',
  },
  {
    fullName: 'Anita Desai',
    email: 'anita.desai@example.com',
    mobile: '9812345674',
    city: 'Aligarh',
    state: 'Uttar Pradesh',
    pan: 'DEABC4567I',
    aadhaar: '423412341234',
    account: '423456789012',
    ifsc: 'AXIS0005678',
    bank: 'Axis Bank',
  },
]

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data in production.')
  }

  const passwordHash = await hashPassword(PASSWORD)

  for (const [index, a] of applicants.entries()) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } })
    if (existing) {
      console.log(`  ${a.email} already exists — skipping.`)
      continue
    }

    await prisma.user.create({
      data: {
        role: 'DSA',
        fullName: a.fullName,
        email: a.email,
        emailVerified: true,
        mobile: a.mobile,
        mobileVerified: true,
        passwordHash,
        status: 'PENDING',
        profile: {
          create: {
            dob: new Date(Date.UTC(1990, index, 15)),
            gender: index % 2 === 0 ? 'Male' : 'Female',
            guardianName: 'Guardian Name',
            addressLine1: `${index + 1} Air Enclave`,
            addressLine2: 'Murli Vihar',
            city: a.city,
            state: a.state,
            pincode: '282010',
            panNumber: a.pan,
            aadhaarNumber: encrypt(a.aadhaar),
            aadhaarLast4: a.aadhaar.slice(-4),
          },
        },
        bankDetails: {
          create: {
            accountHolderName: a.fullName,
            bankName: a.bank,
            accountNumber: encrypt(a.account),
            accountLast4: a.account.slice(-4),
            ifsc: a.ifsc,
          },
        },
      },
    })
    console.log(`  Created pending application for ${a.fullName}.`)
  }

  console.log(`\n  All demo DSAs share the password: ${PASSWORD}\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
