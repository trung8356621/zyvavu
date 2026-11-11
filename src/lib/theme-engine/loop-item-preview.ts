import type { NormalizedItem } from './normalized-item'
import { toLoopItemRecord } from './normalized-item'
import type { LoopItemRecord, ThemeDataContext } from './types'

/** Deterministic editor fixture — never persisted into the template document. */
export const LOOP_ITEM_PREVIEW_FIXTURE: NormalizedItem = {
  id: 'preview-item-1',
  type: 'post',
  title: 'Bài viết mẫu cho Loop Item',
  excerpt:
    'Đoạn mô tả ngắn dùng cho xem trước thiết kế thẻ. Không được lưu vào tài liệu mẫu.',
  thumbnail: {
    url: 'https://placehold.co/640x360/e2e8f0/334155?text=Thumbnail',
    alt: 'Preview thumbnail',
    width: 640,
    height: 360,
  },
  url: '/posts/preview-loop-item',
  slug: 'preview-loop-item',
  taxonomy: [
    { id: 1, title: 'Công nghệ', slug: 'cong-nghe' },
    { id: 2, title: 'Tin tức', slug: 'tin-tuc' },
  ],
  date: '2026-11-11T00:00:00.000Z',
}

export function loopItemPreviewRecord(): LoopItemRecord {
  return toLoopItemRecord(LOOP_ITEM_PREVIEW_FIXTURE)
}

export function loopItemPreviewDataContext(
  base?: Partial<ThemeDataContext>,
): ThemeDataContext {
  return {
    type: 'loopItem',
    ...(base || {}),
    item: loopItemPreviewRecord(),
  }
}
