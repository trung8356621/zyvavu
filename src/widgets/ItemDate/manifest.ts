import type { WidgetManifest } from '@/lib/theme-engine/types'

export const itemDateManifest: WidgetManifest = {
  id: 'ItemDate',
  version: 1,
  label: 'Item Date',
  category: 'general',
  capabilities: ['item.meta'],
  supportedContexts: ['*'],
  defaultProps: {
    prefix: '',
  },
}
