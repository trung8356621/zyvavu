/**
 * Shared normalized item contract for Collection Loop / Loop Item Template binding.
 * Adapts Post / Category / (optional Product) docs without renaming DB columns.
 */

export type ItemMediaReference = {
  url: string
  alt?: string
  width?: number
  height?: number
  mediaId?: string | number
}

export type TaxonomyReference = {
  id?: string | number
  title: string
  slug?: string
  url?: string
}

export type NormalizedItem = {
  id: string | number | null
  type: string
  title: string | null
  excerpt: string | null
  thumbnail: ItemMediaReference | null
  url: string | null
  slug: string | null
  taxonomy: TaxonomyReference[] | null
  date: string | null
  raw?: unknown
}

export type ItemBindingKey =
  | 'title'
  | 'excerpt'
  | 'slug'
  | 'url'
  | 'thumbnail'
  | 'taxonomy'
  | 'date'

/** Product adapter stays disabled until a real Products collection exists. */
export function isProductSchemaSupported(): boolean {
  return false
}

function asMedia(doc: unknown): ItemMediaReference | null {
  if (!doc || typeof doc !== 'object') {
    if (typeof doc === 'string' && doc.trim()) {
      return { url: doc.startsWith('/') || doc.startsWith('http') ? doc : `/api/media/file/${doc}` }
    }
    return null
  }
  const media = doc as Record<string, any>
  const url =
    typeof media.url === 'string' && media.url.trim()
      ? media.url
      : media.id != null
        ? `/api/media/file/${media.filename || media.id}`
        : null
  if (!url) return null
  return {
    url,
    alt: typeof media.alt === 'string' ? media.alt : undefined,
    width: typeof media.width === 'number' ? media.width : undefined,
    height: typeof media.height === 'number' ? media.height : undefined,
    mediaId: media.id,
  }
}

function mapTaxonomy(list: unknown): TaxonomyReference[] | null {
  if (!Array.isArray(list) || list.length === 0) return null
  const refs: TaxonomyReference[] = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, any>
    const title = row.title || row.name
    if (!title) continue
    refs.push({
      id: row.id,
      title: String(title),
      slug: row.slug ? String(row.slug) : undefined,
      url: row.canonicalPath || row.url || undefined,
    })
  }
  return refs.length ? refs : null
}

export function normalizePostDoc(doc: any): NormalizedItem {
  if (!doc || typeof doc !== 'object') {
    return {
      id: null,
      type: 'post',
      title: null,
      excerpt: null,
      thumbnail: null,
      url: null,
      slug: null,
      taxonomy: null,
      date: null,
    }
  }

  const featured =
    typeof doc.featuredMedia === 'object'
      ? doc.featuredMedia
      : typeof doc.featuredImage === 'object'
        ? doc.featuredImage
        : typeof doc.heroImage === 'object'
          ? doc.heroImage
          : typeof doc.image === 'object'
            ? doc.image
            : typeof doc.media === 'object'
              ? doc.media
              : typeof doc.featuredMedia === 'string' || typeof doc.featuredMedia === 'number'
                ? doc.featuredMedia
                : typeof doc.featuredImage === 'string' || typeof doc.image === 'string'
                  ? doc.featuredImage || doc.image
                  : null

  const taxonomy = mapTaxonomy(doc.categories) || mapTaxonomy(doc.tags)

  return {
    id: doc.id ?? null,
    type: 'post',
    title: doc.title != null && String(doc.title).trim() ? String(doc.title) : null,
    excerpt: doc.excerpt != null && String(doc.excerpt).trim() ? String(doc.excerpt) : null,
    thumbnail: asMedia(featured),
    url:
      doc.canonicalPath ||
      doc.canonicalUrl ||
      doc.url ||
      doc.publicPath ||
      (doc.slug ? `/posts/${doc.slug}` : doc.id != null ? `/posts/${doc.id}` : null),
    slug: doc.slug != null && String(doc.slug).trim() ? String(doc.slug) : null,
    taxonomy,
    date: doc.publishedAt || doc.createdAt || null,
    raw: doc,
  }
}

