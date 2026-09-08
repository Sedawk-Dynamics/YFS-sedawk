import { prisma } from '@/lib/db'

// Crockford-style alphabet: no I, L, O, U, 0 or 1, so codes read back cleanly over the phone.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
const LENGTH = 6

function randomSuffix() {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

export function makeInstitutionCode() {
  return `INST-${randomSuffix()}`
}

export function makeReferCode() {
  return `REF-${randomSuffix()}`
}

/**
 * Generates a code pair that collides with nothing already issued.
 * The uniqueness constraint in the database is the real guarantee; this just
 * avoids the retry in the overwhelming majority of cases.
 */
export async function generateUniqueCodes(attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const institutionCode = makeInstitutionCode()
    const referCode = makeReferCode()
    const clash = await prisma.user.findFirst({
      where: { OR: [{ institutionCode }, { referCode }] },
      select: { id: true },
    })
    if (!clash) return { institutionCode, referCode }
  }
  throw new Error('Could not generate unique codes after multiple attempts')
}
