import { createHash } from 'node:crypto'
import { diskStorage, existsOnDisk } from './storage-disk'

/**
 * File storage behind a narrow interface.
 *
 * The default driver writes to a mounted volume (see storage-disk.ts), which is
 * what the Dokploy deployment uses. Cloudinary remains available for anyone who
 * would rather offload files to a CDN — set STORAGE_DRIVER=cloudinary and the
 * CLOUDINARY_* variables.
 */
export type StoredFile = {
  url: string
  publicId: string
  bytes: number
  format: string
}

export interface FileStorage {
  upload(file: File, folder: string): Promise<StoredFile>
  remove(publicId: string): Promise<void>
  /** A URL the browser can fetch for a private asset. */
  signedUrl(publicId: string, expiresInSeconds?: number): string
}

export type StorageDriver = 'disk' | 'cloudinary'

export function storageDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === 'cloudinary' ? 'cloudinary' : 'disk'
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
    )
  }
  return { cloudName, apiKey, apiSecret }
}

/**
 * Whether uploads can succeed. Disk storage is always ready — the directory is
 * created on demand — so this only has to check Cloudinary's credentials.
 */
export function isStorageConfigured() {
  if (storageDriver() === 'disk') return true
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  )
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}

const cloudinaryStorage: FileStorage = {
  async upload(file, folder) {
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
    const timestamp = Math.floor(Date.now() / 1000)

    // `type: authenticated` keeps KYC documents and salary slips off the public
    // CDN — they are only reachable through a signed URL.
    const signature = sign({ folder, timestamp, type: 'authenticated' }, apiSecret)

    const body = new FormData()
    body.set('file', file)
    body.set('folder', folder)
    body.set('timestamp', String(timestamp))
    body.set('type', 'authenticated')
    body.set('api_key', apiKey)
    body.set('signature', signature)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body,
    })

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed (${response.status}): ${await response.text()}`)
    }

    const json = (await response.json()) as {
      secure_url: string
      public_id: string
      bytes: number
      format?: string
    }

    return {
      url: json.secure_url,
      publicId: json.public_id,
      bytes: json.bytes,
      format: json.format ?? 'raw',
    }
  },

  async remove(publicId) {
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = sign({ public_id: publicId, timestamp, type: 'authenticated' }, apiSecret)

    const body = new FormData()
    body.set('public_id', publicId)
    body.set('timestamp', String(timestamp))
    body.set('type', 'authenticated')
    body.set('api_key', apiKey)
    body.set('signature', signature)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body,
    })
    if (!response.ok) throw new Error(`Cloudinary delete failed (${response.status})`)
  },

  signedUrl(publicId, expiresInSeconds = 300) {
    const { cloudName, apiSecret } = cloudinaryConfig()
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
    const signature = createHash('sha1')
      .update(`${expiresAt}${publicId}${apiSecret}`)
      .digest('base64url')
      .slice(0, 32)
    return `https://res.cloudinary.com/${cloudName}/image/authenticated/s--${signature}--/${publicId}`
  },
}

export const storage: FileStorage = {
  async upload(file, folder) {
    if (storageDriver() === 'disk') return diskStorage.upload(file, folder)

    try {
      return await cloudinaryStorage.upload(file, folder)
    } catch (error) {
      // Outside production, bad credentials should not block local work.
      if (process.env.NODE_ENV === 'production') throw error
      console.warn(
        `[storage] Cloudinary upload failed, falling back to disk. Run "pnpm check:cloudinary" to diagnose.\n  ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return diskStorage.upload(file, folder)
    }
  },

  // Files written before a driver change keep working: anything present on the
  // volume is always served from there.
  remove: (publicId) => resolve(publicId).remove(publicId),
  signedUrl: (publicId, expiresIn) => resolve(publicId).signedUrl(publicId, expiresIn),
}

function resolve(publicId?: string): FileStorage {
  if (publicId && existsOnDisk(publicId)) return diskStorage
  return storageDriver() === 'cloudinary' ? cloudinaryStorage : diskStorage
}

export const UPLOAD_LIMITS = {
  slip: { maxBytes: 5 * 1024 * 1024, accept: ['application/pdf', 'image/jpeg', 'image/png'] },
  kyc: { maxBytes: 5 * 1024 * 1024, accept: ['application/pdf', 'image/jpeg', 'image/png'] },
  photo: { maxBytes: 2 * 1024 * 1024, accept: ['image/jpeg', 'image/png'] },
} as const

export function validateUpload(
  file: File,
  limit: (typeof UPLOAD_LIMITS)[keyof typeof UPLOAD_LIMITS],
): string | null {
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > limit.maxBytes) {
    return `File is too large. Maximum ${Math.round(limit.maxBytes / (1024 * 1024))} MB.`
  }
  if (!limit.accept.includes(file.type as never)) {
    return `Unsupported file type. Allowed: ${limit.accept.join(', ')}.`
  }
  return null
}
