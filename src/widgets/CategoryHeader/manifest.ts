import type { WidgetManifest } from '@/lib/theme-engine/types'

export const categoryHeaderManifest: WidgetManifest = {
  id: 'CategoryHeader',
  version: 1,
  label: 'Category Archive Header',
  category: 'archive',
  capabilities: ['archive.header'],
  supportedContexts: ['category'],
  defaultProps: {
    align: 'left',
  },
  styleSlots: ['root', 'title', 'description'],
}
