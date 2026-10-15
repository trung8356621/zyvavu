import type { WidgetManifest } from '@/lib/theme-engine/types'

export const headerManifest: WidgetManifest = {
  id: 'Header',
  version: 1,
  label: 'Structured Header Layout',
  category: 'header',
  capabilities: ['site.header'],
  supportedContexts: ['header'],
  defaultProps: {
    showTopBar: true,
    showBottomBar: false,
    sticky: true,
  },
  styleSlots: ['root', 'topBar', 'mainHeader', 'bottomBar'],
}
