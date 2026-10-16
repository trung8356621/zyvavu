/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  ThemeRenderer,
  validateThemeTemplateDocument,
  getBundledTemplateForTheme,
} from '@/lib/theme-engine'
import { collectionLoopManifest } from '@/widgets/CollectionLoop/manifest'
import { itemTitleManifest } from '@/widgets/ItemTitle/manifest'
import { itemImageManifest } from '@/widgets/ItemImage/manifest'
import { itemExcerptManifest } from '@/widgets/ItemExcerpt/manifest'
import { itemLinkManifest } from '@/widgets/ItemLink/manifest'
import { CollectionLoopFrontend } from '@/widgets/CollectionLoop/frontend'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

describe('Loop Item Engine V1 — Contracts & Rendering', () => {
  it('registers CollectionLoop and all 4 item widgets with valid manifests', () => {
    expect(collectionLoopManifest.id).toBe('CollectionLoop')
    expect(collectionLoopManifest.capabilities).toContain('archive.list')

    expect(itemTitleManifest.id).toBe('ItemTitle')
    expect(itemTitleManifest.capabilities).toContain('item.title')

    expect(itemImageManifest.id).toBe('ItemImage')
    expect(itemImageManifest.capabilities).toContain('item.media')

    expect(itemExcerptManifest.id).toBe('ItemExcerpt')
    expect(itemExcerptManifest.capabilities).toContain('item.content')

    expect(itemLinkManifest.id).toBe('ItemLink')
    expect(itemLinkManifest.capabilities).toContain('item.link')
  })

  it('renders repeated cards from ONE prototype template in manual mode', () => {
    const loopDocument: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: {},
      content: [
        {
          type: 'CollectionLoop',
          props: {
            id: 'test-loop-1',
            mode: 'manual',
            heading: 'Các Dịch Vụ Nổi Bật',
            columns: 3,
            gap: '20px',
            limit: 3,
            manualItems: [
              {
                id: 'item-alpha',
                title: 'Tư vấn Chuyển đổi số',
                excerpt: 'Định hình chiến lược kiến trúc phần mềm cho tổ chức.',
                url: '/services/consulting',
              },
              {
                id: 'item-beta',
                title: 'Gia công Cơ khí Chính xác',
                excerpt: 'Sản xuất linh kiện tiêu chuẩn ISO 9001.',
                url: '/services/manufacturing',
              },
              {
                id: 'item-gamma',
                title: 'Kiểm thử & Đảm bảo Chất lượng',
                excerpt: 'Tự động hóa kiểm thử và kiểm định phòng LAB.',
                url: '/services/qa',
              },
            ],
          },
        },
      ],
      zones: {
        'test-loop-1:itemTemplate': [
          {
            type: 'ItemTitle',
            props: { id: 'proto-title', tag: 'h3', linkToPost: true },
          },
          {
            type: 'ItemExcerpt',
            props: { id: 'proto-excerpt', maxLines: 2 },
          },
          {
            type: 'ItemLink',
            props: { id: 'proto-link', label: 'Xem chi tiết', variant: 'link' },
          },
        ],
      },
    }

    // Validation must pass
    const validation = validateThemeTemplateDocument(loopDocument, 'home')
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])

    // Render SSR via ThemeRenderer
    const html = renderToStaticMarkup(<ThemeRenderer document={loopDocument} />)

    // Heading rendered
    expect(html).toContain('Các Dịch Vụ Nổi Bật')

    // All 3 titles rendered from the single template
    expect(html).toContain('Tư vấn Chuyển đổi số')
    expect(html).toContain('Gia công Cơ khí Chính xác')
    expect(html).toContain('Kiểm thử &amp; Đảm bảo Chất lượng')

    // All 3 excerpts rendered
    expect(html).toContain('Định hình chiến lược kiến trúc phần mềm cho tổ chức.')
    expect(html).toContain('Sản xuất linh kiện tiêu chuẩn ISO 9001.')
    expect(html).toContain('Tự động hóa kiểm thử và kiểm định phòng LAB.')

    // All 3 links rendered
    expect(html).toContain('href="/services/consulting"')
    expect(html).toContain('href="/services/manufacturing"')
    expect(html).toContain('href="/services/qa"')

    // Exactly 3 card articles rendered
    const cardMatches = html.match(/class="zyvavu-widget-collection-loop__card"/g)
    expect(cardMatches?.length).toBe(3)
  })

  it('renders empty text when manual list is empty', async () => {
    const loopNode = await CollectionLoopFrontend({
      id: 'empty-test',
      mode: 'manual',
      heading: 'Danh sách rỗng',
      emptyText: 'Hiện tại chưa có nội dung nào được cập nhật.',
      manualItems: [],
    })
    const html = renderToStaticMarkup(loopNode)

    expect(html).toContain('Danh sách rỗng')
    expect(html).toContain('Hiện tại chưa có nội dung nào được cập nhật.')
    expect(html).not.toContain('class="zyvavu-widget-collection-loop__card"')
  })

  it('validates that Corporate, Industrial, and Editorial home templates all use CollectionLoop', () => {
    const themes = ['corporate', 'industrial', 'editorial'] as const

    for (const themeId of themes) {
      const doc = getBundledTemplateForTheme(themeId, 'home')
      expect(doc).toBeDefined()

      // Document passes policy validation
      const validation = validateThemeTemplateDocument(doc, 'home')
      expect(validation.valid).toBe(true)

      // Contains CollectionLoop widget
      const loopWidget = doc.content.find((item) => item.type === 'CollectionLoop')
      expect(loopWidget).toBeDefined()
      const loopId = loopWidget!.props.id

      // Contains exactly one itemTemplate zone for that loop
      const itemTemplateZone = doc.zones?.[`${loopId}:itemTemplate`]
      expect(itemTemplateZone).toBeDefined()
      expect(Array.isArray(itemTemplateZone)).toBe(true)
      expect(itemTemplateZone!.length).toBeGreaterThan(0)

      // Uses item widgets
      const widgetTypes = itemTemplateZone!.map((w) => w.type)
      expect(widgetTypes).toContain('ItemTitle')
      expect(widgetTypes).toContain('ItemExcerpt')
      expect(widgetTypes).toContain('ItemLink')

      // Renders dynamic posts via explicit dataContext.item propagation without client context
      const html = renderToStaticMarkup(
        <ThemeRenderer
          document={doc}
          dataContext={{
            type: 'home',
            archive: {
              posts: [
                {
                  id: 101,
                  title: 'Bài viết Động Số 1',
                  excerpt: 'Tóm tắt động số 1.',
                  publicPath: '/tin-tuc/bai-viet-dong-1',
                  featuredMedia: { url: '/media/post-1.jpg', alt: 'Ảnh 1' },
                },
                {
                  id: 102,
                  title: 'Bài viết Động Số 2',
                  excerpt: 'Tóm tắt động số 2.',
                  publicPath: '/tin-tuc/bai-viet-dong-2',
                  featuredMedia: { url: '/media/post-2.jpg', alt: 'Ảnh 2' },
                },
              ],
            },
          }}
        />,
      )

      expect(html).toContain('Bài viết Động Số 1')
      expect(html).toContain('Bài viết Động Số 2')
      expect(html).toContain('Tóm tắt động số 1.')
      expect(html).toContain('Tóm tắt động số 2.')
      expect(html).toContain('href="/tin-tuc/bai-viet-dong-1"')
      expect(html).toContain('href="/tin-tuc/bai-viet-dong-2"')
      expect(html).toContain('src="/media/post-1.jpg"')
      expect(html).toContain('src="/media/post-2.jpg"')
    }
  })
})
