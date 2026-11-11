import type { WidgetManifest } from '@/lib/theme-engine/types'

export const iconManifest: WidgetManifest = {
  id: 'Icon',
  version: 1,
  label: 'Icon',
  category: 'general',
  capabilities: ['atom.icon'],
  supportedContexts: ['*'],
  defaultProps: {
    icon: { source: 'lucide', name: 'star', recolorable: true },
    label: '',
    decorative: true,
    href: '',
    newTab: false,
    size: 24,
    strokeWidth: 2,
    style: {
      colorToken: 'primary',
      align: 'left',
      spacing: { padding: { token: 'xs' } },
    },
  },
}
