import type { WidgetManifest } from '@/lib/theme-engine/types'

export const animatedCounterManifest: WidgetManifest = {
  id: 'AnimatedCounter',
  version: 1,
  label: 'Animated Counter',
  category: 'general',
  capabilities: ['ui.animated-counter'],
  supportedContexts: ['*'],
  defaultProps: {
    targetValue: 1280,
    durationMs: 1600,
    prefix: '',
    suffix: '+',
    decimals: 0,
    useGrouping: true,
    triggerOnce: true,
    label: '',
    style: {
      typography: { typography: 'h1', colorToken: 'text', align: 'center' },
      spacing: { padding: { token: 'sm' } },
    },
  },
  styleSlots: ['root'],
}
