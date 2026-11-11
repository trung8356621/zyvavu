import {
  fromLoopItemRecord,
  normalizeCategoryDoc,
  normalizePostDoc,
  resolveItemBinding,
  taxonomyDisplayText,
  type ItemBindingKey,
  type ItemMediaReference,
  type NormalizedItem,
} from './normalized-item'
import { formatPostDate } from './post-records'
import type { LoopItemRecord, ThemeDataContext } from './types'

export type AtomBindingProps = {
  /** Dynamic text source; omit/empty = static `text` prop. */
  textBinding?: ItemBindingKey | '' | null
  /** Dynamic href/url source; omit/empty = static `href` prop. */
  hrefBinding?: ItemBindingKey | '' | null
  /** Dynamic image/media source; omit/empty = static `src` prop. */
  srcBinding?: ItemBindingKey | '' | null
}

/** True when a binding select is set to a dynamic field (not Static/empty). */
export function isActiveItemBinding(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Hide static content fields that are superseded by an active dynamic binding.
 * Does not clear stored static props — Static ↔ Dynamic restores prior values.
 */
export function applyBindingFieldVisibility<T extends Record<string, unknown>>(
  fields: T,
  props: AtomBindingProps,
): T {
  const next: Record<string, unknown> = { ...fields }
  if (isActiveItemBinding(props.textBinding) && 'text' in next) {
    delete next.text
  }
  if (isActiveItemBinding(props.srcBinding) && 'src' in next) {
    delete next.src
  }
  return next as T
}

/** Shared labels — resolve against Item or Document from current render scope. */
export const TEXT_BINDING_OPTIONS: { label: string; value: string }[] = [
  { label: 'Static', value: '' },
  { label: 'Title', value: 'title' },
  { label: 'Excerpt', value: 'excerpt' },
  { label: 'Slug', value: 'slug' },
  { label: 'Taxonomy', value: 'taxonomy' },
  { label: 'Date', value: 'date' },
]

export const URL_BINDING_OPTIONS: { label: string; value: string }[] = [
  { label: 'Static', value: '' },
  { label: 'URL', value: 'url' },
]

export const MEDIA_BINDING_OPTIONS: { label: string; value: string }[] = [
  { label: 'Static', value: '' },
  { label: 'Thumbnail / Featured image', value: 'thumbnail' },
]

/**
 * Prefer Loop Item record when present (Collection Loop / Loop Item Template).
 * Otherwise normalize the current document / archive (Single, Page, Category).
 * Never fall through from an item-scoped render to the outer page document.
 */
export function recordFromDataContext(
  dataContext?: ThemeDataContext | null,
): NormalizedItem | null {
  if (!dataContext) return null

  if (dataContext.item) {
    return fromLoopItemRecord(dataContext.item, dataContext.item.type || 'post')
  }

  if (dataContext.type === 'category' || dataContext.archive) {
    const fromArchive = {
      id: dataContext.document?.id ?? null,
      title: dataContext.archive?.title || dataContext.document?.title,
      name: dataContext.document?.title || dataContext.archive?.title,
      slug: dataContext.document?.slug,
      description: dataContext.archive?.description || dataContext.document?.description,
      excerpt: dataContext.document?.excerpt,
      thumbnail: dataContext.document?.thumbnail,
      canonicalPath: dataContext.document?.canonicalPath,
      updatedAt: dataContext.document?.updatedAt,
      createdAt: dataContext.document?.createdAt,
    }
    return normalizeCategoryDoc(fromArchive)
  }

  if (dataContext.document) {
    return normalizePostDoc(dataContext.document)
  }

  return null
}

/** @deprecated Use recordFromDataContext — kept for call-site compatibility. */
export function itemFromDataContext(
  dataContext?: ThemeDataContext | null,
): NormalizedItem | null {
  return recordFromDataContext(dataContext)
}

function asText(value: unknown, key?: string | null): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    if (key === 'date') return formatPostDate(value) || null
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (Array.isArray(value)) return taxonomyDisplayText(value as any)
  return null
}

function asHref(value: unknown): string | null {
  const text = asText(value)
  if (!text || text === '#') return null
  return text
}

function asMedia(value: unknown): ItemMediaReference | null {
  if (!value || typeof value !== 'object') return null
  const media = value as ItemMediaReference
  if (!media.url || !String(media.url).trim()) return null
  return media
}

/**
 * Resolve atom presentation from static props + optional dynamic bindings.
 * Missing bound values → omit: true (no empty element).
 */
export function resolveAtomBindings(
  props: AtomBindingProps & {
    text?: string
    href?: string
    src?: string
    alt?: string
  },
  record: NormalizedItem | null | undefined,
): {
  omit: boolean
  text?: string
  href?: string
  src?: string
  alt?: string
} {
  const hasTextBinding = isActiveItemBinding(props.textBinding)
  const hasHrefBinding = isActiveItemBinding(props.hrefBinding)
  const hasSrcBinding = isActiveItemBinding(props.srcBinding)

  let text = props.text
  let href = props.href
  let src = props.src
  let alt = props.alt

  if (hasTextBinding) {
    const bound = resolveItemBinding(record, props.textBinding)
    const resolved = asText(bound, props.textBinding)
    if (resolved == null) return { omit: true }
    text = resolved
  }

  if (hasHrefBinding) {
    const bound = resolveItemBinding(record, props.hrefBinding)
    const resolved = asHref(bound)
    if (resolved == null) return { omit: true }
    href = resolved
  }

  if (hasSrcBinding) {
    const bound = resolveItemBinding(record, props.srcBinding)
    const media = asMedia(bound)
    if (!media) return { omit: true }
    src = media.url
    if (!alt && media.alt) alt = media.alt
  }

  return { omit: false, text, href, src, alt }
}

export function withItemOnContext(
  dataContext: ThemeDataContext | undefined,
  record: LoopItemRecord,
): ThemeDataContext {
  return {
    ...(dataContext || { type: 'home' }),
    item: record,
  }
}
