import type { WidgetManifest } from '@/lib/theme-engine/types'

export const sectionManifest: WidgetManifest = {
  id: 'Section',
  version: 1,
  label: 'Section Container',
  category: 'layout',
  capabilities: ['layout.container', 'layout.section'],
  supportedContexts: ['*'],
  defaultProps: {
    containerWidth: 'containerWidth',
    verticalPadding: 'md',
    minHeight: 'auto',
    style: {
      background: {
        mode: 'color',
        colorToken: 'surface',
      },
      section: {
        containerWidth: 'containerWidth',
        verticalPadding: 'md',
        minHeight: 'auto',
      },
    },
  },
  styleSlots: ['root', 'container', 'content', 'overlay', 'background'],
}
