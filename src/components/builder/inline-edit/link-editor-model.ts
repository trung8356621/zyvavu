/**
 * Tiptap Link Editor draft model — Wix Classic 9-destination list.
 *
 * Evidence: E66–E72, E130–E132, E192, E196–E198 (OBSERVED_WIX).
 * Screenshot / PO V2 order: None, Page, Web Address, Section/Anchor,
 * Top/Bottom, Document, Email, Phone, Popup/Lightbox.
 *
 * Enabled only where Zyvavu already has registries/pickers or pure
 * protocol links. Unsupported destinations stay visible but cannot Apply.
 */

export const LINK_REL_OPTIONS = ['noopener', 'noreferrer', 'nofollow', 'sponsored'] as const
export type LinkRelValue = (typeof LINK_REL_OPTIONS)[number]

export const LINK_DESTINATIONS = [
  'none',
  'page',
  'web',
  'section',
  'edge',
  'document',
  'email',
  'phone',
  'popup',
] as const

export type LinkDestination = (typeof LINK_DESTINATIONS)[number]

/** @deprecated use LINK_DESTINATIONS */
export const VERIFIED_LINK_DESTINATIONS = ['none', 'page', 'web', 'email', 'phone'] as const
export type VerifiedLinkDestination = (typeof VERIFIED_LINK_DESTINATIONS)[number]

export const LINK_DESTINATION_LABELS: Record<LinkDestination, string> = {
  none: 'None',
  page: 'Page',
  web: 'Web address',
  section: 'Section / Anchor',
  edge: 'Top / Bottom',
  document: 'Document',
  email: 'Email',
  phone: 'Phone',
  popup: 'Popup / Lightbox',
}

export type LinkDestinationSupport = {
  enabled: boolean
  /** Short unobtrusive reason when disabled — never invent backend. */
  unavailableReason?: string
}

/**
 * Capability audit (no invented backends):
 * - page → MenuTargetSelector + /api/pages
 * - web/email/phone/none → protocol fields + sanitizeHref
 * - section → no canvas/section-anchor registry or picker
 * - edge → no verified top/bottom page anchors in public templates
 * - document → MediaSourcePicker is image|video only (no file/document kind)
 * - popup → no lightbox/popup link runtime in Zyvavu
 */
export const LINK_DESTINATION_SUPPORT: Record<LinkDestination, LinkDestinationSupport> = {
  none: { enabled: true },
  page: { enabled: true },
  web: { enabled: true },
  section: {
    enabled: false,
    unavailableReason: 'No section/anchor registry or picker yet.',
  },
  edge: {
    enabled: false,
    unavailableReason: 'No verified top/bottom page anchors yet.',
  },
  document: {
    enabled: false,
    unavailableReason: 'Media picker has no document/file kind yet.',
  },
  email: { enabled: true },
  phone: { enabled: true },
  popup: {
    enabled: false,
    unavailableReason: 'No popup/lightbox destination runtime yet.',
  },
}

export type LinkEditorDraft = {
  from: number
  to: number
  destination: LinkDestination
  /** Page destination */
  pageId?: string | null
  pagePath?: string | null
  pageTitle?: string | null
  /** Web destination */
  url?: string
  /** Email destination */
  email?: string
  emailSubject?: string
  /** Phone destination */
  phone?: string
  /** Reserved for future enabled destinations — never serialized while disabled */
  sectionId?: string | null
  edge?: 'top' | 'bottom' | null
  documentUrl?: string | null
  popupId?: string | null
  /** Page + Web open mode (E131 / E67–E72) */
  target: '_self' | '_blank'
  /** SEO rel multi-select (E192 / E196–E197) */
  rel: LinkRelValue[]
}

export type LinkMarkSnapshot = {
  href?: string | null
  target?: string | null
  rel?: string | null
}

export function isDestinationEnabled(destination: LinkDestination): boolean {
  return LINK_DESTINATION_SUPPORT[destination]?.enabled === true
}

/** Default target by destination (E67–E72). */
export function defaultTargetForDestination(destination: LinkDestination): '_self' | '_blank' {
  if (destination === 'web') return '_blank'
  return '_self'
}

export function defaultRelForDestination(destination: LinkDestination): LinkRelValue[] {
  if (destination === 'web') return ['noreferrer', 'noopener']
  return []
}

export function parseRelAttribute(rel: string | null | undefined): LinkRelValue[] {
  if (!rel) return []
  const parts = rel.split(/\s+/).filter(Boolean)
  return LINK_REL_OPTIONS.filter((opt) => parts.includes(opt))
}

export function serializeRelAttribute(rel: LinkRelValue[]): string | null {
  if (!rel.length) return null
  return LINK_REL_OPTIONS.filter((opt) => rel.includes(opt)).join(' ')
}

/** Infer destination from an existing Tiptap link href. */
export function inferDestinationFromHref(href: string | null | undefined): LinkDestination {
  if (!href || !href.trim()) return 'none'
  const value = href.trim()
  if (/^mailto:/i.test(value)) return 'email'
  if (/^tel:/i.test(value)) return 'phone'
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) return 'web'
  // Bare hash would be section/edge when those ship; treat as page-relative for now.
  if (value.startsWith('/') || value.startsWith('#') || value.startsWith('?')) return 'page'
  return 'web'
}

