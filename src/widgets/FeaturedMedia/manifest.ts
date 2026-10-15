import type { WidgetManifest } from '@/lib/theme-engine/types'

export const featuredMediaManifest: WidgetManifest = {
  id: 'FeaturedMedia',
  version: 1,
  label: 'Featured Media / Hero Image',
  category: 'document',
  capabilities: ['document.media'],
  supportedContexts: ['single', 'page', 'home'],
  defaultProps: {
    aspectRatio: '16:9',
    rounded: true,
  },
  styleSlots: ['root', 'image'],
}
