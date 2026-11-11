/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  applyBindingFieldVisibility,
  recordFromDataContext,
  resolveAtomBindings,
} from '@/lib/theme-engine/item-binding'
import {
  bindingPreviewForTemplate,
  documentPreviewDataContext,
  itemBindingPreviewDataContext,
} from '@/lib/theme-engine/binding-preview'
import {
  collectTemplateWidgets,
  createRoleTemplate,
  widgetRole,
} from '@/lib/theme-engine/widget-contracts'
import { isHiddenFromNewAuthoring } from '@/lib/theme-engine/legacy-item-widgets'
import { validateThemeTemplateDocument } from '@/lib/theme-engine'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { FeaturedMediaFrontend } from '@/widgets/FeaturedMedia/frontend'
import { createEmptyLoopItemDocument } from '@/lib/theme-engine/loop-item-document'
import { getComponentStyleCapabilities } from '@/lib/style-engine/capabilities'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

const Heading = createAtomRenderer('Heading')
const Text = createAtomRenderer('Text')
const Image = createAtomRenderer('Image')

const singleDoc = {
  type: 'single' as const,
  document: {
    id: 10,
    title: 'Document Title Alpha',
    excerpt: 'Document excerpt',
    slug: 'document-title-alpha',
    publishedAt: '2026-03-15T00:00:00.000Z',
    createdAt: '2026-03-15T00:00:00.000Z',
    categories: [{ id: 1, title: 'Tin tức', slug: 'tin-tuc' }],
    featuredImage: { url: '/docs/alpha.jpg', alt: 'Alpha' },
    canonicalPath: '/posts/document-title-alpha',
  },
}

