/**
 * Serves the Web3Forms access key to the browser at request time.
 *
 * The key is public by design — Web3Forms expects it in client-side code. But
 * reading it through NEXT_PUBLIC_* would bake it into the bundle at build time,
 * which means it has to be a Docker build argument rather than an ordinary
 * environment variable. Serving it from here keeps it a plain runtime variable:
 * change it and restart, no rebuild.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const env = process.env as Record<string, string | undefined>

  // The NEXT_PUBLIC_ name is assembled rather than written out: Next inlines
  // any literal `process.env.NEXT_PUBLIC_*` at build time — in server code
  // too — which would freeze it to whatever was set during the build (nothing).
  // Looking it up dynamically keeps it a genuine runtime read, so deployments
  // that already set the NEXT_PUBLIC_ name keep working.
  const publicName = ['NEXT', 'PUBLIC', 'WEB3FORMS', 'ACCESS', 'KEY'].join('_')
  const accessKey = env.WEB3FORMS_ACCESS_KEY ?? env[publicName] ?? ''

  return Response.json(
    { accessKey },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
