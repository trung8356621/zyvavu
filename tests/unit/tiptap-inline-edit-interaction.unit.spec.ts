import { describe, expect, it } from 'vitest'
import {
  computeToolbarPosition,
  isInsideEditingChrome,
  pointInRect,
} from '@/components/builder/inline-edit/edit-boundary'

describe('inline edit boundary helpers', () => {
  const box = { top: 100, left: 50, right: 350, bottom: 160, width: 300, height: 60 }

  it('pointInRect matches inclusive bounds with optional pad', () => {
    expect(pointInRect(50, 100, box)).toBe(true)
    expect(pointInRect(349, 159, box)).toBe(true)
    expect(pointInRect(49, 100, box)).toBe(false)
    expect(pointInRect(49, 100, box, 1)).toBe(true)
  })

  it('isInsideEditingChrome treats puck outline geometry as inside', () => {
    expect(isInsideEditingChrome(200, 130, null, box)).toBe(true)
    expect(isInsideEditingChrome(10, 10, null, box)).toBe(false)
  })

  it('isInsideEditingChrome treats toolbar / link modal targets as inside', () => {
    const toolbar = document.createElement('div')
    toolbar.setAttribute('data-inline-edit-toolbar', 'true')
    document.body.appendChild(toolbar)
    const modal = document.createElement('div')
    modal.setAttribute('data-inline-link-modal', 'true')
    document.body.appendChild(modal)
    expect(isInsideEditingChrome(0, 0, toolbar, null)).toBe(true)
    expect(isInsideEditingChrome(0, 0, modal, null)).toBe(true)
    toolbar.remove()
    modal.remove()
  })

  it('computeToolbarPosition prefers above and flips below when clipped', () => {
    const toolbar = { width: 140, height: 32 }
    const viewport = { width: 800, height: 600 }
    const above = computeToolbarPosition(
      { top: 120, left: 40, right: 340, bottom: 180, width: 300, height: 60 },
      toolbar,
      viewport,
    )
    expect(above.placement).toBe('above')
    expect(above.top).toBeLessThan(120)

    const nearTop = computeToolbarPosition(
      { top: 20, left: 40, right: 340, bottom: 80, width: 300, height: 60 },
      toolbar,
      viewport,
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
})
