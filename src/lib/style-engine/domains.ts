import { getComponentStyleCapabilities } from './capabilities'
export type StyleModalDomain =
  | 'animation'
  | 'background'
  | 'spacing'
  | 'borders'
  | 'typography'
  | 'shadow'
  | 'effects'
  | 'button'
export const STYLE_MODAL_TITLES: Record<StyleModalDomain, string> = {
  animation: 'Animation',
  background: 'Background',
  spacing: 'Layout',
  borders: 'Borders',
  typography: 'Typography',
  shadow: 'Shadow',
  effects: 'Effects',
  button: 'Button Design',
}

/**
 * Domains owned by native Puck Fields for a widget — excluded from Style Sidebar
 * to avoid duplicate controls. Capabilities/serializer remain unchanged.
 */
export const FIELDS_OWNED_STYLE_DOMAINS: Partial<Record<string, StyleModalDomain[]>> = {
  Heading: ['typography'],
  Text: ['typography'],
  // Document Title is a Heading wrapper — same Fields-owned typography.
  DocumentTitle: ['typography'],
  CategoryTitle: ['typography'],
  PostTitle: ['typography'],
}

/** Stable toolbar order for primary style entry points (overflow for the rest). */
export const PRIMARY_STYLE_TOOLBAR_DOMAINS: StyleModalDomain[] = [
  'animation',
  'background',
  'spacing',
  'borders',
]

export function orderStyleToolbarDomains(domains: StyleModalDomain[]): StyleModalDomain[] {
  // Atom-focused editors surface first (Button Design before generic domains).
  const focusFirst = (['button'] as StyleModalDomain[]).filter((d) => domains.includes(d))
  const primary = PRIMARY_STYLE_TOOLBAR_DOMAINS.filter(
    (d) => domains.includes(d) && !focusFirst.includes(d),
  )
  const rest = domains.filter(
    (d) => !PRIMARY_STYLE_TOOLBAR_DOMAINS.includes(d) && !focusFirst.includes(d),
  )
  return [...focusFirst, ...primary, ...rest]
}

export function getStyleModalDomains(type: string, variant?: string): StyleModalDomain[] {
  const capabilities = getComponentStyleCapabilities(type, undefined, { variant })
  // Button Design owns Normal/Hover chrome — do not also expose Background/Borders docks.
  if (type === 'Button' || capabilities.includes('button')) {
    const buttonDomains: StyleModalDomain[] = ['button', 'spacing', 'animation']
    if (capabilities.includes('effects')) buttonDomains.push('effects')
    return buttonDomains
  }
  // Image/Video appearance props live in Widget Settings; Style dock is chrome only.
  if (type === 'Image' || type === 'Video') {
    const mediaDomains: StyleModalDomain[] = ['spacing', 'borders', 'animation']
    if (capabilities.includes('shadow')) mediaDomains.push('shadow')
    if (capabilities.includes('effects')) mediaDomains.push('effects')
    return mediaDomains
  }
  const domains: StyleModalDomain[] = ['animation', 'background', 'spacing', 'borders']
  if (type === 'Section') return domains
  if (capabilities.includes('typography')) domains.push('typography')
  if (capabilities.includes('shadow')) domains.push('shadow')
  if (capabilities.includes('effects')) domains.push('effects')
  const owned = new Set(FIELDS_OWNED_STYLE_DOMAINS[type] || [])
  return domains.filter((domain) => !owned.has(domain))
}
export function resetStyleDomain<T extends object>(style: T, domain: StyleModalDomain): T {
  const fields: Record<StyleModalDomain, string[]> = {
    animation: ['animation'],
    background: ['background', 'backgroundToken'],
    spacing: ['spacing', 'dimensions', 'section'],
    borders: ['border', 'radius'],
    typography: ['typography', 'colorToken', 'align'],
    shadow: ['shadow'],
    effects: ['effects'],
    button: ['button', 'typography', 'colorToken', 'align'],
  }
  const next = { ...style } as T & Record<string, unknown>
  for (const field of fields[domain]) delete next[field]
  return next
}

/** Accordion subgroups inside a focused style domain (not cross-domain). */
export type StyleDomainGroup =
  | 'spacing'
  | 'dimensions'
  | 'alignment'
  | 'border'
  | 'radius'
  | 'surface'
  | 'pattern'
  | 'media'

/**
 * Reset one Accordion group inside the active domain.
 * Does not clear sibling groups or unrelated domains.
 */
export function resetStyleGroup<T extends object>(style: T, group: StyleDomainGroup): T {
  const next = { ...(style as T & Record<string, unknown>) } as T & Record<string, any>
  if (group === 'spacing') {
    delete next.spacing
    return next
  }
  if (group === 'dimensions') {
    if (next.dimensions) {
      const { containerWidth: _w, minHeight: _h, ...rest } = next.dimensions
      next.dimensions = Object.keys(rest).length ? rest : undefined
      if (!next.dimensions) delete next.dimensions
    }
    delete next.section
    return next
  }
  if (group === 'alignment') {
    if (next.dimensions) {
      const { align: _a, ...rest } = next.dimensions
      next.dimensions = Object.keys(rest).length ? rest : undefined
      if (!next.dimensions) delete next.dimensions
    }
    return next
  }
  if (group === 'border') {
    delete next.border
    return next
  }
  if (group === 'radius') {
    delete next.radius
    return next
  }
  if (group === 'surface' || group === 'pattern' || group === 'media') {
    const bg = { ...(next.background || {}) }
    if (group === 'surface') {
      delete bg.mode
      delete bg.colorToken
      delete bg.gradient
      delete bg.mesh
      delete next.backgroundToken
    } else if (group === 'pattern') {
      delete bg.pattern
      if (bg.image) {
        const { pattern: _p, ...imageRest } = bg.image
        bg.image = imageRest
      }
    } else {
      delete bg.image
      delete bg.video
      if (bg.mode === 'image' || bg.mode === 'video') bg.mode = 'color'
    }
    const keys = Object.keys(bg).filter((k) => bg[k] !== undefined)
    if (keys.length) next.background = bg
    else delete next.background
    return next
  }
  return next
}

