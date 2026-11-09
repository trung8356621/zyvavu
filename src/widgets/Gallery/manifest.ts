import type { WidgetManifest } from '@/lib/theme-engine/types'

export const galleryManifest: WidgetManifest = {
  id: 'Gallery',
  version: 1,
  label: 'Image Gallery',
  category: 'general',
  capabilities: ['atom.gallery'],
  supportedContexts: ['home', 'page', 'single', 'category'],
  defaultProps: {
    columns: 3,
    gapToken: 'md',
    aspectRatio: '1:1',
    objectFit: 'cover',
    items: [],
  },
  styleSlots: ['root'],
}
