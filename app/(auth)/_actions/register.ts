'use server'

import { submitRegistration } from '@/lib/services/registration-submit'
import { registrationSchema } from '@/lib/validation/registration'

export type RegisterState =
  | { status: 'idle' }
  /**
   * `fieldErrors` drives the inline message under each input. `error` is only
   * for failures that belong to no single field (an upload failure, say).
   */
  | { status: 'error'; fieldErrors: Record<string, string>; error?: string }
  | { status: 'success'; applicationId: string }

function file(formData: FormData, name: string): File | null {
  const value = formData.get(name)
  return value instanceof File && value.size > 0 ? value : null
}

export async function registerDsa(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registrationSchema.safeParse({
    fullName: formData.get('fullName'),
    dob: formData.get('dob'),
    gender: formData.get('gender') || undefined,
    guardianName: formData.get('guardianName') ?? '',
    email: formData.get('email'),
    mobile: formData.get('mobile'),
    alternateNumber: formData.get('alternateNumber') ?? '',
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2') ?? '',
    city: formData.get('city'),
    state: formData.get('state'),
    pincode: formData.get('pincode'),
    panNumber: formData.get('panNumber'),
    aadhaarNumber: formData.get('aadhaarNumber'),
    accountHolderName: formData.get('accountHolderName'),
    bankName: formData.get('bankName'),
    accountNumber: formData.get('accountNumber'),
    confirmAccountNumber: formData.get('confirmAccountNumber'),
    ifsc: formData.get('ifsc'),
    hasReferCode: formData.get('hasReferCode'),
    referCode: formData.get('referCode') ?? '',
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    terms: formData.get('terms'),
  })

  if (!parsed.success) {
    // Report every invalid field at once, so the applicant fixes them in one
    // pass instead of discovering them one submit at a time.
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message
    }
    return { status: 'error', fieldErrors }
  }

  const result = await submitRegistration(parsed.data, {
    panCard: file(formData, 'panCard'),
    aadhaarFront: file(formData, 'aadhaarFront'),
    aadhaarBack: file(formData, 'aadhaarBack'),
    photograph: file(formData, 'photograph'),
    addressProof: file(formData, 'addressProof'),
    cheque: file(formData, 'cheque'),
  })

  if (!result.ok) {
    return result.field
      ? { status: 'error', fieldErrors: { [result.field]: result.error } }
      : { status: 'error', fieldErrors: {}, error: result.error }
  }
  return { status: 'success', applicationId: result.applicationId }
}
