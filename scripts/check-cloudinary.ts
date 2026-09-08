/**
 * Verifies the CLOUDINARY_* credentials in .env actually work.
 *
 *   pnpm check:cloudinary
 *
 * Optionally test a cloud name without editing .env first:
 *   pnpm check:cloudinary -- --cloud dxy1abcde
 */
import 'dotenv/config'

function arg(name: string) {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`))
  return inline ? inline.slice(flag.length + 1) : undefined
}

async function main() {
  const cloudName = arg('cloud') ?? process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  console.log('\n  Cloudinary configuration check\n')
  console.log(`    Cloud name  ${cloudName || '(not set)'}`)
  console.log(`    API key     ${apiKey || '(not set)'}`)
  console.log(`    API secret  ${apiSecret ? `${apiSecret.slice(0, 4)}… (${apiSecret.length} chars)` : '(not set)'}\n`)

  if (!cloudName || !apiKey || !apiSecret) {
    console.log('  Incomplete. Uploads will fall back to local disk (development only).\n')
    process.exit(1)
  }

  // The ping endpoint validates the cloud name and the key pair together.
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  const body = await response.text()

  if (response.ok) {
    console.log('  Credentials are valid. KYC documents and salary slips will upload to Cloudinary.\n')
    return
  }

  console.log(`  FAILED (HTTP ${response.status}): ${body}\n`)

  const whereToLook = [
    '  Find your cloud name in the Cloudinary Console:',
    '    Dashboard (Programmable Media) -> "Cloud name", beside Product Environment.',
    '  It is NOT the "Key Name" column on the API Keys page - that is only a label you',
    '  chose for the key pair, and it has nothing to do with the cloud name.',
    '',
  ]

  if (body.includes('cloud_name mismatch')) {
    console.log(`  "${cloudName}" is a real Cloudinary cloud, but your API key does not belong`)
    console.log('  to it - so this is somebody else\'s cloud, not yours.\n')
    console.log(whereToLook.join('\n'))
  } else if (body.includes('Invalid cloud_name')) {
    console.log(`  No Cloudinary cloud named "${cloudName}" exists.\n`)
    console.log(whereToLook.join('\n'))
  } else if (response.status === 401) {
    console.log('  The cloud name resolved, but the API key or secret is wrong.')
    console.log('  Copy both from Console -> Settings -> API Keys.\n')
  }

  process.exit(1)
}

main().catch((error) => {
  console.error(`\n  Could not reach Cloudinary: ${error instanceof Error ? error.message : error}\n`)
  process.exit(1)
})
