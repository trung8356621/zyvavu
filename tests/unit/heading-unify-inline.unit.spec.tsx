import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import {
  allowsMultilineEnter,
  RICHTEXT_MARKER,
  sanitizeHref,
  sanitizeTextHtml,
  serializeInlineFromEditor,
} from '@/components/builder/inline-edit/content-model'
import { atomEditors } from '@/widgets/atoms/editor'
import { boundHeadingTagField, headingTagField } from '@/widgets/atoms/heading-fields'
import { AtomPresentation } from '@/widgets/atoms/frontend'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { isLibraryHiddenAtomType } from '@/lib/theme-engine/patterns/atom-presets'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'

describe('Unified Heading HTML Tag + library', () => {
  it('exposes H1–H6 + P on free Heading, but bound titles exclude P', () => {
    const free = (headingTagField as any).options.map((o: any) => o.value)
    const bound = (boundHeadingTagField as any).options.map((o: any) => o.value)
    expect(free).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'])
    expect(bound).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    expect((atomEditors.DocumentTitle.config.fields as any).tag).toBe(boundHeadingTagField)
    expect((atomEditors.Heading.config.fields as any).tag).toBe(headingTagField)
  })

  it('hides Text from new library insertions while keeping the atom registered', () => {
    expect(isLibraryHiddenAtomType('Text')).toBe(true)
    expect(atomEditors.Text).toBeDefined()
    expect(SYSTEM_PATTERNS.some((p) => p.widgetType === 'Text')).toBe(false)
    const body = SYSTEM_PATTERNS.find((p) => p.id === 'copy-body')!
    expect(body.widgetType).toBe('Heading')
    expect(body.payload.content[0].props.tag).toBe('p')
  })

  it('Enter policy: P/Text multiline; H1–H6 single-line', () => {
    expect(allowsMultilineEnter('Heading', 'p')).toBe(true)
    expect(allowsMultilineEnter('Text', 'h2')).toBe(true)
    expect(allowsMultilineEnter('Heading', 'h1')).toBe(false)
    expect(allowsMultilineEnter('Heading', 'h6')).toBe(false)
  })
})

describe('Unified rich serialization + links', () => {
  it('sanitizes href and keeps safe anchors', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBeNull()
    expect(sanitizeHref('https://zyvavu.test/a')).toBe('https://zyvavu.test/a')
    expect(sanitizeHref('/path')).toBe('/path')
    const html = sanitizeTextHtml(
      '<p>Go <a href="https://ok.test" onclick="x">here</a> <a href="javascript:bad">x</a></p>',
    )
    expect(html).toContain('<a href="https://ok.test">here</a>')
    expect(html).not.toContain('javascript')
    expect(html).not.toContain('onclick')
  })

  it('stores marks/links with rich marker; plain stays unmarked', () => {
    expect(serializeInlineFromEditor('<p>Hello</p>')).toBe('Hello')
    const rich = serializeInlineFromEditor('<p>Hi <strong>there</strong></p>')
    expect(rich.startsWith(RICHTEXT_MARKER)).toBe(true)
    const linked = serializeInlineFromEditor('<p><a href="https://a.test">A</a></p>')
    expect(linked.startsWith(RICHTEXT_MARKER)).toBe(true)
    expect(linked).toContain('https://a.test')
  })

  it('renders Heading tag P and legacy Text rich HTML safely', () => {
    const headingP = renderToStaticMarkup(
      <AtomPresentation kind="Heading" tag="p" text="Plain body" />,
    )
    expect(headingP).toContain('<p')
    expect(headingP).toContain('Plain body')

    const rich = `${RICHTEXT_MARKER}<p><strong>Đậm</strong></p>`
    const headingRich = renderToStaticMarkup(
      <AtomPresentation kind="Heading" tag="h2" text={rich} />,
    )
    expect(headingRich).toContain('<strong>Đậm</strong>')

    const legacy = renderToStaticMarkup(<AtomPresentation kind="Text" text="Legacy" />)
    expect(legacy).toContain('Legacy')
  })
})
