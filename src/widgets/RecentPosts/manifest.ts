import type { WidgetManifest } from '@/lib/theme-engine/types'

export const recentPostsManifest: WidgetManifest = {
  id: 'RecentPosts',
  version: 1,
  label: 'Recent Posts Grid',
  category: 'archive',
  capabilities: ['archive.list'],
  supportedContexts: ['home', 'category'],
  defaultProps: {
    limit: 6,
    columns: 3,
    heading: 'Bài Viết Mới Nhất',
  },
  styleSlots: ['root', 'heading', 'card', 'title', 'meta'],
}
