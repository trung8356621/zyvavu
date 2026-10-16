import type { WidgetManifest } from '@/lib/theme-engine/types'

export const itemExcerptManifest: WidgetManifest = {
  id: 'ItemExcerpt',
  version: 1,
  label: 'Item Excerpt',
  category: 'general',
  capabilities: ['item.content'],
  supportedContexts: ['*'],
  defaultProps: {
    maxLines: 3,
  },
}
