import type { WidgetManifest } from '@/lib/theme-engine/types'

export const postCollectionManifest: WidgetManifest = {
  id: 'PostCollection',
  version: 1,
  label: 'Post Collection',
  category: 'archive',
  capabilities: ['archive.list'],
  supportedContexts: ['home', 'page', 'single', 'category', '*'],
  defaultProps: {
    heading: 'Bài viết',
    categoryIds: '',
    includeDescendants: false,
    sort: 'newest',
    limit: 6,
    layout: 'grid',
    columns: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: '24px',
    preset: 'image-card-grid',
    emptyText: 'Chưa có bài viết nào.',
  },
  styleSlots: ['root', 'heading', 'card'],
}
