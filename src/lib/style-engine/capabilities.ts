import { presentationType } from '@/lib/theme-engine/widget-contracts'
import type { StyleDomain } from './types'
import type { WidgetManifest } from '@/lib/theme-engine/types'

/**
 * Built-in style capability mappings for core widgets.
 */
export const COMPONENT_STYLE_CAPABILITIES: Record<string, StyleDomain[]> = {
  Heading: ['typography'],
  Text: ['typography'],
  Button: ['typography', 'button'],
  Image: [],
  Section: [
    'section',
    'background',
    'spacing',
    'dimensions',
    'border',
    'shadow',
    'effects',
    'animation',
  ],
  Columns: ['spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  PostTitle: ['typography', 'spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  PostContent: ['typography', 'spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  PostMeta: ['typography', 'spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  TextBlock: [
    'typography',
    'background',
    'spacing',
    'dimensions',
    'border',
    'shadow',
    'effects',
    'animation',
  ],
  FeaturedMedia: ['spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  CategoryHeader: [
    'typography',
    'spacing',
    'dimensions',
    'border',
    'shadow',
    'effects',
    'animation',
  ],
  CollectionLoop: ['spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  RecentPosts: ['spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  ItemTitle: ['typography', 'spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  ItemExcerpt: ['typography', 'spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  ItemImage: ['spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  ItemLink: ['typography', 'spacing', 'dimensions', 'border', 'shadow', 'effects', 'animation'],
  HeaderAction: [
    'typography',
    'button',
    'spacing',
    'dimensions',
    'border',
    'shadow',
    'effects',
    'animation',
  ],
  HeaderTopBarText: [
    'typography',
    'spacing',
    'dimensions',
    'border',
    'shadow',
    'effects',
    'animation',
  ],
}

export const LABEL_TO_COMPONENT_TYPE: Record<string, string> = {
  'Document Title': 'PostTitle',
  'Document Body Content': 'PostContent',
  'Document Metadata': 'PostMeta',
  'Text & Content Card': 'TextBlock',
  'Section Container': 'Section',
  'Recent Posts Grid': 'RecentPosts',
  'Header Brand / Logo': 'HeaderBrand',
  'Header Navigation Menu': 'HeaderNav',
  'Top Bar Text': 'HeaderTopBarText',
  'Item Title': 'ItemTitle',
  'Item Image': 'ItemImage',
  'Item Excerpt': 'ItemExcerpt',
  'Item Link / CTA': 'ItemLink',
  'Collection Loop': 'CollectionLoop',
}

export function normalizeComponentType(typeOrLabel: string): string {
  if (!typeOrLabel) return ''
  if (COMPONENT_STYLE_CAPABILITIES[typeOrLabel]) {
    return typeOrLabel
  }
  return LABEL_TO_COMPONENT_TYPE[typeOrLabel] || typeOrLabel
}

/**
 * Resolves allowed style domains for a given component type and manifest.
 */
export function getComponentStyleCapabilities(
  componentType: string,
  manifest?: WidgetManifest,
  context?: { variant?: string },
): StyleDomain[] {
  const normalized = presentationType(normalizeComponentType(componentType))

  // Every registered renderer is composed with the shared surface adapter.
  const globalDomains: StyleDomain[] = [
    'animation',
    'background',
    'spacing',
    'dimensions',
    'border',
  ]
  const textDomains = COMPONENT_STYLE_CAPABILITIES[normalized] || []
  const extra = textDomains.filter(
    (domain) =>
      !globalDomains.includes(domain) && (domain !== 'section' || normalized === 'Section'),
  )
  if (normalized === 'ItemLink' && ['button', 'outline'].includes(context?.variant || ''))
    extra.push('button')
  void manifest
  return [...globalDomains, ...extra]
}

/**
 * Helper to check if a component supports a given style domain.
 */
export function componentSupportsDomain(
  componentType: string,
  domain: StyleDomain,
  manifest?: WidgetManifest,
): boolean {
  const capabilities = getComponentStyleCapabilities(componentType, manifest)
  return capabilities.includes(domain)
}
