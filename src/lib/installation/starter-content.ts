import type { Payload, PayloadRequest } from 'payload'
import type { Page, Post } from '@/payload-types'

function richText(text: string): NonNullable<Post['content']> {
  return { root: { type: 'root', version: 1, format: '', indent: 0, direction: null, children: [
    { type: 'paragraph', version: 1, format: '', indent: 0, direction: null, textFormat: 0, textStyle: '', children: [
      { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
    ] },
  ] } }
}

export function starterDefinitions(language: string) {
  const vi = language.toLowerCase().split('-')[0] === 'vi'
  const notice = vi
    ? 'Đây là nội dung mẫu. Chủ website cần thay thế hoặc xóa trước khi sử dụng chính thức.'
    : 'This is sample content. The website owner should replace or delete it before using it officially.'
  const pages = [
    ['about', vi ? 'Giới thiệu' : 'About', 'published'],
    ['contact', vi ? 'Liên hệ' : 'Contact', 'draft'],
    ['rules', vi ? 'Quy định' : 'Rules', 'draft'],
    ['privacy-policy', vi ? 'Chính sách bảo mật' : 'Privacy Policy', 'draft'],
    ['terms-of-service', vi ? 'Điều khoản sử dụng' : 'Terms of Service', 'draft'],
  ] as const
  return {
    category: { title: vi ? 'Tin tức' : 'News', slug: 'tin-tuc' },
    tag: { title: vi ? 'Giới thiệu' : 'Introduction', slug: 'gioi-thieu' },
    post: {
      title: vi ? 'Chào mừng đến với website — Bài viết mẫu' : 'Welcome to your website — Sample post',
      slug: 'welcome-sample', _status: 'published' as const, excerpt: notice,
      content: richText(`${notice} ${vi ? 'Bạn có thể chỉnh sửa bài viết, chuyên mục và thẻ trong trang quản trị.' : 'You can edit this post, its category and tag in the admin workspace.'}`),
    },
    pages: pages.map(([slug, title, status]) => ({
      slug, title, _status: status, visibility: 'public' as const, presentation: 'shared' as const,
      layout: [{ blockType: 'richText' as const, content: richText(`${notice} ${vi ? 'Hãy bổ sung thông tin đã được xác minh và rà soát nội dung phù hợp trước khi xuất bản.' : 'Add verified information and review the appropriate content before publishing.'}`) }],
    } satisfies Partial<Page>)),
  }
}

export type StarterResult = { collection: string; slug: string; status: 'created' | 'skipped' | 'conflicting' | 'would-create' }

/** Caller owns transaction/rollback. Every Local API operation and its hooks share req. */
export async function seedStarterContent(payload: Payload, req: PayloadRequest, language: string, apply = false) {
  if (apply && !req.transactionID) throw new Error('Starter content requires a transaction')
  const definitions = starterDefinitions(language)
  const results: StarterResult[] = []
  async function ensure(collection: 'categories' | 'tags' | 'posts' | 'pages', data: { slug: string; title: string } & Record<string, unknown>) {
    const found = await payload.find({ collection, where: { slug: { equals: data.slug } }, draft: true, depth: 0, limit: 2, overrideAccess: true, req })
    if (found.docs.length) {
      results.push({ collection, slug: data.slug, status: found.docs.length > 1 ? 'conflicting' : 'skipped' })
      if (found.docs.length > 1 && apply) throw new Error(`Conflicting starter slug: ${collection}/${data.slug}`)
      return found.docs[0].id
    }
    if (!apply) {
      results.push({ collection, slug: data.slug, status: 'would-create' })
      return undefined
    }
    // The collection discriminant determines the matching generated data type.
    const doc = await payload.create({ collection, data: data as never, overrideAccess: true, req, draft: false })
    results.push({ collection, slug: data.slug, status: 'created' })
    return doc.id
  }
  const category = await ensure('categories', definitions.category)
  const tag = await ensure('tags', definitions.tag)
  await ensure('posts', { ...definitions.post, categories: category === undefined ? [] : [category], tags: tag === undefined ? [] : [tag] })
  for (const page of definitions.pages) await ensure('pages', page)
  return results
}
