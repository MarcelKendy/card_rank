export type MediaKind = 'image' | 'video'

export const MEDIA_DELIM_REGEX = /\n\n|\|\|/ // supports \n\n and ||

const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v']
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']

function extOf(url: string) {
  try {
    const u = new URL(url, window.location.href)
    const pathname = u.pathname.toLowerCase()
    return pathname.slice(pathname.lastIndexOf('.')) || ''
  } catch {
    const lower = url.toLowerCase().split('?')[0]
    return lower.slice(lower.lastIndexOf('.')) || ''
  }
}

export function getMediaKind(url: string): MediaKind {
  const ext = extOf(url)
  if (VIDEO_EXTS.includes(ext)) return 'video'
  return IMAGE_EXTS.includes(ext) ? 'image' : 'image' // default to image if unknown
}

export function splitMedia(
  value?: string | null,
  max = 3
): { url: string; kind: MediaKind }[] {
  if (!value) return []
  return String(value)
    .split(MEDIA_DELIM_REGEX)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((url) => ({ url, kind: getMediaKind(url) }))
}