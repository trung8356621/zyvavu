import type { WidgetManifest } from '@/lib/theme-engine/types'

export const postMetaManifest: WidgetManifest = {
  id: 'PostMeta',
  version: 1,
  label: 'Document Metadata',
  category: 'document',
  capabilities: ['document.meta'],
  supportedContexts: ['single', 'page'],
  defaultProps: {
    showDate: true,
    showAuthor: true,
    showCategories: true,
  },
  styleSlots: ['root', 'item', 'badge'],
}
