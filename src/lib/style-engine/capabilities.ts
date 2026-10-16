import type { StyleDomain } from './types'
import type { WidgetManifest } from '@/lib/theme-engine/types'

/**
 * Built-in style capability mappings for core widgets.
 */
export const COMPONENT_STYLE_CAPABILITIES: Record<string, StyleDomain[]> = {
  Section: [
    'section',
    'background',
    'dimensions',
    'spacing',
    'border',
    'shadow',
    'effects',
    'responsive',
  ],
  Columns: [
    'dimensions',
    'spacing',
    'border',
    'shadow',
    'responsive',
  ],
  PostTitle: [
    'typography',
    'spacing',
    'shadow',
    'effects',
    'responsive',
  ],
  TextBlock: [
    'typography',
    'background',
    'spacing',
    'border',
    'shadow',
    'effects',
    'responsive',
  ],
  FeaturedMedia: [
    'dimensions',
    'border',
    'shadow',
    'effects',
    'spacing',
    'responsive',
  ],
  RecentPosts: [
    'dimensions',
    'spacing',
    'background',
    'border',
    'shadow',
    'responsive',
  ],
  CategoryHeader: [
    'typography',
    'background',
    'spacing',
    'border',
    'shadow',
    'responsive',
  ],
  ProductHeader: [
    'typography',
    'dimensions',
    'spacing',
    'shadow',
    'responsive',
  ],
  ItemTitle: [
    'typography',
    'spacing',
    'responsive',
  ],
  ItemExcerpt: [
    'typography',
    'spacing',
    'responsive',
  ],
  ItemImage: [
    'dimensions',
    'border',
    'shadow',
    'responsive',
  ],
  ItemLink: [
    'typography',
    'spacing',
    'border',
    'responsive',
  ],
  Header: [
    'background',
    'border',
    'shadow',
  ],
  Footer: [
    'background',
    'border',
    'spacing',
    'shadow',
  ],
}

/**
 * Resolves allowed style domains for a given component type and manifest.
 */
export function getComponentStyleCapabilities(
  componentType: string,
  manifest?: WidgetManifest,
): StyleDomain[] {
  // 1. Direct registry lookup
  if (COMPONENT_STYLE_CAPABILITIES[componentType]) {
    return COMPONENT_STYLE_CAPABILITIES[componentType]
  }

  // 2. Infer from manifest capabilities if present
  const capabilities = manifest?.capabilities || []
  const domains: Set<StyleDomain> = new Set(['responsive'])

  if (capabilities.some((c) => ['document.title', 'document.content', 'document.meta', 'layout.text'].includes(c))) {
    domains.add('typography')
    domains.add('spacing')
  }

  if (capabilities.some((c) => ['layout.container', 'layout.columns'].includes(c))) {
    domains.add('dimensions')
    domains.add('spacing')
    domains.add('border')
    domains.add('shadow')
  }

  if (capabilities.some((c) => ['document.media'].includes(c))) {
    domains.add('dimensions')
    domains.add('border')
    domains.add('shadow')
    domains.add('effects')
  }

  return Array.from(domains)
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
