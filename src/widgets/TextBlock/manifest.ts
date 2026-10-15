import type { WidgetManifest } from '@/lib/theme-engine/types'

export const textBlockManifest: WidgetManifest = {
  id: 'TextBlock',
  version: 1,
  label: 'Text & Content Card',
  category: 'layout',
  capabilities: ['layout.text'],
  supportedContexts: ['*'],
  defaultProps: {
    title: '',
    content: '',
    align: 'left',
    badge: '',
    ctaLabel: '',
    ctaUrl: '',
  },
  styleSlots: ['root', 'title', 'badge', 'content', 'button'],
}
