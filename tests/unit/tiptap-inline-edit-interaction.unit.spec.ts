import { describe, expect, it } from 'vitest'
import { computeToolbarPosition } from '@/components/builder/inline-edit/edit-boundary'
import { inlineContentExtensions } from '@/components/builder/inline-edit/extensions'

describe('inline edit toolbar positioning', () => {
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

describe('inline edit editor schema (canvas-only)', () => {
  it('disables StarterKit heading so the canvas editor stays paragraph-based', () => {
    const extensions = inlineContentExtensions({ multiline: false })
    const starter = extensions[0] as { name: string; options: { heading: false | object } }
    expect(starter.name).toBe('starterKit')
    expect(starter.options.heading).toBe(false)
    expect(extensions.map((ext) => ext.name)).not.toContain('heading')
  })
})
