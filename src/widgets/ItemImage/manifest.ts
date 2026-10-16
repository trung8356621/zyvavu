import type { WidgetManifest } from '@/lib/theme-engine/types'

export const itemImageManifest: WidgetManifest = {
  id: 'ItemImage',
  version: 1,
  label: 'Item Image',
  category: 'general',
  capabilities: ['item.media'],
  supportedContexts: ['*'],
  defaultProps: {
    aspectRatio: '16:9',
    borderRadius: '4px',
    linkToPost: true,
  },
}
