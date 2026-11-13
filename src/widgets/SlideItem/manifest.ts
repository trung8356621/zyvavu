import type { WidgetManifest } from '@/lib/theme-engine/types'

export const slideItemManifest: WidgetManifest = {
  id: 'SlideItem',
  version: 1,
  label: 'Slide Item',
  category: 'layout',
  capabilities: ['layout.slide'],
  supportedContexts: ['*'],
  defaultProps: {
    style: {
      background: { mode: 'color', colorToken: 'surface' },
      spacing: { padding: { token: 'lg' } },
    },
  },
  styleSlots: ['root'],
}
