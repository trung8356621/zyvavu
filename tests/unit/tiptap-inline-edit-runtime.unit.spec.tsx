/**
 * Runtime regression: Puck disables pointer-events on all component descendants.
 * Inline edit must register overlay portal so double-click can mount Tiptap.
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { Editor } from '@tiptap/core'

const dispatch = vi.fn()
const puckState = {
  selectedItem: { type: 'Heading', props: { id: 'heading-1', text: 'Hello Heading' } },
  getItemById: (id: string) =>
    id === 'heading-1'
      ? { type: 'Heading', props: { id: 'heading-1', text: 'Hello Heading', tag: 'h2' } }
      : undefined,
  getSelectorForId: (id: string) =>
    id === 'heading-1' ? { index: 0, zone: 'root:default-zone' } : undefined,
  dispatch,
}

vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@puckeditor/core')>()
  return {
    ...actual,
    createUsePuck: () => (selector: (s: typeof puckState) => unknown) => selector(puckState),
  }
})

import { InlineEditableAtom } from '@/components/builder/inline-edit/InlineEditableAtom'

beforeEach(() => {
  dispatch.mockClear()
  // jsdom has no CSS.escape or Range geometry. The fixture IDs are selector-safe.
  vi.stubGlobal('CSS', { escape: (id: string) => id })
  Object.defineProperties(Range.prototype, {
    getClientRects: { configurable: true, value: () => [] },
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
  })
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style id="puck-pointer-gate">
      [data-puck-component] * { pointer-events: none; user-select: none; }
      [data-puck-component] { pointer-events: auto !important; }
      [data-puck-overlay-portal], [data-puck-overlay-portal] * { pointer-events: auto !important; }
    </style>`,
  )
})

afterEach(() => {
  cleanup()
  document.getElementById('puck-pointer-gate')?.remove()
  Reflect.deleteProperty(Range.prototype, 'getClientRects')
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
  vi.unstubAllGlobals()
})

describe('Tiptap inline edit — canvas double-click runtime', () => {
  const wrap = (node: React.ReactNode) => <MantineProvider>{node}</MantineProvider>

  it('registers Puck overlay portal while idle so descendants can receive events', async () => {
    const { container } = render(
      wrap(
        <div data-puck-component="heading-1">
          <InlineEditableAtom kind="Heading" id="heading-1" text="Hello Heading" tag="h2">
            <h2>Hello Heading</h2>
          </InlineEditableAtom>
        </div>,
      ),
    )

    await waitFor(() => {
      const idle = container.querySelector('[data-inline-edit="idle"]')
      expect(idle).toBeTruthy()
      expect(idle?.getAttribute('data-puck-overlay-portal')).toBe('true')
    })
  })

  it('double-click idle Heading mounts active Tiptap EditorContent and focuses', async () => {
    const { container } = render(
      wrap(
        <div data-puck-component="heading-1">
          <InlineEditableAtom kind="Heading" id="heading-1" text="Hello Heading" tag="h2">
            <h2>Hello Heading</h2>
          </InlineEditableAtom>
        </div>,
      ),
    )

    const idle = await waitFor(() => {
      const node = container.querySelector('[data-inline-edit="idle"]')
      expect(node?.getAttribute('data-puck-overlay-portal')).toBe('true')
      return node as HTMLElement
    })

    fireEvent.doubleClick(idle.querySelector('h2') || idle)

    await waitFor(() => {
      const active = container.querySelector('[data-inline-edit="active"]')
      expect(active).toBeTruthy()
      expect(container.querySelector('.ProseMirror, .tiptap')).toBeTruthy()
      expect(container.querySelector('[data-inline-edit="idle"]')).toBeNull()
    })
  })

  async function enterEdit(container: HTMLElement) {
    const idle = await waitFor(() => container.querySelector('[data-inline-edit="idle"]') as HTMLElement)
    fireEvent.doubleClick(idle.querySelector('h2') || idle)
    await waitFor(() => expect(container.querySelector('[data-inline-edit="active"]')).toBeTruthy())
  }

  it('Escape cancels without dispatching replace', async () => {
    const { container } = render(
      wrap(
        <div data-puck-component="heading-1">
          <InlineEditableAtom kind="Heading" id="heading-1" text="Hello Heading" tag="h2">
            <h2>Hello Heading</h2>
          </InlineEditableAtom>
        </div>,
      ),
    )

    await enterEdit(container)

    const prose = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(prose, { key: 'Escape' })

    await waitFor(() => {
      expect(container.querySelector('[data-inline-edit="idle"]')).toBeTruthy()
      expect(container.querySelector('[data-inline-edit="active"]')).toBeNull()
    })
    expect(dispatch).not.toHaveBeenCalled()
  })

  function mockRect(el: HTMLElement, rect: Partial<DOMRect>) {
    el.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON() {
          return {}
        },
        ...rect,
      }) as DOMRect
  }

  it('blank-area pointerdown inside puck outline keeps editing active', async () => {
    const { container } = render(
      wrap(
        <div data-puck-component="heading-1" style={{ width: 320, height: 80, position: 'relative' }}>
          <InlineEditableAtom kind="Heading" id="heading-1" text="Hello Heading" tag="h2">
            <h2>Hello Heading</h2>
          </InlineEditableAtom>
        </div>,
      ),
    )
    await enterEdit(container)
    const host = container.querySelector('[data-puck-component]') as HTMLElement
    mockRect(host, { top: 40, left: 20, right: 340, bottom: 120, width: 320, height: 80 })
    // Hit the host (parent of session) inside the outline — should not exit.
    fireEvent.pointerDown(host, {
      clientX: 300,
      clientY: 100,
      bubbles: true,
    })
    expect(container.querySelector('[data-inline-edit="active"]')).toBeTruthy()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('toolbar mounts in a portal and pointerdown on it does not commit', async () => {
    const { container } = render(
      wrap(
        <div data-puck-component="heading-1">
          <InlineEditableAtom kind="Heading" id="heading-1" text="Hello Heading" tag="h2">
            <h2>Hello Heading</h2>
          </InlineEditableAtom>
        </div>,
      ),
    )
    await enterEdit(container)
    const toolbar = await waitFor(() => {
      const node = document.querySelector('[data-inline-edit-toolbar]') as HTMLElement
      expect(node).toBeTruthy()
      return node
    })
    expect(document.body.contains(toolbar)).toBe(true)
    fireEvent.pointerDown(toolbar, { clientX: 12, clientY: 12, bubbles: true })
    expect(container.querySelector('[data-inline-edit="active"]')).toBeTruthy()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('pointerdown outside the widget commits when draft changed', async () => {
    const { container } = render(
      wrap(
        <div>
          <div data-puck-component="heading-1">
            <InlineEditableAtom kind="Heading" id="heading-1" text="Hello Heading" tag="h2">
              <h2>Hello Heading</h2>
            </InlineEditableAtom>
          </div>
          <button type="button" data-outside="true">
            Outside
          </button>
        </div>,
      ),
    )
    await enterEdit(container)
    const host = container.querySelector('[data-puck-component]') as HTMLElement
    mockRect(host, { top: 40, left: 20, right: 340, bottom: 120, width: 320, height: 80 })
    const prose = container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }
    prose.editor.commands.setContent('<p>Edited Heading</p>')
    fireEvent.pointerDown(container.querySelector('[data-outside]')!, {
      clientX: 8,
      clientY: 8,
      bubbles: true,
    })
    await waitFor(() =>
      expect(container.querySelector('[data-inline-edit="idle"]')).toBeTruthy(),
    )
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'replace',
      data: expect.objectContaining({
        props: expect.objectContaining({ text: 'Edited Heading' }),
      }),
    }))
  })
})
