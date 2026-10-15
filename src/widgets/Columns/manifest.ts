import type { WidgetManifest } from '@/lib/theme-engine/types'

export const columnsManifest: WidgetManifest = {
  id: 'Columns',
  version: 1,
  label: 'Grid Columns Layout',
  category: 'layout',
  capabilities: ['layout.columns'],
  supportedContexts: ['*'],
  defaultProps: {
    distribution: 'equal-2',
    gap: '24px',
  },
  styleSlots: ['root', 'column'],
}
