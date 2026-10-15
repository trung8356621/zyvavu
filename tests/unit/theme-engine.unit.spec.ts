import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  getTemplatePolicy,
  TEMPLATE_POLICIES,
} from '@/lib/theme-engine/policy'
import {
  validateThemeTemplateDocument,
} from '@/lib/theme-engine/validation'
import {
  getBundledTemplate,
} from '@/lib/theme-engine/resolver'
import {
  generateThemeCss,
  getActiveThemeConfig,
} from '@/lib/theme-engine/styles'
import {
  getFrontendWidget,
  getAllFrontendWidgets,
  registerFrontendWidget,
} from '@/lib/theme-engine/widget-registry-frontend'
import {
  getEditorConfigForContext,
} from '@/lib/theme-engine/widget-registry-editor'
import {
  ThemeRenderer,
} from '@/lib/theme-engine/renderer'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

describe('Theme Engine V1 — Foundation & Contracts', () => {
  it('loads valid bundled default templates for all 7 contexts', () => {
    const contexts = ['single', 'page', 'home', 'header', 'footer', 'category', 'product'] as const
    for (const ctx of contexts) {
      const doc = getBundledTemplate(ctx)
      expect(doc).toBeDefined()
      expect(doc.version).toBe(1)
      expect(doc.template).toBe(ctx)
      expect(Array.isArray(doc.content)).toBe(true)
      expect(doc.content.length).toBeGreaterThan(0)

      const validation = validateThemeTemplateDocument(doc, ctx)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    }
  })

  it('guarantees bundled template isolation (mutating copy does not affect source)', () => {
    const doc1 = getBundledTemplate('single')
    doc1.content.push({ type: 'TextBlock', props: { id: 'mutated-block' } })

    const doc2 = getBundledTemplate('single')
    expect(doc2.content.find((item) => item.props.id === 'mutated-block')).toBeUndefined()
  })

  it('compiles theme tokens and style slots into safe CSS variables', () => {
    const css = generateThemeCss()
    expect(css).toContain('--zyvavu-theme-primary: #0e6b66;')
    expect(css).toContain('--zyvavu-theme-container: 1200px;')
    expect(css).toContain('.zyvavu-widget-post-title')
    expect(css).toContain('.zyvavu-widget-post-content')
    expect(css).not.toContain('<script')
  })
})

describe('Theme Engine V1 — Three-Level Widget Locking & Policies', () => {
  it('enforces Level A: Widget Capabilities', () => {
    const postTitle = getFrontendWidget('PostTitle')
    expect(postTitle?.manifest.capabilities).toContain('document.title')

    const postContent = getFrontendWidget('PostContent')
    expect(postContent?.manifest.capabilities).toContain('document.content')

    const headerNav = getFrontendWidget('HeaderNav')
    expect(headerNav?.manifest.capabilities).toContain('site.navigation')

    const productHeader = getFrontendWidget('ProductHeader')
    expect(productHeader?.manifest.capabilities).toContain('product.title')
    expect(productHeader?.manifest.capabilities).toContain('product.purchase')
  })

  it('enforces Level B: Template Policy (required and unique widgets/capabilities)', () => {
    // Single requires document.content
    const invalidSingle: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 't1' } },
        // PostContent is missing!
      ],
      zones: {},
    }

    const validation = validateThemeTemplateDocument(invalidSingle, 'single')
    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.includes('document.content'))).toBe(true)

    // Single allows only one document.title
    const duplicateTitleSingle: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 't1' } },
        { type: 'PostTitle', props: { id: 't2' } },
        { type: 'PostContent', props: { id: 'c1' } },
      ],
      zones: {},
    }
    const dupValidation = validateThemeTemplateDocument(duplicateTitleSingle, 'single')
    expect(dupValidation.valid).toBe(false)
    expect(dupValidation.errors.some((e) => e.includes('Only one widget with capability'))).toBe(true)

    // Rejects disallowed widget in single
    const disallowedWidgetSingle: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 't1' } },
        { type: 'PostContent', props: { id: 'c1' } },
        { type: 'CategoryHeader', props: { id: 'cat-1' } }, // Disallowed in single!
      ],
      zones: {},
    }
    const disallowedVal = validateThemeTemplateDocument(disallowedWidgetSingle, 'single')
    expect(disallowedVal.valid).toBe(false)
    expect(disallowedVal.errors.some((e) => e.includes('is not permitted in template "single"'))).toBe(true)
  })

  it('enforces Level C: Widget Instance Locks', () => {
    const prevDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        {
          type: 'PostTitle',
          props: {
            id: 'locked-title',
            variant: 'default',
            lock: { canDelete: false, canEditProps: false },
          },
        },
        { type: 'PostContent', props: { id: 'c1' } },
      ],
      zones: {},
    }

    // 1. Deletion attempt of locked widget
    const deletedDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [{ type: 'PostContent', props: { id: 'c1' } }],
      zones: {},
    }
    const delVal = validateThemeTemplateDocument(deletedDoc, 'single', prevDoc)
    expect(delVal.valid).toBe(false)
    expect(delVal.errors.some((e) => e.includes('locked against deletion'))).toBe(true)

    // 2. Prop edit attempt of locked props
    const editedPropDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        {
          type: 'PostTitle',
          props: {
            id: 'locked-title',
            variant: 'accent', // Changed from 'default'!
            lock: { canDelete: false, canEditProps: false },
          },
        },
        { type: 'PostContent', props: { id: 'c1' } },
      ],
      zones: {},
    }
    const propVal = validateThemeTemplateDocument(editedPropDoc, 'single', prevDoc)
    expect(propVal.valid).toBe(false)
    expect(propVal.errors.some((e) => e.includes('locked against prop edits'))).toBe(true)
  })
})

