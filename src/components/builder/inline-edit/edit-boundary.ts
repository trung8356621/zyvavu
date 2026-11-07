export type RectLike = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Position a portaled toolbar relative to the editor surface (flip when clipped). */
export function computeToolbarPosition(
  anchor: RectLike,
  toolbar: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 6,
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
