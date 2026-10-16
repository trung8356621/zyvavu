import type { WidgetManifest } from '@/lib/theme-engine/types'

export const collectionLoopManifest: WidgetManifest = {
  id: 'CollectionLoop',
  version: 1,
  label: 'Collection Loop',
  category: 'general',
  capabilities: ['archive.list', 'layout.container'],
  supportedContexts: ['*'],
  defaultProps: {
    mode: 'dynamic',
    source: 'posts',
    columns: 3,
    gap: '24px',
    heading: '',
    limit: 6,
    categoryId: '',
    sort: 'newest',
    emptyText: 'Chưa có bài viết nào.',
    manualItems: [],
  },
}
