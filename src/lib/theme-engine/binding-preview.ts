import type { ThemeDataContext } from './types'
import { loopItemPreviewRecord } from './loop-item-preview'

/** Editor fixture for document-scoped bindings — never persisted into Atom props. */
export function documentPreviewDataContext(
  base?: Partial<ThemeDataContext>,
): ThemeDataContext {
  return {
    type: 'single',
    ...(base || {}),
    // Intentionally no `item` — document bindings must not resolve via Loop Item.
    document: {
      id: 'preview-doc-1',
      title: 'Tiêu đề tài liệu mẫu',
      excerpt: 'Mô tả ngắn của tài liệu — chỉ dùng xem trước, không lưu vào props.',
      slug: 'preview-document',
      publishedAt: '2026-11-11T00:00:00.000Z',
      createdAt: '2026-11-11T00:00:00.000Z',
      categories: [
        { id: 1, title: 'Công nghệ', slug: 'cong-nghe' },
        { id: 2, title: 'Tin tức', slug: 'tin-tuc' },
      ],
      featuredImage: {
        url: 'https://placehold.co/640x360/e2e8f0/334155?text=Featured',
        alt: 'Preview featured media',
      },
      canonicalPath: '/posts/preview-document',
    },
    archive: {
      title: 'Danh mục mẫu',
      description: 'Mô tả danh mục mẫu cho xem trước.',
    },
  }
}

/** Editor fixture for Loop Item — item present so item wins over outer document. */
export function itemBindingPreviewDataContext(
  base?: Partial<ThemeDataContext>,
): ThemeDataContext {
  const item = loopItemPreviewRecord()
  return {
    type: 'loopItem',
    ...(base || {}),
    item,
    // Outer document deliberately different — tests must not resolve to this.
    document: {
      title: 'OUTER DOCUMENT TITLE — MUST NOT APPEAR IN LOOP ITEM',
      excerpt: 'OUTER DOCUMENT EXCERPT',
    },
  }
}

export function bindingPreviewForTemplate(
  templateContext: string | undefined,
  base?: Partial<ThemeDataContext>,
): ThemeDataContext {
  if (templateContext === 'loopItem') return itemBindingPreviewDataContext(base)
  if (templateContext === 'category') {
    return {
      ...documentPreviewDataContext(base),
      type: 'category',
      document: {
        id: 'preview-cat-1',
        title: 'Danh mục mẫu',
        slug: 'danh-muc-mau',
        description: 'Mô tả danh mục mẫu cho xem trước.',
      },
      archive: {
        title: 'Danh mục mẫu',
        description: 'Mô tả danh mục mẫu cho xem trước.',
      },
    }
  }
  return documentPreviewDataContext(base)
}
