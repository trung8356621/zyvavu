import type { Where } from 'payload'

export type LibraryKind = 'all' | 'image' | 'video'
export type LibraryView = LibraryKind | 'demo-image' | 'demo-video'

export function mediaKindWhere(where: Where = {}, kind: LibraryKind): Where {
  const next = { ...where }
  delete next.mimeType
  return kind === 'all' ? next : { ...next, mimeType: { contains: `${kind}/` } }
}

export function mediaLibraryURL(api: string, kind: LibraryKind, search: string, page: number) {
  const params = new URLSearchParams({
    depth: '0',
    limit: '24',
    page: String(page),
    sort: '-createdAt',
  })
  if (kind !== 'all') params.set('where[mimeType][contains]', `${kind}/`)
  if (search.trim()) params.set('where[filename][like]', search.trim())
  return `${api}/media?${params}`
}
