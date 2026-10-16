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

/**
 * Fetched from /api/contact-config at submit time rather than inlined at build
 * time, so the key stays an ordinary runtime environment variable.
 */
let cachedKey: string | null = null

async function accessKey(): Promise<string> {
  if (cachedKey !== null) return cachedKey
  try {
    const response = await fetch('/api/contact-config', { cache: 'no-store' })
    const body = (await response.json()) as { accessKey?: string }
    cachedKey = body.accessKey ?? ''
  } catch {
    cachedKey = ''
  }
  return cachedKey
}

export async function submitToWeb3Forms(
  fields: Record<string, string>,
): Promise<Web3FormsResult> {
  const key = await accessKey()
  if (!key) {
    console.error('[web3forms] WEB3FORMS_ACCESS_KEY is not set on the server')
    return { ok: false, error: 'The enquiry form is not configured. Please call us instead.' }
  }

  const payload: Record<string, string> = { access_key: key }
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
