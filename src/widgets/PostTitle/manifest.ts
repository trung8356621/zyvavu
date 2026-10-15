import type { WidgetManifest } from '@/lib/theme-engine/types'

export const postTitleManifest: WidgetManifest = {
  id: 'PostTitle',
  version: 1,
  label: 'Post / Document Title',
  category: 'document',
  capabilities: ['document.title'],
  supportedContexts: ['single', 'page'],
  requiredData: ['title'],
  defaultProps: {
    tag: 'h1',
    align: 'left',
    variant: 'default',
  },
  styleSlots: ['root', 'title'],
}
