export const PATTERN_CAPTURE_VERSION = 2
export const PATTERN_CAPTURE_WIDTH = 1200

/** Runs inside the capture page; keep self-contained for Playwright serialization. */
export function measurePatternCapture(root: HTMLElement) {
  const frame = root.getBoundingClientRect()
  let left = frame.left
  let top = frame.top
  let right = frame.right
  let bottom = frame.bottom
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    const rect = element.getBoundingClientRect()
    if (!rect.width || !rect.height) continue
    const style = getComputedStyle(element)
    left = Math.min(left, rect.left)
    top = Math.min(top, rect.top)
    right = Math.max(right, rect.right)
    bottom = Math.max(bottom, rect.bottom)
    // Computed shadows use pixel lengths. Strip color functions before splitting layers.
    for (const shadow of [style.boxShadow, style.textShadow]) {
      for (const layer of shadow.replace(/(?:rgba?|hsla?|color)\([^)]*\)/g, '').split(',')) {
        if (layer.includes('inset')) continue
        const lengths = layer.match(/-?(?:\d*\.)?\d+px/g)?.map(parseFloat)
        if (!lengths || lengths.length < 2) continue
        const [x, y, blur = 0, spread = 0] = lengths
        const reach = Math.max(0, blur * 1.5 + spread)
        left = Math.min(left, rect.left + x - reach)
        top = Math.min(top, rect.top + y - reach)
        right = Math.max(right, rect.right + x + reach)
        bottom = Math.max(bottom, rect.bottom + y + reach)
      }
    }
  }
  // Shift only the preview wrapper when an effect extends beyond the page origin.
  // Descendant layout, padding, borders and intentional min-height remain untouched.
  const offsetX = Math.ceil(Math.max(0, -left))
  const offsetY = Math.ceil(Math.max(0, -top))
  root.style.position = 'relative'
  root.style.left = `${offsetX}px`
  root.style.top = `${offsetY}px`
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.ceil(right + offsetX)),
    height: Math.max(1, Math.ceil(bottom + offsetY)),
  }
}
