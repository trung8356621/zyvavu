/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  allocateLoopItemId,
  buildLoopItemEditorUrl,
  createEmptyLoopItemDocument,
  slugifyLoopItemName,
} from '@/lib/theme-engine/loop-item-document'
import {
  fromLoopItemRecord,
  isProductSchemaSupported,
  normalizeCategoryDoc,
  normalizePostDoc,
  normalizeProductDoc,
  resolveItemBinding,
  toLoopItemRecord,
} from '@/lib/theme-engine/normalized-item'
import {
  applyBindingFieldVisibility,
  isActiveItemBinding,
  resolveAtomBindings,
} from '@/lib/theme-engine/item-binding'
import { foldLibrarySearchText } from '@/lib/theme-engine/library-search'
import { isLegacyItemWidget } from '@/lib/theme-engine/legacy-item-widgets'
import { isPageContentContext, normalizeThemeTemplateDocument } from '@/lib/theme-engine/normalization'
import { validateThemeTemplateDocument, getTemplatePolicy } from '@/lib/theme-engine'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { CollectionLoopFrontend } from '@/widgets/CollectionLoop/frontend'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

describe('Loop Item Template — default + policy', () => {
  it('creates Atom-based default (no mandatory root Section wrapper)', () => {
    const doc = createEmptyLoopItemDocument('Article Card', 'article-card')
    expect(doc.template).toBe('loopItem')
    expect(doc.metadata?.loopItemId).toBe('article-card')
    expect(doc.content.map((n) => n.type)).toEqual(['Image', 'Section'])
    expect(doc.content[0].props.srcBinding).toBe('thumbnail')
    const info = doc.content[1]
    expect(info.props.content.map((n: any) => n.type)).toEqual(['Heading', 'Text', 'Button'])
    expect(info.props.content[0].props.textBinding).toBe('title')
    expect(info.props.content[1].props.textBinding).toBe('excerpt')
    expect(info.props.content[2].props.text).toBe('Xem chi tiết')
    expect(info.props.content[2].props.hrefBinding).toBe('url')
    expect(doc.content.some((n) => isLegacyItemWidget(n.type))).toBe(false)
    const validation = validateThemeTemplateDocument(doc, 'loopItem')
    expect(validation.valid).toBe(true)
  })

  it('allows root Atoms without Section-only normalization', () => {
    expect(isPageContentContext('loopItem')).toBe(false)
    const raw: ThemeTemplateDocument = {
      version: 1,
      template: 'loopItem',
      root: { props: {} },
      content: [
        { type: 'Heading', props: { id: 'h1', text: '', textBinding: 'title' } },
        { type: 'Text', props: { id: 't1', text: '', textBinding: 'excerpt' } },
      ],
    }
    const normalized = normalizeThemeTemplateDocument(raw)
    expect(normalized.content.map((n) => n.type)).toEqual(['Heading', 'Text'])
    expect(validateThemeTemplateDocument(normalized, 'loopItem').valid).toBe(true)
  })

  it('allocates unique ids from names', () => {
    expect(slugifyLoopItemName('Article Card')).toBe('article-card')
    expect(
      allocateLoopItemId('Article Card', [{ id: 'article-card', name: 'Article Card' }]),
    ).toBe('article-card-2')
  })

  it('builds editor URL from themeId + loopItem id (not display name)', () => {
    expect(buildLoopItemEditorUrl('editorial', 'post-item')).toBe(
      '/admin/theme-builder?theme=editorial&template=loopItem&loopItem=post-item',
    )
    expect(buildLoopItemEditorUrl('corporate', 'article-card')).toContain('loopItem=article-card')
    expect(buildLoopItemEditorUrl('corporate', 'article-card')).not.toContain('Article')
  })

  it('rejects nested CollectionLoop; omits Item* from new policy', () => {
    const policy = getTemplatePolicy('loopItem')
    expect(policy.allowedWidgets).not.toContain('CollectionLoop')
    expect(policy.allowedWidgets).not.toContain('ItemTitle')
    const bad: ThemeTemplateDocument = {
      version: 1,
      template: 'loopItem',
      root: { props: {} },
      content: [{ type: 'CollectionLoop', props: { id: 'nested' } }],
    }
    const result = validateThemeTemplateDocument(bad, 'loopItem')
    expect(result.valid).toBe(false)
  })

  it('still validates legacy Item* documents for read/compat', () => {
    const legacy: ThemeTemplateDocument = {
      version: 1,
      template: 'loopItem',
      root: { props: {} },
      content: [{ type: 'ItemTitle', props: { id: 'legacy-title' } }],
    }
    expect(validateThemeTemplateDocument(legacy, 'loopItem').valid).toBe(true)
  })
})

