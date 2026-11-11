import type { IconCatalogEntry } from './types'

/**
 * Built-in custom SVG icons required by DEC-MEDIA-002 (Zalo) and brand artwork.
 * Paths use currentColor so Style Engine color tokens can recolor them.
 */
export const CUSTOM_ICON_SVGS: Record<string, string> = {
  zalo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path fill="currentColor" d="M12 2.2c-5.4 0-9.8 3.9-9.8 8.7 0 2.7 1.4 5.1 3.6 6.7v3.5l3.3-1.8c.9.2 1.9.4 2.9.4 5.4 0 9.8-3.9 9.8-8.7S17.4 2.2 12 2.2z"/>
  <path fill="#fff" d="M7.2 9.4h9.1v1.4H7.2V9.4zm0 3.1h6.4v1.4H7.2v-1.4z"/>
</svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M14 21v-8h2.8l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H8v3h2.6v8z"/>
</svg>`,
}

export const CUSTOM_ICON_CATALOG: IconCatalogEntry[] = [
  {
    name: 'facebook',
    label: 'Facebook',
    source: 'custom',
    tags: ['facebook', 'social', 'brand'],
    categories: ['social'],
  },
  {
    name: 'zalo',
    label: 'Zalo',
    source: 'custom',
    tags: ['zalo', 'chat', 'vietnam', 'social', 'messaging'],
    categories: ['social', 'communication'],
  },
]

export function getCustomIconSvg(name: string): string | null {
  return CUSTOM_ICON_SVGS[name] || null
}

export function isCustomIconName(name?: string | null): boolean {
  return Boolean(name && Object.hasOwn(CUSTOM_ICON_SVGS, name))
}
