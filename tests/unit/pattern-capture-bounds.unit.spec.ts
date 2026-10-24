import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  measurePatternCapture,
  PATTERN_CAPTURE_VERSION,
} from '@/lib/theme-engine/patterns/capture-bounds'

function box(element: HTMLElement, x: number, y: number, width: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON: () => ({}),
  })
}
function fixture(height: number) {
  const root = document.createElement('div')
  const section = document.createElement('section')
  root.append(section)
  document.body.append(root)
  box(root, 0, 0, 1200, height + 48)
  box(section, 24, 24, 1152, height)
  vi.stubGlobal('getComputedStyle', (element: HTMLElement) => ({
    boxShadow: element.style.boxShadow || 'none',
    textShadow: element.style.textShadow || 'none',
  }))
  return { root, section }
}
afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('Pattern capture extent', () => {
  it('versions the new capture renderer', () => expect(PATTERN_CAPTURE_VERSION).toBe(2))
  it('captures short content with wrapper padding, independently of viewport height', () => {
    const { root } = fixture(90)
    expect(measurePatternCapture(root)).toEqual({ x: 0, y: 0, width: 1200, height: 138 })
  })
  it('preserves intentional Section min-height and airy design spacing', () => {
    const { root, section } = fixture(960)
    section.style.minHeight = '960px'
    section.style.padding = '100px'
    expect(measurePatternCapture(root).height).toBe(1008)
    expect(section.style.minHeight).toBe('960px')
    expect(section.style.padding).toBe('100px')
  })
  it('does not truncate content below the original 800px viewport', () => {
    const { root, section } = fixture(2200)
    expect(measurePatternCapture(root).height).toBe(2248)
    expect(section.style.height).toBe('')
  })
  it('includes overflowing nested content and a bottom border', () => {
    const { root, section } = fixture(100)
    const child = document.createElement('div')
    section.append(child)
    box(child, 24, 24, 1152, 350)
    expect(measurePatternCapture(root).height).toBe(374)
  })
  it('keeps outer shadows, including negative offsets and multiple layers', () => {
    const { root, section } = fixture(100)
    section.style.boxShadow =
      'rgba(0, 0, 0, 0.2) -30px -40px 20px 2px, rgb(0, 0, 0) 0px 40px 30px 0px'
    const result = measurePatternCapture(root)
    expect(root.style.left).toBe('38px')
    expect(root.style.top).toBe('48px')
    expect(result.height).toBe(257)
    expect(result.width).toBeGreaterThanOrEqual(1238)
  })
  it('does not add whitespace for inset shadows', () => {
    const { root, section } = fixture(100)
    section.style.boxShadow = 'inset 0px 0px 200px 100px rgb(0, 0, 0)'
    expect(measurePatternCapture(root).height).toBe(148)
  })
})
