import type { WidgetManifest } from '@/lib/theme-engine/types'

export const headerActionManifest: WidgetManifest = {
  id: 'HeaderAction',
  version: 1,
  label: 'Header CTA / Action Button',
  category: 'header',
  capabilities: ['site.header'],
  supportedContexts: ['header'],
  defaultProps: {
    label: 'Liên hệ',
    url: '/contact',
    variant: 'solid',
  },
  styleSlots: ['root', 'button'],
}
