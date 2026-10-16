import { useAuth } from '@/context/AuthContext'
import { useSite } from '@/context/SiteContext'
import { api, ApiError } from '@/lib/api'

/** Who am I and what may I do here (from /api/site/status). */
export function useSocialPerms() {
  const { user } = useAuth()
  const { status } = useSite()
  const perms = new Set(status?.me?.permissions ?? [])
  const owner = !!status?.me?.isOwner
  return {
    me: user?.username ?? '',
    canModerate: owner || perms.has('content.moderate'),
    canFeature: owner || perms.has('content.feature'),
    socialOn: status?.flags?.social !== false,
  }
}

export const errorText = (e: unknown, fallback = 'Something went wrong') => (e instanceof ApiError ? e.message : fallback)

const MAX_BYTES = 2 * 1024 * 1024
const MAX_SIDE = 1600

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read the file'))
    r.readAsDataURL(blob)
  })
}

/**
 * Upload an image for a post or cover. Big photos are scaled to 1600px and
 * re-encoded on the device first (GIFs are sent as-is to keep animation).
 * Same limits as avatars: PNG/JPG/WebP/GIF, 2 MB after compression.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error('Use a PNG, JPG, WebP or GIF image')
  let blob: Blob = file
  if (file.type !== 'image/gif') {
    try {
      const bmp = await createImageBitmap(file)
      const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
      if (scale < 1 || file.size > 600 * 1024) {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bmp.width * scale)
        canvas.height = Math.round(bmp.height * scale)
        canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
        const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.86))
        if (out && out.size < file.size) blob = out
      }
      bmp.close()
    } catch {
      /* keep the original */
    }
  }
  if (blob.size > MAX_BYTES) throw new Error('Image too large (max 2 MB)')
  const res = await api.post<{ url: string }>('/api/social/upload', { image: await readAsDataUrl(blob) }, { timeoutMs: 60000 })
  return res.url
}

/** Copy text, falling back to a prompt-free no-op. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n))
