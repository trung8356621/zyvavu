import { describe, expect, it } from 'vitest'
import {
  computeToolbarPosition,
  mapElementRectToWindow,
} from '@/components/builder/inline-edit/edit-boundary'
import { inlineContentExtensions } from '@/components/builder/inline-edit/extensions'

describe('inline edit toolbar positioning', () => {
  it('computeToolbarPosition prefers above and flips below when clipped', () => {
    const toolbar = { width: 140, height: 32 }
    const viewport = { width: 800, height: 600 }
    const above = computeToolbarPosition(
      { top: 120, left: 40, right: 340, bottom: 180, width: 300, height: 60 },
      toolbar,
      viewport,
      8,
    )
    expect(above.placement).toBe('above')
    expect(above.top).toBe(120 - 32 - 8)

    const nearTop = computeToolbarPosition(
      { top: 20, left: 40, right: 340, bottom: 80, width: 300, height: 60 },
      toolbar,
      viewport,
      8,
    )
    expect(nearTop.placement).toBe('below')
    expect(nearTop.top).toBeGreaterThanOrEqual(80)

    const nearRight = computeToolbarPosition(
      { top: 120, left: 760, right: 900, bottom: 180, width: 140, height: 60 },
      toolbar,
      viewport,
    )
    expect(nearRight.left + toolbar.width).toBeLessThanOrEqual(viewport.width - 8)
  })

  it('mapElementRectToWindow offsets iframe-local rects into the parent viewport', () => {
    const parentWin = window
    const frame = document.createElement('iframe')
    Object.defineProperty(frame, 'offsetWidth', { value: 400 })
    Object.defineProperty(frame, 'offsetHeight', { value: 300 })
    frame.getBoundingClientRect = () =>
      ({
        left: 200,
        top: 80,
        width: 400,
        height: 300,
        right: 600,
        bottom: 380,
        x: 200,
        y: 80,
        toJSON() {
          return this
        },
      }) as DOMRect

    const iframeWin = {
      frameElement: frame,
    } as unknown as Window

    const el = document.createElement('div')
    Object.defineProperty(el, 'ownerDocument', {
      value: { defaultView: iframeWin },
    })
    el.getBoundingClientRect = () =>
      ({
        left: 40,
        top: 60,
        width: 120,
        height: 24,
        right: 160,
        bottom: 84,
        x: 40,
        y: 60,
        toJSON() {
          return this
        },
      }) as DOMRect

    const mapped = mapElementRectToWindow(el, parentWin)
    expect(mapped.left).toBe(240)
    expect(mapped.top).toBe(140)
    expect(mapped.width).toBe(120)
    expect(mapped.height).toBe(24)
  })

  it('mapElementRectToWindow is identity when element is already in target window', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        width: 30,
        height: 40,
        right: 40,
        bottom: 60,
        x: 10,
        y: 20,
        toJSON() {
          return this
        },
      }) as DOMRect
    const mapped = mapElementRectToWindow(el, window)
    expect(mapped).toEqual({ top: 20, left: 10, right: 40, bottom: 60, width: 30, height: 40 })
    el.remove()
  })
})

describe('inline edit editor schema (canvas-only)', () => {
  it('disables StarterKit heading so the canvas editor stays paragraph-based', () => {
    const extensions = inlineContentExtensions({ multiline: false })
    const starter = extensions[0] as { name: string; options: { heading: false | object } }
    expect(starter.name).toBe('starterKit')
    expect(starter.options.heading).toBe(false)
    expect(extensions.map((ext) => ext.name)).not.toContain('heading')
  })
})
