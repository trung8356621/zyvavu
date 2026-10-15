import type { WidgetManifest } from '@/lib/theme-engine/types'

export const headerBrandManifest: WidgetManifest = {
  id: 'HeaderBrand',
  version: 1,
  label: 'Site Brand / Logo',
  category: 'header',
  capabilities: ['site.brand'],
  supportedContexts: ['header', 'footer'],
  defaultProps: {
    showTagline: true,
  },
  styleSlots: ['root', 'logo', 'text', 'tagline'],
}