describe('Theme Engine V1 — Widget Registry & Extensibility', () => {
  it('provides all 15 core frontend widgets without editor runtime', () => {
    const all = getAllFrontendWidgets()
    const expectedWidgets = [
      'PostTitle',
      'PostContent',
      'PostMeta',
      'FeaturedMedia',
      'Columns',
      'TextBlock',
      'RecentPosts',
      'CategoryHeader',
      'ProductHeader',
      'Header',
      'HeaderBrand',
      'HeaderNav',
      'HeaderAction',
      'HeaderTopBarText',
      'Footer',
    ]

    for (const id of expectedWidgets) {
      expect(all[id]).toBeDefined()
      expect(typeof all[id].component).toBe('function')
    }
  })

  it('allows developers to override widget implementations without altering template JSON', () => {
    function CustomPostTitleFrontend({ dataContext }: any) {
      return React.createElement('h1', { className: 'custom-title' }, `Custom: ${dataContext?.document?.title}`)
    }

    registerFrontendWidget('PostTitle', CustomPostTitleFrontend)

    const resolved = getFrontendWidget('PostTitle')
    expect(resolved?.component).toBe(CustomPostTitleFrontend)

    // Render using ThemeRenderer
    const doc = getBundledTemplate('single')
    const html = renderToStaticMarkup(
      React.createElement(ThemeRenderer, {
        document: doc,
        dataContext: {
          type: 'single',
          document: { title: 'Bài viết thử nghiệm' },
        },
      }),
    )

    expect(html).toContain('custom-title')
    expect(html).toContain('Custom: Bài viết thử nghiệm')
  })

  it('scopes Editor Puck Config to allowed widgets per template context', () => {
    const singleConfig = getEditorConfigForContext('single')
    expect(singleConfig.components['PostTitle']).toBeDefined()
    expect(singleConfig.components['PostContent']).toBeDefined()
    expect(singleConfig.components['CategoryHeader']).toBeUndefined() // Not allowed in single!

    const categoryConfig = getEditorConfigForContext('category')
    expect(categoryConfig.components['CategoryHeader']).toBeDefined()
    expect(categoryConfig.components['RecentPosts']).toBeDefined()
    expect(categoryConfig.components['PostContent']).toBeUndefined() // Not allowed in category!

    const headerConfig = getEditorConfigForContext('header')
    expect(headerConfig.components['HeaderBrand']).toBeDefined()
    expect(headerConfig.components['HeaderNav']).toBeDefined()
    expect(headerConfig.components['HeaderTopBarText']).toBeDefined()
  })
})

