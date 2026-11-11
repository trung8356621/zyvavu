import type { WidgetManifest } from '@/lib/theme-engine/types'

export const featuredPostManifest: WidgetManifest = {
  id: 'FeaturedPost',
  version: 1,
  label: 'Featured Post',
  category: 'archive',
  capabilities: ['archive.list'],
  supportedContexts: ['home', 'page', 'single', 'category', '*'],
  defaultProps: {
    mode: 'latest',
    postId: '',
    preset: 'spotlight',
    showImage: true,
    showExcerpt: true,
    showDate: true,
    emptyText: 'Chưa có bài viết nổi bật.',
  },
  styleSlots: ['root', 'title', 'excerpt', 'meta'],
}
