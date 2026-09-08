import { z } from 'zod'
import { passwordSchema } from '@/lib/auth/password'

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN card number. Example: ABCDE1234F')

export const aadhaarSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Invalid Aadhaar number. It must be 12 digits. Example: 123456789012')

export const ifscSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code. Example: HDFC0001234')

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Invalid mobile number. Enter 10 digits starting with 6-9. Example: 9876543210')

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Invalid PIN code. It must be 6 digits. Example: 282010')

/** Spec F1 Section A: applicant must be 18 or older. */
function isAdult(dob: Date) {
  const eighteen = new Date()
  eighteen.setFullYear(eighteen.getFullYear() - 18)
  return dob <= eighteen
}

export const registrationSchema = z
  .object({
    // Section A — Personal details
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name')
      .max(100, 'Name is too long')
      .regex(/^[A-Za-z\s.'-]+$/, 'Name may contain letters and spaces only. Example: Rohit Verma'),
    dob: z.coerce
      .date({ message: 'Enter your date of birth' })
      .refine(isAdult, 'You must be at least 18 years old to register'),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    guardianName: z.string().trim().min(2).max(100).optional().or(z.literal('')),

    // Section B — Contact
    email: z.string().trim().toLowerCase().email('Invalid email address. Example: name@example.com'),
    mobile: mobileSchema,
    alternateNumber: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Invalid alternate number. Example: 9876543210')
      .optional()
      .or(z.literal('')),
    addressLine1: z.string().trim().min(3, 'Enter your address. Example: 15 Air Enclave'),
    addressLine2: z.string().trim().optional().or(z.literal('')),
    city: z.string().trim().min(2, 'Enter your city. Example: Agra'),
    state: z.enum(INDIAN_STATES, { message: 'Select your state' }),
    pincode: pincodeSchema,

    // Section C — KYC
    panNumber: panSchema,
    aadhaarNumber: aadhaarSchema,

    // Section D — Bank
    accountHolderName: z
      .string()
      .trim()
      .min(2, 'Enter the account holder name exactly as it appears in your bank records'),
    bankName: z.string().trim().min(2, 'Enter your bank name. Example: HDFC Bank'),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, 'Invalid account number. It must be 9 to 18 digits.'),
    confirmAccountNumber: z.string().trim(),
    ifsc: ifscSchema,

    // Section E — Referral
    hasReferCode: z.enum(['yes', 'no']),
    referCode: z.string().trim().toUpperCase().optional().or(z.literal('')),

    // Section F — Account & consent
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.literal('on', { message: 'You must accept the Terms & Conditions' }),
  })
  .refine((v) => v.accountNumber === v.confirmAccountNumber, {
    message: 'Account numbers do not match',
    path: ['confirmAccountNumber'],
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.hasReferCode === 'no' || Boolean(v.referCode), {
    message: 'Enter the Refer Code you were given. Example: REF-ABC123',
    path: ['referCode'],
  })

export type RegistrationInput = z.infer<typeof registrationSchema>
