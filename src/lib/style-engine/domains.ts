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
export function getStyleModalDomains(type: string, variant?: string): StyleModalDomain[] {
  const capabilities = getComponentStyleCapabilities(type, undefined, { variant })
  const domains: StyleModalDomain[] = ['animation', 'background', 'spacing', 'borders']
  if (type === 'Section') return domains
  if (capabilities.includes('button')) domains.push('button')
  else if (capabilities.includes('typography')) domains.push('typography')
  if (capabilities.includes('shadow')) domains.push('shadow')
  if (capabilities.includes('effects')) domains.push('effects')
  return domains
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
