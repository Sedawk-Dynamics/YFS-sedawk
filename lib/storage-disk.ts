import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { FileStorage, StoredFile } from './storage'

/**
 * Where uploaded files live.
 *
 * In production this points at a mounted volume (Dokploy: volume `yfs-data`
 * mounted at `/app/uploads`), so KYC documents and salary slips survive
 * redeploys. Locally it falls back to a gitignored directory in the project.
 */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), '.uploads')

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/**
 * Disk-backed storage. Files are served through /api/files/[...path], which
 * enforces the same ownership rules everywhere else in the app relies on —
 * nothing under UPLOAD_ROOT is reachable without passing that route.
 */
export const diskStorage: FileStorage = {
  async upload(file, folder) {
    const extension = EXTENSIONS[file.type] ?? 'bin'
    const id = `${randomUUID()}.${extension}`
    const dir = path.join(UPLOAD_ROOT, folder)
    await mkdir(dir, { recursive: true })

    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, id), bytes)

    const publicId = `${folder}/${id}`
    return {
      url: `/api/files/${publicId}`,
      publicId,
      bytes: bytes.byteLength,
      format: extension,
    } satisfies StoredFile
  },

  async remove(publicId) {
    await unlink(path.join(UPLOAD_ROOT, publicId)).catch(() => {})
  },

  signedUrl(publicId) {
    // Access is authorised per request by /api/files, so no signature is needed.
    return `/api/files/${publicId}`
  },
}

/** Whether this publicId refers to a file on the local volume. */
export function existsOnDisk(publicId: string) {
  return existsSync(path.join(UPLOAD_ROOT, publicId))
}

/** Confirms the upload directory is present and writable. */
export async function ensureUploadRoot() {
  await mkdir(UPLOAD_ROOT, { recursive: true })
  return UPLOAD_ROOT
}
