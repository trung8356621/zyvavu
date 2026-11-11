import type { WidgetManifest } from '@/lib/theme-engine/types'

export const collectionLoopManifest: WidgetManifest = {
  id: 'CollectionLoop',
  version: 1,
  label: 'Collection Loop',
  category: 'archive',
  capabilities: ['archive.list', 'layout.container'],
  supportedContexts: ['*'],
  defaultProps: {
    mode: 'dynamic',
    source: 'posts',
    layout: 'grid',
    columns: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: '24px',
    heading: '',
    limit: 6,
    categoryId: '',
    sort: 'newest',
    emptyText: 'Chưa có bài viết nào.',
    manualItems: [],
    loopItemTemplateId: '',
  },
  styleSlots: ['root', 'heading', 'card'],
}
