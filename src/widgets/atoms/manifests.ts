import type { WidgetManifest } from '@/lib/theme-engine/types'
import { ATOM_TYPES, SYSTEM_BLOCKS } from '@/lib/theme-engine/widget-contracts'
export const atomManifests: Record<string, WidgetManifest> = Object.fromEntries([
  ...ATOM_TYPES.map((id) => [
    id,
    {
      id,
      version: 1,
      label: id,
      category: 'general',
      capabilities: ['atom.' + id.toLowerCase()],
      supportedContexts: ['*'],
      defaultProps:
        id === 'Image'
          ? { src: '', alt: '' }
          : { text: id === 'Heading' ? 'Heading' : id === 'Button' ? 'Button' : 'Your text' },
    },
  ]),
  ...Object.entries(SYSTEM_BLOCKS).map(([id, descriptor]) => [
    id,
    {
      id,
      version: 1,
      label: id.replace(/([a-z])([A-Z])/g, '$1 $2'),
      category: 'document',
      capabilities: [descriptor.role],
      supportedContexts: [...descriptor.contexts],
      defaultProps: { binding: descriptor.binding, role: descriptor.role },
    },
  ]),
] as [string, WidgetManifest][])
