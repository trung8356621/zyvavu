import { sanitizeHref } from '@/components/builder/inline-edit/content-model'
import { getLucideCatalog } from '@/lib/icons/catalog'
import { isCustomIconName } from '@/lib/icons/custom-icons'
import type { IconRef } from '@/lib/icons/types'
import {
  isEmailSyntacticallyValid,
  isPhoneSyntacticallyValid,
} from '@/components/builder/inline-edit/link-editor-model'

/** Stable auto-link semantics — not a general-purpose type dropdown. */
export type ContactSemantics = 'phone' | 'email'

export type ContactEntry = {
  /** Stable internal ID referenced by widgets. Independent of editable key. */
  entryId: string
  key: string
  value: string
  /** Optional destination URL. When set (and no phone/email semantics), value renders as a link. */
  link?: string | null
  semantics?: ContactSemantics | null
  icon?: IconRef | null
  order: number
}

export type ContactDisplayPreset = 'vertical' | 'inline' | 'cards'

export const CONTACT_DISPLAY_PRESETS: { value: ContactDisplayPreset; label: string }[] = [
  { value: 'vertical', label: 'Vertical List' },
  { value: 'inline', label: 'Inline List' },
  { value: 'cards', label: 'Contact Cards' },
]

/** Sensible sample entries for new installs only. Not required fields. */
export const SAMPLE_CONTACT_ENTRIES: Array<Omit<ContactEntry, 'order'>> = [
  {
    entryId: 'contact-phone',
    key: 'Hotline',
    value: '+84 1900 8888',
    link: null,
    semantics: 'phone',
  },
  {
    entryId: 'contact-email',
    key: 'Email',
    value: 'hello@zyvavu.test',
    link: null,
    semantics: 'email',
  },
  {
    entryId: 'contact-address',
    key: 'Address',
    value: '123 Nguyen Hue, Dist. 1, Ho Chi Minh City',
    link: null,
    semantics: null,
  },
  {
    entryId: 'contact-facebook',
    key: 'Facebook',
    value: 'Zyvavu on Facebook',
    link: 'https://facebook.com/zyvavu',
    semantics: null,
  },
]

