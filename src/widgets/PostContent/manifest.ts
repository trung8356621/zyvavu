import type { WidgetManifest } from '@/lib/theme-engine/types'

export const postContentManifest: WidgetManifest = {
  id: 'PostContent',
  version: 1,
  label: 'Post / Document Content',
  category: 'document',
  capabilities: ['document.content'],
  supportedContexts: ['single', 'page'],
  requiredData: ['content'],
  defaultProps: {
    showExcerptFirst: false,
  },
  styleSlots: ['root', 'body'],
}
