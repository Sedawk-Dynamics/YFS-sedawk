import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { UPLOAD_ROOT } from '@/lib/storage-disk'

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

/**
 * Serves every uploaded file from the mounted volume. This route is the only
 * way in: admins see everything, a DSA sees only files stored under their own
 * id, and nobody reads anything without a session.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const { path: segments } = await params
  const publicId = segments.join('/')

  // Resolve and confirm the result is still inside the upload root, so a
  // traversal like ../../.env cannot escape it.
  const absolute = path.resolve(UPLOAD_ROOT, publicId)
  const root = path.resolve(UPLOAD_ROOT)
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (session.role !== 'ADMIN') {
    // Paths are shaped yfs/<kind>/<userId>/<file>; a DSA may only read their own.
    const owner = segments.at(-2)
    if (owner !== session.sub) return new NextResponse('Forbidden', { status: 403 })

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { status: true },
    })
    if (user?.status !== 'APPROVED') return new NextResponse('Forbidden', { status: 403 })
  }

  const info = await stat(absolute).catch(() => null)
  if (!info?.isFile()) return new NextResponse('Not found', { status: 404 })

  const extension = path.extname(absolute).slice(1).toLowerCase()
  const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream

  return new NextResponse(stream, {
    headers: {
      'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
      'Content-Length': String(info.size),
      'Cache-Control': 'private, no-store',
    },
  })
}
