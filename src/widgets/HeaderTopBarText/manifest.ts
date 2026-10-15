import type { WidgetManifest } from '@/lib/theme-engine/types'

export const headerTopBarTextManifest: WidgetManifest = {
  id: 'HeaderTopBarText',
  version: 1,
  label: 'Header Top Bar Text',
  category: 'header',
  capabilities: ['site.header'],
  supportedContexts: ['header'],
  defaultProps: {
    text: 'Cổng thông tin doanh nghiệp B2B — Hotline: 0900.000.000',
  },
  styleSlots: ['root', 'text'],
}
