import type { WidgetManifest } from '@/lib/theme-engine/types'

export const itemLinkManifest: WidgetManifest = {
  id: 'ItemLink',
  version: 1,
  label: 'Item Link',
  category: 'general',
  capabilities: ['item.link'],
  supportedContexts: ['*'],
  defaultProps: {
    label: 'Xem chi tiết →',
    variant: 'link',
  },
}