describe('Theme Engine V1 — SSR Rendering & Working Default Theme', () => {
  it('renders a full published post with title, excerpt, metadata and rich text content', () => {
    // Reset PostTitle to default
    const defaultWidgets = getAllFrontendWidgets()
    registerFrontendWidget('PostTitle', defaultWidgets['PostTitle'].component)

    const postDoc = {
      id: 42,
      title: 'Khám Phá Theme Engine V1 Cho Doanh Nghiệp',
      slug: 'kham-pha-theme-engine-v1',
      publishedAt: '2026-10-15T12:00:00.000Z',
      excerpt: 'Đoạn tóm tắt mở đầu bài viết.',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Toàn bộ nội dung bài viết phong phú được render từ Lexical Editor trên giao diện công khai.',
                },
              ],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      categories: [{ id: 1, title: 'Công Nghệ' }],
    }

    const template = getBundledTemplate('single')
    const html = renderToStaticMarkup(
      React.createElement(ThemeRenderer, {
        document: template,
        dataContext: {
          type: 'single',
          document: postDoc,
        },
      }),
    )

    // Checks
    expect(html).toContain('Khám Phá Theme Engine V1 Cho Doanh Nghiệp')
    expect(html).toContain('Đoạn tóm tắt mở đầu bài viết.')
    expect(html).toContain('Toàn bộ nội dung bài viết phong phú được render từ Lexical Editor')
    expect(html).toContain('Công Nghệ')
  })

  it('renders page layout blocks seamlessly through DocumentContent', () => {
    const pageDoc = {
      id: 10,
      title: 'Giới Thiệu Doanh Nghiệp',
      slug: 'about-us',
      layout: [
        {
          blockType: 'banner',
          heading: 'Giải pháp số hàng đầu',
          text: 'Chúng tôi mang lại giải pháp công nghệ cao cho doanh nghiệp.',
        },
      ],
    }

    const template = getBundledTemplate('page')
    const html = renderToStaticMarkup(
      React.createElement(ThemeRenderer, {
        document: template,
        dataContext: {
          type: 'page',
          document: pageDoc,
        },
      }),
    )

    expect(html).toContain('Giới Thiệu Doanh Nghiệp')
    expect(html).toContain('Giải pháp số hàng đầu')
    expect(html).toContain('Chúng tôi mang lại giải pháp công nghệ cao cho doanh nghiệp.')
  })

  it('renders structured Flatsome-like Header with Top Bar, Main Header and navigation items', () => {
    const template = getBundledTemplate('header')
    const html = renderToStaticMarkup(
      React.createElement(ThemeRenderer, {
        document: template,
        dataContext: {
          type: 'header',
          site: {
            siteName: 'Zyvavu Enterprise',
            tagline: 'Leading CMS',
            menuItems: [
              { id: 'm1', label: 'Trang chủ', href: '/', newTab: false },
              { id: 'm2', label: 'Dịch vụ', href: '/services', newTab: false },
            ],
          },
        },
      }),
    )

    expect(html).toContain('zyvavu-header-tier--top')
    expect(html).toContain('zyvavu-header-tier--main')
    expect(html).toContain('Zyvavu Enterprise')
    expect(html).toContain('Trang chủ')
    expect(html).toContain('Dịch vụ')
  })

  it('renders Footer with columns and copyright', () => {
    const template = getBundledTemplate('footer')
    const html = renderToStaticMarkup(
      React.createElement(ThemeRenderer, {
        document: template,
        dataContext: {
          type: 'footer',
          site: {
            siteName: 'Zyvavu B2B',
          },
        },
      }),
    )

    expect(html).toContain('zyvavu-widget-footer')
    expect(html).toContain('Zyvavu Enterprise Platform')
    expect(html).toContain('Thông Tin Liên Hệ')
  })

  it('renders product template with contract boundary information', () => {
    const template = getBundledTemplate('product')
    const html = renderToStaticMarkup(
      React.createElement(ThemeRenderer, {
        document: template,
        dataContext: {
          type: 'product',
          document: {
            title: 'Sản phẩm thử nghiệm',
            price: '1.200.000',
          },
        },
      }),
    )

    expect(html).toContain('Product Template Contract Boundary')
    expect(html).toContain('Sản phẩm thử nghiệm')
    expect(html).toContain('1.200.000 đ')
    expect(html).toContain('Chờ nhà cung cấp sản phẩm')
  })
})