export function normalizeCategoryDoc(doc: any): NormalizedItem {
  if (!doc || typeof doc !== 'object') {
    return {
      id: null,
      type: 'category',
      title: null,
      excerpt: null,
      thumbnail: null,
      url: null,
      slug: null,
      taxonomy: null,
      date: null,
    }
  }

  const title = doc.title || doc.name
  const excerpt = doc.description || doc.excerpt || null
  const thumb = doc.thumbnail ?? doc.image ?? null

  return {
    id: doc.id ?? null,
    type: 'category',
    title: title != null && String(title).trim() ? String(title) : null,
    excerpt: excerpt != null && String(excerpt).trim() ? String(excerpt) : null,
    thumbnail: asMedia(thumb),
    url:
      doc.canonicalPath ||
      doc.url ||
      (doc.slug ? `/category/${doc.slug}` : doc.id != null ? `/category/${doc.id}` : null),
    slug: doc.slug != null && String(doc.slug).trim() ? String(doc.slug) : null,
    taxonomy: null,
    date: doc.updatedAt || doc.createdAt || null,
    raw: doc,
  }
}

export function normalizeProductDoc(doc: any): NormalizedItem | null {
  if (!isProductSchemaSupported()) return null
  if (!doc || typeof doc !== 'object') {
    return {
      id: null,
      type: 'product',
      title: null,
      excerpt: null,
      thumbnail: null,
      url: null,
      slug: null,
      taxonomy: null,
      date: null,
    }
  }
  const title = doc.title || doc.name
  return {
    id: doc.id ?? null,
    type: 'product',
    title: title != null && String(title).trim() ? String(title) : null,
    excerpt:
      doc.description || doc.summary || doc.excerpt
        ? String(doc.description || doc.summary || doc.excerpt)
        : null,
    thumbnail: asMedia(doc.image || doc.thumbnail || doc.featuredMedia),
    url: doc.canonicalPath || doc.url || (doc.slug ? `/products/${doc.slug}` : null),
    slug: doc.slug != null ? String(doc.slug) : null,
    taxonomy: mapTaxonomy(doc.categories) || mapTaxonomy(doc.tags),
    date: doc.updatedAt || doc.createdAt || null,
    raw: doc,
  }
}

/**
 * Resolve a binding key against a normalized item.
 * Missing / unsupported → null (never undefined, never placeholder).
 */
export function resolveItemBinding(
  item: NormalizedItem | null | undefined,
  key: ItemBindingKey | string | null | undefined,
): string | ItemMediaReference | TaxonomyReference[] | null {
  if (!item || !key) return null
  switch (key) {
    case 'title':
      return item.title
    case 'excerpt':
      return item.excerpt
    case 'slug':
      return item.slug
    case 'url':
      return item.url
    case 'thumbnail':
      return item.thumbnail
    case 'taxonomy':
      return item.taxonomy
    case 'date':
      return item.date
    default:
      return null
  }
}

export function taxonomyDisplayText(
  taxonomy: TaxonomyReference[] | null | undefined,
): string | null {
  if (!taxonomy?.length) return null
  const text = taxonomy
    .map((t) => t.title)
    .filter(Boolean)
    .join(', ')
  return text || null
}

/** Bridge NormalizedItem → legacy LoopItemRecord shape used by Item* widgets. */
export function toLoopItemRecord(item: NormalizedItem): import('./types').LoopItemRecord {
  return {
    id: item.id ?? undefined,
    type: item.type,
    title: item.title ?? '',
    slug: item.slug ?? undefined,
    // Legacy Item* widgets historically used '#' for missing URLs.
    url: item.url ?? '#',
    excerpt: item.excerpt ?? '',
    date: item.date ?? undefined,
    category: item.taxonomy?.[0]?.title,
    taxonomy: item.taxonomy,
    thumbnail: item.thumbnail,
    image: item.thumbnail
      ? {
          url: item.thumbnail.url,
          alt: item.thumbnail.alt,
          width: item.thumbnail.width,
          height: item.thumbnail.height,
        }
      : undefined,
    raw: item.raw,
  }
}

export function fromLoopItemRecord(
  record: import('./types').LoopItemRecord | null | undefined,
  type = 'post',
): NormalizedItem | null {
  if (!record) return null
  const thumb =
    record.thumbnail ||
    (record.image?.url
      ? {
          url: record.image.url,
          alt: record.image.alt,
          width: record.image.width,
          height: record.image.height,
        }
      : null)
  return {
    id: record.id ?? null,
    type: record.type || type,
    title: record.title != null && String(record.title).trim() ? String(record.title) : null,
    excerpt:
      record.excerpt != null && String(record.excerpt).trim() ? String(record.excerpt) : null,
    thumbnail: thumb && thumb.url ? thumb : null,
    url: record.url != null && String(record.url).trim() && record.url !== '#' ? String(record.url) : null,
    slug: record.slug != null && String(record.slug).trim() ? String(record.slug) : null,
    taxonomy: record.taxonomy ?? (record.category ? [{ title: record.category }] : null),
    date: record.date ?? null,
    raw: record.raw,
  }
}