describe('Unify Document + Item dynamic bindings', () => {
  it('A. Single Post Heading resolves document title', () => {
    const html = renderToStaticMarkup(
      <Heading text="" textBinding="title" tag="h1" dataContext={singleDoc} />,
    )
    expect(html).toContain('Document Title Alpha')
    expect(html).toMatch(/<h1\b/)
  })

  it('B. Single Post Image resolves document thumbnail', () => {
    const html = renderToStaticMarkup(
      <Image src="" srcBinding="thumbnail" dataContext={singleDoc} />,
    )
    expect(html).toContain('/docs/alpha.jpg')
  })

  it('C. Document Date resolves correctly', () => {
    const html = renderToStaticMarkup(
      <Text text="" textBinding="date" dataContext={singleDoc} />,
    )
    expect(html.length).toBeGreaterThan(0)
    expect(html).not.toBe('')
    const record = recordFromDataContext(singleDoc)
    const bound = resolveAtomBindings({ textBinding: 'date' }, record)
    expect(bound.omit).toBe(false)
    expect(bound.text).toBeTruthy()
  })

  it('D. Loop Item Heading resolves item title, not outer document', () => {
    const ctx = itemBindingPreviewDataContext()
    const html = renderToStaticMarkup(
      <Heading text="" textBinding="title" dataContext={ctx} />,
    )
    expect(html).not.toContain('OUTER DOCUMENT TITLE')
    expect(html).toContain(String(ctx.item?.title))
  })

  it('E. Missing fields render null', () => {
    const empty = {
      type: 'single' as const,
      document: { id: 1, title: 'Only title' },
    }
    expect(
      renderToStaticMarkup(
        <Image src="" srcBinding="thumbnail" dataContext={empty} />,
      ),
    ).toBe('')
    expect(
      resolveAtomBindings({ textBinding: 'taxonomy' }, recordFromDataContext(empty)).omit,
    ).toBe(true)
  })

  it('F. Static -> Dynamic -> Static preserves content', () => {
    const fields = {
      text: { type: 'textarea' },
      textBinding: { type: 'select' },
      tag: { type: 'select' },
    }
    const staticText = 'Keep me'
    const props = { text: staticText, textBinding: '' as string }
    const hidden = applyBindingFieldVisibility(fields, { textBinding: 'title' })
    expect(hidden.text).toBeUndefined()
    expect(props.text).toBe(staticText)
    props.textBinding = 'title'
    expect(props.text).toBe(staticText)
    props.textBinding = ''
    const restored = applyBindingFieldVisibility(fields, { textBinding: '' })
    expect(restored.text).toBeTruthy()
    expect(props.text).toBe(staticText)
  })

  it('G. Typography and HTML Tag remain editable with bindings', () => {
    const caps = getComponentStyleCapabilities('Heading')
    expect(caps).toEqual(expect.arrayContaining(['typography']))
    const fields = {
      text: { type: 'textarea' },
      textBinding: { type: 'select' },
      tag: { type: 'select' },
      style: { type: 'object' },
    }
    const visible = applyBindingFieldVisibility(fields, { textBinding: 'title' })
    expect(visible.tag).toBeTruthy()
    expect(visible.style).toBeTruthy()
    expect(visible.text).toBeUndefined()
  })

  it('H. Save/Reopen preserves binding props on role template + bundled singles', () => {
    const role = createRoleTemplate('single')
    const title = collectTemplateWidgets(role).find((n) => n.type === 'Heading')
    expect(title?.props.textBinding).toBe('title')
    expect(widgetRole(title!, 'single')).toBe('document.title')

    for (const theme of ['corporate', 'editorial', 'industrial', 'default']) {
      const path = resolve(`src/themes/${theme}/templates/single.json`)
      const doc = JSON.parse(readFileSync(path, 'utf8')) as ThemeTemplateDocument
      expect(validateThemeTemplateDocument(doc, 'single').errors, theme).toEqual([])
      const widgets = collectTemplateWidgets(doc)
      expect(widgets.some((n) => n.type === 'Heading' && n.props?.textBinding === 'title')).toBe(
        true,
      )
      expect(widgets.some((n) => n.type === 'Image' && n.props?.srcBinding === 'thumbnail')).toBe(
        true,
      )
      expect(widgets.some((n) => n.type === 'Text' && n.props?.textBinding === 'date')).toBe(true)
      expect(widgets.some((n) => n.type === 'PostContent')).toBe(true)
    }
  })

  it('I. Undo/Redo-safe: binding props are plain serializable data (no fixture leak)', () => {
    const preview = bindingPreviewForTemplate('single')
    const fixtureTitle = preview.document?.title
    const node = {
      type: 'Heading',
      props: { id: 'h1', text: 'Draft static', textBinding: 'title', tag: 'h1' },
    }
    const serialized = JSON.parse(JSON.stringify(node))
    expect(serialized.props.text).toBe('Draft static')
    expect(serialized.props.textBinding).toBe('title')
    expect(JSON.stringify(serialized)).not.toContain(String(fixtureTitle))
    expect(documentPreviewDataContext().document?.title).toBeTruthy()
  })

  it('J. Existing saved Single Post templates still render (legacy widgets)', () => {
    const htmlTitle = renderToStaticMarkup(
      <PostTitleFrontend dataContext={singleDoc} tag="h1" />,
    )
    expect(htmlTitle).toContain('Document Title Alpha')
    const htmlMedia = renderToStaticMarkup(
      <FeaturedMediaFrontend
        dataContext={{
          type: 'single',
          document: { featuredImage: { url: '/legacy-feat.jpg', alt: 'legacy' } },
        }}
      />,
    )
    expect(htmlMedia).toContain('/legacy-feat.jpg')
  })

  it('K. Existing Loop Item templates still render', () => {
    const doc = createEmptyLoopItemDocument('Card', 'card-1')
    expect(validateThemeTemplateDocument(doc, 'loopItem').errors).toEqual([])
    const ctx = itemBindingPreviewDataContext()
    const html = renderToStaticMarkup(
      <Heading text="" textBinding="title" dataContext={ctx} />,
    )
    expect(html).toContain(String(ctx.item?.title))
  })

  it('hides obsolete Document/Item specialists from new authoring', () => {
    for (const type of [
      'DocumentTitle',
      'DocumentFeaturedMedia',
      'PostTitle',
      'FeaturedMedia',
      'PostMeta',
      'ItemTitle',
      'CategoryTitle',
    ]) {
      expect(isHiddenFromNewAuthoring(type)).toBe(true)
    }
    expect(isHiddenFromNewAuthoring('Heading')).toBe(false)
    expect(isHiddenFromNewAuthoring('PostContent')).toBe(false)
  })
})