export function createContactEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `contact-${crypto.randomUUID()}`
  }
  return `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function ensureContactEntryId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return createContactEntryId()
}

/** Validate optional Link field; empty is allowed. Rejects unsafe schemes. */
export function validateContactLink(value: unknown): true | string {
  if (value == null || value === '') return true
  if (typeof value !== 'string') return 'Link must be a URL string.'
  const trimmed = value.trim()
  if (!trimmed) return true
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return 'Unsafe URL scheme is not allowed.'
  }
  const safe = sanitizeHref(trimmed)
  if (!safe) return 'Enter a safe http(s), relative, mailto, or tel URL.'
  return true
}

export function validateContactEntryFields(input: {
  key?: unknown
  value?: unknown
  link?: unknown
  semantics?: unknown
}): true | string {
  const key = typeof input.key === 'string' ? input.key.trim() : ''
  const value = typeof input.value === 'string' ? input.value.trim() : ''
  if (!key) return 'Key (label) is required.'
  if (!value) return 'Value is required.'

  const semantics =
    input.semantics === 'phone' || input.semantics === 'email' ? input.semantics : null

  if (semantics === 'phone' && !isPhoneSyntacticallyValid(value)) {
    return 'Enter a valid phone number for Phone auto-link.'
  }
  if (semantics === 'email' && !isEmailSyntacticallyValid(value)) {
    return 'Enter a valid email address for Email auto-link.'
  }

  const linkResult = validateContactLink(input.link)
  if (linkResult !== true) return linkResult
  return true
}

export function normalizeContactSemantics(value: unknown): ContactSemantics | null {
  return value === 'phone' || value === 'email' ? value : null
}

const lucideIconNames = new Set(getLucideCatalog().icons.map(({ name }) => name))

export function normalizeContactIcon(value: unknown): IconRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const { source, name, mediaId, mediaUrl, mediaFilename, recolorable } = value as Record<string, unknown>
  if (
    typeof name === 'string' &&
    ((source === 'lucide' && lucideIconNames.has(name)) ||
      (source === 'custom' && isCustomIconName(name)))
  ) {
    return { source: source as 'lucide' | 'custom', name, recolorable: recolorable !== false }
  }
  if (source !== 'media' || typeof mediaUrl !== 'string') return null
  if (!((typeof mediaId === 'number' && Number.isSafeInteger(mediaId) && mediaId > 0) ||
        (typeof mediaId === 'string' && mediaId.trim()))) return null
  if (!/^\/(?![/\\])|^https?:\/\//i.test(mediaUrl) || /[\s\\]/.test(mediaUrl)) return null
  return {
    source,
    mediaId,
    mediaUrl,
    ...(typeof mediaFilename === 'string' ? { mediaFilename } : {}),
    recolorable: false,
  }
}

export function normalizeContactEntries(raw: unknown): ContactEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ContactEntry[] = []
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i]
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const key = typeof record.key === 'string' ? record.key.trim() : ''
    const value = typeof record.value === 'string' ? record.value.trim() : ''
    if (!key || !value) continue

    const linkRaw = typeof record.link === 'string' ? record.link.trim() : ''
    const linkSafe = linkRaw ? sanitizeHref(linkRaw) : null
    const order =
      typeof record.order === 'number' && Number.isFinite(record.order) ? record.order : i
    const icon = normalizeContactIcon(record.icon)

    out.push({
      entryId: ensureContactEntryId(record.entryId),
      key,
      value,
      link: linkSafe,
      semantics: normalizeContactSemantics(record.semantics),
      ...(icon ? { icon } : {}),
      order,
    })
  }
  return out.sort((a, b) => a.order - b.order || a.entryId.localeCompare(b.entryId))
}

export function buildTelHref(value: string): string | null {
  const trimmed = value.trim()
  if (!isPhoneSyntacticallyValid(trimmed)) return null
  const digits = trimmed.replace(/[^\d+]/g, '')
  if (!digits) return null
  return `tel:${digits}`
}

export function buildMailtoHref(value: string): string | null {
  const trimmed = value.trim()
  if (!isEmailSyntacticallyValid(trimmed)) return null
  return `mailto:${trimmed}`
}

/**
 * Resolve clickable href for a contact entry.
 * Phone/email use stable semantics (not the editable key).
 * Otherwise optional Link is used when present and safe.
 */
export function resolveContactHref(entry: Pick<ContactEntry, 'value' | 'link' | 'semantics'>): string | null {
  if (entry.semantics === 'phone') return buildTelHref(entry.value)
  if (entry.semantics === 'email') return buildMailtoHref(entry.value)
  if (entry.link) return sanitizeHref(entry.link)
  return null
}

/**
 * Resolve widget-selected entries by stable IDs.
 * Missing/deleted IDs are skipped (graceful degradation).
 * Widget order is preserved.
 */
export function selectContactEntries(
  all: ContactEntry[],
  entryIds: string[] | null | undefined,
): ContactEntry[] {
  if (!Array.isArray(entryIds) || entryIds.length === 0) return []
  const byId = new Map(all.map((entry) => [entry.entryId, entry]))
  const selected: ContactEntry[] = []
  for (const id of entryIds) {
    const entry = byId.get(id)
    if (entry) selected.push(entry)
  }
  return selected
}

export function sampleContactEntryIds(): string[] {
  return SAMPLE_CONTACT_ENTRIES.map((entry) => entry.entryId)
}

export function sampleContactEntriesWithOrder(): ContactEntry[] {
  return SAMPLE_CONTACT_ENTRIES.map((entry, index) => ({ ...entry, order: index }))
}