describe('Normalized item adapters', () => {
  it('normalizes post and category fields; missing → null', () => {
    const post = normalizePostDoc({
      id: 7,
      title: 'Hello',
      excerpt: 'World',
      slug: 'hello',
      canonicalPath: '/posts/hello',
      categories: [{ id: 1, title: 'News', slug: 'news' }],
      featuredMedia: { id: 9, url: '/m/thumb.jpg', alt: 't' },
    })
    expect(post.title).toBe('Hello')
    expect(post.thumbnail?.url).toBe('/m/thumb.jpg')
    const cat = normalizeCategoryDoc({ id: 1, title: 'A', slug: 'a' })
    expect(cat.thumbnail).toBeNull()
    expect(cat.taxonomy).toBeNull()
    expect(resolveItemBinding(cat, 'taxonomy')).toBeNull()
  })

  it('product adapter stays disabled without Products schema', () => {
    expect(isProductSchemaSupported()).toBe(false)
    expect(normalizeProductDoc({ id: 1, title: 'X' })).toBeNull()
  })
})

describe('Dynamic atom binding', () => {
  const Text = createAtomRenderer('Text')
  const Heading = createAtomRenderer('Heading')
  const Image = createAtomRenderer('Image')
  const Button = createAtomRenderer('Button')

  const item = toLoopItemRecord(
    normalizePostDoc({
      id: 1,
      title: 'Bound Title',
      excerpt: 'Bound Excerpt',
      slug: 'bound',
      canonicalPath: '/posts/bound',
      featuredMedia: { url: '/img.jpg', alt: 'alt' },
    }),
  )

  it('resolves title, excerpt, thumbnail, and button URL', () => {
    expect(
      renderToStaticMarkup(
        <Heading text="" textBinding="title" dataContext={{ type: 'loopItem', item }} />,
      ),
    ).toContain('Bound Title')
    expect(
      renderToStaticMarkup(
        <Text text="" textBinding="excerpt" dataContext={{ type: 'loopItem', item }} />,
      ),
    ).toContain('Bound Excerpt')
    expect(
      renderToStaticMarkup(
        <Image src="" srcBinding="thumbnail" dataContext={{ type: 'loopItem', item }} />,
      ),
    ).toContain('/img.jpg')
    expect(
      renderToStaticMarkup(
        <Button
          text="Xem chi tiết"
          href=""
          hrefBinding="url"
          dataContext={{ type: 'loopItem', item }}
        />,
      ),
    ).toContain('/posts/bound')
  })

  it('omits bound atom when field is missing', () => {
    const bare = toLoopItemRecord(normalizeCategoryDoc({ id: 2, title: 'Cat', slug: 'cat' }))
    expect(
      renderToStaticMarkup(
        <Image src="" srcBinding="thumbnail" dataContext={{ type: 'loopItem', item: bare }} />,
      ),
    ).toBe('')
    expect(resolveAtomBindings({ textBinding: 'taxonomy' }, fromLoopItemRecord(bare)).omit).toBe(
      true,
    )
  })
})

