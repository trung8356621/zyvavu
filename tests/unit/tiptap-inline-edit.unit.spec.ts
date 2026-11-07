import { describe, expect, it, vi } from 'vitest'
import {
  RICHTEXT_MARKER,
  canInlineEditAtom,
  htmlToPlainText,
  isRichTextStored,
  resolveTextRender,
  sanitizeTextHtml,
  serializeHeadingFromEditor,
  serializeTextFromEditor,
  textEditorContent,
  unwrapStoredText,
} from '@/components/builder/inline-edit/content-model'
import { commitAtomText } from '@/components/builder/inline-edit/commit-atom-text'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import { atomEditors } from '@/widgets/atoms/editor'
import { postTitleEditor } from '@/widgets/PostTitle/editor'

describe('Tiptap inline edit — content model', () => {
  it('preserves legacy plain text exactly, including angle brackets', () => {
    const plain = 'Giá < 100 & giá > 50 — Tiếng Việt'
    expect(unwrapStoredText(plain)).toEqual({ mode: 'plain', content: plain })
    expect(isRichTextStored(plain)).toBe(false)
    expect(resolveTextRender(plain)).toEqual({ mode: 'plain', plain })
  })

  it('does not treat unmarked angle-bracket text as HTML', () => {
    const sneaky = 'use <strong>tags</strong> literally'
    expect(resolveTextRender(sneaky).mode).toBe('plain')
    expect(resolveTextRender(sneaky).plain).toBe(sneaky)
  })

  it('uses explicit marker for rich Text storage', () => {
    const html = sanitizeTextHtml('<p>Hello <strong>world</strong></p>')
    const stored = serializeTextFromEditor(html)
    expect(stored.startsWith(RICHTEXT_MARKER)).toBe(true)
    const render = resolveTextRender(stored)
    expect(render.mode).toBe('html')
    expect(render.html).toContain('<strong>')
    expect(render.html).not.toContain('onclick')
  })

  it('stores trivial single-paragraph Text as plain (no marker)', () => {
    expect(serializeTextFromEditor('<p>Chào Việt Nam</p>')).toBe('Chào Việt Nam')
    expect(serializeTextFromEditor('<p>line1<br />line2</p>')).toBe('line1\nline2')
  })

  it('keeps multi-paragraph Text as marked rich HTML', () => {
    const stored = serializeTextFromEditor('<p>a</p><p>b</p>')
    expect(isRichTextStored(stored)).toBe(true)
  })

  it('sanitizes unsupported tags/attrs without window', () => {
    const dirty =
      '<p onclick="alert(1)">ok<script>alert(2)</script><img src=x onerror=alert(3) /><strong>x</strong></p>'
    const clean = sanitizeTextHtml(dirty)
    expect(clean).not.toContain('script')
    expect(clean).not.toContain('onclick')
    expect(clean).not.toContain('img')
    expect(clean).toContain('<strong>x</strong>')
    expect(clean).toContain('ok')
  })

  it('Heading serialize is always plain', () => {
    expect(serializeHeadingFromEditor('<p>Title &amp; more</p>')).toBe('Title & more')
    expect(serializeHeadingFromEditor('plain')).toBe('plain')
  })

  it('textEditorContent escapes plain legacy for the editor', () => {
    expect(textEditorContent('a < b')).toBe('<p>a &lt; b</p>')
  })

  it('htmlToPlainText preserves Vietnamese', () => {
    expect(htmlToPlainText('<p>Xin chào Việt Nam</p>')).toBe('Xin chào Việt Nam')
  })
})

describe('Tiptap inline edit — atom eligibility', () => {
  it('allows free Heading/Text only', () => {
    expect(canInlineEditAtom('Heading', false)).toBe(true)
    expect(canInlineEditAtom('Text', false)).toBe(true)
    expect(canInlineEditAtom('Heading', true)).toBe(false)
    expect(canInlineEditAtom('DocumentTitle', false)).toBe(false)
    expect(canInlineEditAtom('Button', false)).toBe(false)
  })

  it('keeps Content field without Puck contentEditable; bound titles have no Content', () => {
    const headingFields = atomEditors.Heading.config.fields as Record<string, any>
    const textFields = atomEditors.Text.config.fields as Record<string, any>
    const documentTitleFields = atomEditors.DocumentTitle.config.fields as Record<string, any>
    const categoryTitleFields = atomEditors.CategoryTitle.config.fields as Record<string, any>
    expect(headingFields.text.contentEditable).toBe(false)
    expect(textFields.text.contentEditable).toBe(false)
    expect(documentTitleFields.text).toBeUndefined()
    expect(categoryTitleFields.text).toBeUndefined()
    expect((postTitleEditor.fields as Record<string, unknown> | undefined)?.text).toBeUndefined()
  })
})

describe('Tiptap inline edit — history commit helper', () => {
  it('dispatches one replace with recordHistory true and only updates text', () => {
    const dispatch = vi.fn()
    const item = {
      type: 'Heading',
      props: { id: 'h1', text: 'Old', tag: 'h2', style: { typography: { typography: 'h2' } } },
    }
    const ok = commitAtomText(
      {
        getItemById: () => item as any,
        getSelectorForId: () => ({ index: 0, zone: 'root:default-zone' }),
        dispatch,
      },
      'h1',
      'New',
    )
    expect(ok).toBe(true)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: 'replace',
      recordHistory: true,
      data: {
        type: 'Heading',
        props: {
          id: 'h1',
          text: 'New',
          tag: 'h2',
          style: { typography: { typography: 'h2' } },
        },
      },
    })
  })

  it('skips dispatch when text unchanged', () => {
    const dispatch = vi.fn()
    const item = { type: 'Text', props: { id: 't1', text: 'Same' } }
    expect(
      commitAtomText(
        {
          getItemById: () => item as any,
          getSelectorForId: () => ({ index: 1, zone: 'root:default-zone' }),
          dispatch,
        },
        't1',
        'Same',
      ),
    ).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
