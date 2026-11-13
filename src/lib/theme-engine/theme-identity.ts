import { slugify } from '@/lib/slug'

/** Theme ID from Theme Name — accent-free lowercase URL slug. No numeric suffixes. */
export function themeIdFromName(name: string): string {
  const id = slugify(name.trim())
  if (!id) {
    throw new Error('Theme Name does not produce a valid Theme ID slug.')
  }
  return id
}

export function assertThemeName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Theme Name is required.')
  }
  return name.trim()
}