export function createLinkDraftFromMark(
  selection: { from: number; to: number },
  mark: LinkMarkSnapshot,
): LinkEditorDraft {
  const href = mark.href || ''
  const destination = inferDestinationFromHref(href)
  const target: '_self' | '_blank' =
    mark.target === '_blank' ? '_blank' : defaultTargetForDestination(destination)
  const rel = parseRelAttribute(mark.rel)

  const base: LinkEditorDraft = {
    from: selection.from,
    to: selection.to,
    destination,
    target,
    rel: rel.length ? rel : defaultRelForDestination(destination),
    pageId: null,
    pagePath: null,
    pageTitle: null,
    url: '',
    email: '',
    emailSubject: '',
    phone: '',
    sectionId: null,
    edge: null,
    documentUrl: null,
    popupId: null,
  }

  if (destination === 'email') {
    const raw = href.replace(/^mailto:/i, '')
    const [addr, query = ''] = raw.split('?')
    const subjectMatch = query.match(/(?:^|&)subject=([^&]*)/i)
    return {
      ...base,
      email: decodeURIComponent(addr || ''),
      emailSubject: subjectMatch ? decodeURIComponent(subjectMatch[1]) : '',
    }
  }

  if (destination === 'phone') {
    return { ...base, phone: href.replace(/^tel:/i, '') }
  }

  if (destination === 'page') {
    return { ...base, pagePath: href, pageId: null, pageTitle: null }
  }

  if (destination === 'web') {
    return { ...base, url: href }
  }

  return base
}

/**
 * Accordion destination change.
 * Preserves typed fields where safe; resets page picker when leaving Page (E198).
 * Does not invent values for unsupported destinations.
 */
export function switchLinkDestination(
  draft: LinkEditorDraft,
  next: LinkDestination,
): LinkEditorDraft {
  if (draft.destination === next) return draft
  return {
    ...draft,
    destination: next,
    target: defaultTargetForDestination(next),
    rel:
      next === 'web' || next === 'page'
        ? draft.rel.length
          ? draft.rel
          : defaultRelForDestination(next)
        : draft.rel,
    // Leaving Page clears the picker (E198). Web/email/phone values stay in draft.
    pageId: next === 'page' ? draft.pageId : null,
    pagePath: next === 'page' ? draft.pagePath : null,
    pageTitle: next === 'page' ? draft.pageTitle : null,
  }
}

export function isEmailSyntacticallyValid(email: string): boolean {
  const value = email.trim()
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isPhoneSyntacticallyValid(phone: string): boolean {
  const value = phone.trim()
  if (!value) return false
  return /^\+?[\d\s().-]{3,}$/.test(value)
}

export function isWebUrlReady(url: string): boolean {
  const value = url.trim()
  if (!value) return false
  if (/^(?:javascript|data|vbscript):/i.test(value)) return false
  return /^(?:https?:\/\/|\/\/|\/|#|\?)/i.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)
}

/** Apply enablement — unsupported destinations never Apply. */
export function canApplyLinkDraft(draft: LinkEditorDraft): boolean {
  if (!isDestinationEnabled(draft.destination)) return false
  switch (draft.destination) {
    case 'none':
      return true
    case 'page':
      return Boolean(draft.pagePath?.trim() || draft.pageId)
    case 'web':
      return isWebUrlReady(draft.url || '')
    case 'email':
      return isEmailSyntacticallyValid(draft.email || '')
    case 'phone':
      return isPhoneSyntacticallyValid(draft.phone || '')
    default:
      return false
  }
}

export type ResolvedLinkMark = {
  href: string | null
  target: '_blank' | null
  rel: string | null
  unset: boolean
}

export function resolveLinkMarkFromDraft(draft: LinkEditorDraft): ResolvedLinkMark | null {
  if (!canApplyLinkDraft(draft)) return null

  if (draft.destination === 'none') {
    return { href: null, target: null, rel: null, unset: true }
  }

  let href = ''
  if (draft.destination === 'page') {
    href = (draft.pagePath || '').trim()
  } else if (draft.destination === 'web') {
    href = (draft.url || '').trim()
    if (href.startsWith('//')) href = `https:${href}`
  } else if (draft.destination === 'email') {
    const addr = (draft.email || '').trim()
    const subject = (draft.emailSubject || '').trim()
    href = subject
      ? `mailto:${addr}?subject=${encodeURIComponent(subject)}`
      : `mailto:${addr}`
  } else if (draft.destination === 'phone') {
    href = `tel:${(draft.phone || '').trim().replace(/\s+/g, '')}`
  } else {
    // Unsupported — never emit placeholder URLs.
    return null
  }

  const usesTarget = draft.destination === 'page' || draft.destination === 'web'
  return {
    href,
    target: usesTarget && draft.target === '_blank' ? '_blank' : null,
    rel: usesTarget ? serializeRelAttribute(draft.rel) : null,
    unset: false,
  }
}
