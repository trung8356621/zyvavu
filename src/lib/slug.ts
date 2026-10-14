import { resolvePostPath } from './permalinks'

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function pathForPageSlug(slug: string): string {
  return slug === 'home' ? '/' : `/${slug}`
}

export function pathForPostSlug(slug: string, structure?: string): string {
  if (structure) {
    return resolvePostPath(structure, slug)
  }
  return `/posts/${slug}`
}
