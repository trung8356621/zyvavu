import type { WidgetManifest } from '@/lib/theme-engine/types'

export const footerManifest: WidgetManifest = {
  id: 'Footer',
  version: 1,
  label: 'Site Footer',
  category: 'general',
  capabilities: ['site.footer'],
  supportedContexts: ['footer'],
  defaultProps: {
    copyright: '© 2026 Zyvavu. All rights reserved.',
    showBrand: true,
  },
  styleSlots: ['root', 'content', 'copyright'],
}
