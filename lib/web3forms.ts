/**
 * Web3Forms delivery for the public enquiry form.
 *
 * Two constraints shape this:
 *
 * 1. Submissions go to the inbox registered against the access key. There is
 *    no arbitrary recipient field, so this is only for messages addressed to
 *    YFS Infinity — never for mail that has to reach a particular applicant.
 * 2. The free plan rejects server-side calls ("Use our API in client side"),
 *    so this runs in the browser. The access key is public by design.
 */

const ENDPOINT = 'https://api.web3forms.com/submit'

export type Web3FormsResult = { ok: true } | { ok: false; error: string }

export const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? ''

export async function submitToWeb3Forms(
  fields: Record<string, string>,
): Promise<Web3FormsResult> {
  if (!WEB3FORMS_ACCESS_KEY) {
    console.error('[web3forms] NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is not set')
    return { ok: false, error: 'The enquiry form is not configured. Please call us instead.' }
  }

  const payload: Record<string, string> = { access_key: WEB3FORMS_ACCESS_KEY }
  for (const [key, value] of Object.entries(fields)) {
    if (value) payload[key] = value
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => null)) as
      | { success?: boolean; message?: string }
      | null

    if (!response.ok || !body?.success) {
      console.error('[web3forms] submission rejected', response.status, body?.message)
      return { ok: false, error: 'We could not send your enquiry. Please try again, or call us.' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'We could not reach our servers. Please try again, or call us.' }
  }
}
