import type { WidgetManifest } from '@/lib/theme-engine/types'

export const itemTitleManifest: WidgetManifest = {
  id: 'ItemTitle',
  version: 1,
  label: 'Item Title',
  category: 'general',
  capabilities: ['item.title'],
  supportedContexts: ['*'],
  defaultProps: {
    tag: 'h3',
    linkToPost: true,
  },
}
