/** Website Type metadata for Create Theme. Does not fork Theme Engine / Puck / widgets. */

export const WEBSITE_TYPES = ['editorial', 'corporate', 'commerce'] as const

export type WebsiteType = (typeof WEBSITE_TYPES)[number]

export type WebsiteTypeOption = {
  value: WebsiteType
  label: string
  purpose: string
}

export const WEBSITE_TYPE_OPTIONS: WebsiteTypeOption[] = [
  {
    value: 'editorial',
    label: 'Blog / Editorial',
    purpose: 'Blog, news, magazines, publishing.',
  },
  {
    value: 'corporate',
    label: 'Corporate / Business',
    purpose: 'Companies, services, business websites.',
  },
  {
    value: 'commerce',
    label: 'Commerce / Store',
    purpose: 'Stores, product-oriented websites.',
  },
]

export const DEFAULT_WEBSITE_TYPE: WebsiteType = 'corporate'

/** Safe UI fallback for missing/invalid stored values. Does not rewrite persisted data. */
export function normalizeWebsiteType(value: unknown): WebsiteType {
  if (typeof value === 'string' && (WEBSITE_TYPES as readonly string[]).includes(value)) {
    return value as WebsiteType
  }
  return DEFAULT_WEBSITE_TYPE
}

export function isWebsiteType(value: unknown): value is WebsiteType {
  return typeof value === 'string' && (WEBSITE_TYPES as readonly string[]).includes(value)
}

export function websiteTypeLabel(type: WebsiteType): string {
  return WEBSITE_TYPE_OPTIONS.find((option) => option.value === type)?.label || type
}

/** Design-context hints for Theme Customize prompts (not fixed palettes). */
export function websiteTypeCustomizeGuidance(type: WebsiteType): string {
  switch (type) {
    case 'editorial':
      return 'Reading-focused typography and clear content hierarchy. Prefer long-form readability over dense marketing chrome.'
    case 'corporate':
      return 'Professional branding with services and trust cues. Keep layouts clean and business-appropriate.'
    case 'commerce':
      return 'Product presentation, imagery, and CTA hierarchy. Emphasize scannable merchandising without inventing commerce backends.'
  }
}

/** Suggested page requirements for Theme Builder prompts (not auto-created). */
export function websiteTypeBuilderSuggestions(type: WebsiteType): string {
  switch (type) {
    case 'editorial':
      return [
        'Suggested templates (only if required / Stage 0 READY): Home, Single Post, Category, Loop Item, Header, Footer.',
        'Prioritize reading flows and listing loops over marketing landers.',
      ].join('\n')
    case 'corporate':
      return [
        'Suggested templates (only if required / Stage 0 READY): Home, About, Services, Contact, Header, Footer.',
        'Prioritize services and trust pages over catalog/checkout flows.',
      ].join('\n')
    case 'commerce':
      return [
        'Suggested templates (only if required / Stage 0 READY): Home, Catalog-oriented layouts, Product-oriented layouts, CTA sections, Header, Footer.',
        'Do NOT assume Products collection, Cart, Checkout, or Payment exist.',
        'If those backends are missing, report them as UNSUPPORTED — never silently simulate them as complete.',
      ].join('\n')
  }
}
