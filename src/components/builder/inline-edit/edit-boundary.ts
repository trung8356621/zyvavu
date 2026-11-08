export type RectLike = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

/**
 * Map an element's client rect into `targetWin`'s viewport space.
 * When the element lives in Puck's preview iframe, iframe-local
 * getBoundingClientRect values are offset (and scaled) by each frameElement.
 */
export function mapElementRectToWindow(el: HTMLElement, targetWin: Window): RectLike {
  const rect = el.getBoundingClientRect()
  const elWin = el.ownerDocument.defaultView
  if (!elWin || elWin === targetWin) {
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    }
  }

  let left = rect.left
  let top = rect.top
  let width = rect.width
  let height = rect.height
  let frame: Element | null = elWin.frameElement

  while (frame instanceof HTMLElement) {
    const fr = frame.getBoundingClientRect()
    const scaleX = frame.offsetWidth ? fr.width / frame.offsetWidth : 1
    const scaleY = frame.offsetHeight ? fr.height / frame.offsetHeight : 1
    left = left * scaleX + fr.left
    top = top * scaleY + fr.top
    width *= scaleX
    height *= scaleY
    const nextWin = frame.ownerDocument.defaultView
    if (!nextWin || nextWin === targetWin) break
    frame = nextWin.frameElement
  }

  return {
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }
}

/** Position a portaled toolbar relative to the editor surface (flip when clipped). */
export function computeToolbarPosition(
  anchor: RectLike,
  toolbar: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 8,
): { top: number; left: number; placement: 'above' | 'below' } {
  const spaceAbove = anchor.top - gap
  const placement: 'above' | 'below' =
    spaceAbove >= toolbar.height + 8 ? 'above' : 'below'
  let top =
    placement === 'above'
      ? anchor.top - toolbar.height - gap
      : anchor.bottom + gap
  top = Math.max(8, Math.min(top, viewport.height - toolbar.height - 8))
  let left = anchor.left
  left = Math.max(8, Math.min(left, viewport.width - toolbar.width - 8))
  return { top, left, placement }
}
