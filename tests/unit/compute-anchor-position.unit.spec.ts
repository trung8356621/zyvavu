import { describe, expect, it } from 'vitest'
import { computeAnchorPosition } from '@/components/admin/shared/SharedDraggableModal'

describe('computeAnchorPosition', () => {
  it('places the picker to the left of a right-side Style sidebar control', () => {
    const previous = { innerWidth: window.innerWidth, innerHeight: window.innerHeight }
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 })

    const anchor = {
      getBoundingClientRect: () => ({
        left: 1200,
        right: 1340,
        top: 200,
        bottom: 232,
        width: 140,
        height: 32,
      }),
    } as HTMLElement

    const pos = computeAnchorPosition(anchor, 360, 420)
    expect(pos.x).toBeLessThan(anchor.getBoundingClientRect().left)
    expect(pos.x + 360).toBeLessThanOrEqual(anchor.getBoundingClientRect().left)
    expect(pos.y).toBeGreaterThanOrEqual(12)

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previous.innerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: previous.innerHeight })
  })
})
