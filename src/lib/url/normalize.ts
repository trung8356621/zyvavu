const RESERVED_EXACT = new Set([
  '/admin',
  '/api',
  '/posts',
  '/_next',
  '/offline.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon.ico',
  '/icon.png',
])

export function normalizePath(input: string): string {
  let value = input.trim()
  if (!value || value.includes('?') || value.includes('#') || value.includes('\\')) {
    throw new Error('Invalid public path')
  }
  try {
    value = decodeURIComponent(value)
  } catch {
    throw new Error('Invalid public path')
  }
  if (!value.startsWith('/')) value = `/${value}`
  value = value.replace(/\/+/g, '/')
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1)
  value = value.toLowerCase()
  if (value.split('/').some((part) => part === '' ? false : part === '.' || part === '..')) {
    throw new Error('Invalid public path')
  }
  return value
}

export function isReservedPath(path: string): boolean {
  if (RESERVED_EXACT.has(path)) return true
  return path.startsWith('/admin/') || path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/icons/')
}