describe('Collection Loop — shared template', () => {
  it('repeats one Atom template for many items', () => {
    const template = createEmptyLoopItemDocument('Card', 'card')
    const html = renderToStaticMarkup(
      <CollectionLoopFrontend
        mode="manual"
        layout="grid"
        columns={3}
        columnsTablet={2}
        columnsMobile={1}
        gap="16px"
        loopItemTemplateId="card"
        loopItemTemplateDocument={template}
        manualItems={[
          { title: 'A', excerpt: 'ea', url: '/a' },
          { title: 'B', excerpt: 'eb', url: '/b' },
        ]}
      /> as any,
    )
    expect(html.match(/class="zyvavu-widget-collection-loop__card"/g)?.length).toBe(2)
    expect(html).toContain('A')
    expect(html).toContain('B')
    expect(html).not.toContain('ItemTitle')
  })

  it('legacy inline slot path remains readable without linked template', () => {
    const html = renderToStaticMarkup(
      CollectionLoopFrontend({
        mode: 'manual',
        layout: 'list',
        columns: 1,
        manualItems: [{ title: 'Legacy', excerpt: 'E', url: '/legacy' }],
        renderSlot: () => <div className="legacy-slot">Inline</div>,
      }) as any,
    )
    expect(html).toContain('legacy-slot')
  })
})

describe('Atom Settings binding visibility', () => {
  it('hides Content when textBinding is active; restores when Static', () => {
    const fields = {
      textBinding: { type: 'select' },
      text: { type: 'textarea', label: 'Content' },
      tag: { type: 'select' },
      style: { type: 'custom' },
    }
    const bound = applyBindingFieldVisibility(fields, { textBinding: 'title' })
    expect(bound.text).toBeUndefined()
    expect(bound.textBinding).toBeTruthy()
    expect(bound.tag).toBeTruthy()
    expect(bound.style).toBeTruthy()

    const staticAgain = applyBindingFieldVisibility(fields, { textBinding: '' })
    expect(staticAgain.text).toEqual(fields.text)
  })

  it('hides Image source when srcBinding is active; keeps unrelated controls', () => {
    const fields = {
      srcBinding: { type: 'select' },
      hrefBinding: { type: 'select' },
      src: { type: 'custom', label: 'Image' },
    }
    const bound = applyBindingFieldVisibility(fields, { srcBinding: 'thumbnail' })
    expect(bound.src).toBeUndefined()
    expect(bound.hrefBinding).toBeTruthy()
  })

  it('does not treat hrefBinding as text binding for Button label edit', () => {
    expect(isActiveItemBinding('url')).toBe(true)
    expect(isActiveItemBinding('')).toBe(false)
    // Inline edit gate uses textBinding only — hrefBinding alone stays editable.
    const textBound = isActiveItemBinding(undefined)
    const hrefBound = isActiveItemBinding('url')
    expect(textBound).toBe(false)
    expect(hrefBound).toBe(true)
  })

  it('does not write fixture text into atom props during bound render', () => {
    const props = { text: '', textBinding: 'title' as const }
    const item = toLoopItemRecord(normalizePostDoc({ id: 1, title: 'Fixture Title', slug: 'x' }))
    const resolved = resolveAtomBindings(props, fromLoopItemRecord(item))
    expect(resolved.text).toBe('Fixture Title')
    expect(props.text).toBe('')
  })
})

describe('Library search fold', () => {
  it('is accent-insensitive', () => {
    expect(foldLibrarySearchText('Nội dung')).toBe(foldLibrarySearchText('noi dung'))
    expect(foldLibrarySearchText('Tiêu đề')).toBe(foldLibrarySearchText('tieu đe'))
    expect(foldLibrarySearchText('Heading')).toContain('heading')
  })
})

describe('Create API name guard', () => {
  it('requires a non-empty name', async () => {
    const { createLoopItemTemplate } = await import('@/lib/theme-engine/loop-item-templates')
    const payload = {
      findGlobal: vi.fn(async () => ({ themeTemplates: {} })),
      updateGlobal: vi.fn(async () => ({})),
    } as any
    expect((await createLoopItemTemplate(payload, '   ')).success).toBe(false)
    const ok = await createLoopItemTemplate(payload, 'Article Card', 'corporate')
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.document.content[0].type).toBe('Image')
      expect(ok.document.content.some((n) => isLegacyItemWidget(n.type))).toBe(false)
    }
  })
})
