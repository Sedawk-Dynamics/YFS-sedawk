import bcrypt from 'bcryptjs'
import { z } from 'zod'

const ROUNDS = 12

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

/** Spec F1 Section F: min 8 chars, 1 uppercase, 1 number, 1 special character. */
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'At least one uppercase letter')
  .regex(/[0-9]/, 'At least one number')
  .regex(/[^A-Za-z0-9]/, 'At least one special character')
