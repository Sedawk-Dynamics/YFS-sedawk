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
  const accessKey =
    process.env.WEB3FORMS_ACCESS_KEY ?? process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? ''

  return Response.json(
    { accessKey },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
