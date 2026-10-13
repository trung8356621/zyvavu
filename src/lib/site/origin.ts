export const LOCAL_HTTP_ORIGIN = 'http://zyvavu.test'
export const LOCAL_HTTPS_ORIGIN = 'https://zyvavu.test'

export function normalizeSiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password || url.search || url.hash) return null
  if (url.pathname !== '/' && url.pathname !== '') return null
  if (url.hostname === 'zyvavu.test') {
    url.protocol = 'https:'
    url.port = ''
  }
  return url.origin
}

export function canonicalPublicOrigin(value?: string | null): string {
  return normalizeSiteUrl(value) || normalizeSiteUrl(process.env.NEXT_PUBLIC_SERVER_URL) || LOCAL_HTTPS_ORIGIN
}
