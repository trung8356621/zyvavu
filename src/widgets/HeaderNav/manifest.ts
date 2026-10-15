import type { WidgetManifest } from '@/lib/theme-engine/types'

export const headerNavManifest: WidgetManifest = {
  id: 'HeaderNav',
  version: 1,
  label: 'Header Navigation Menu',
  category: 'navigation',
  capabilities: ['site.navigation'],
  supportedContexts: ['header'],
  defaultProps: {
    dropdownEffect: 'fade',
  },
  styleSlots: ['root', 'item', 'link', 'dropdown', 'mega'],
}
