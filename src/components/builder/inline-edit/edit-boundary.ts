export type RectLike = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export function pointInRect(x: number, y: number, rect: RectLike | null | undefined, pad = 0): boolean {
  if (!rect) return false
  return (
    x >= rect.left - pad &&
    x <= rect.right + pad &&
    y >= rect.top - pad &&
    y <= rect.bottom + pad
  )
}

/** Visible Puck widget box — matches the selection outline the user sees. */
export function getPuckComponentRect(from: Element | null): DOMRect | null {
  if (!from) return null
  const host = from.closest('[data-puck-component]')
  return host instanceof HTMLElement ? host.getBoundingClientRect() : null
}

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

export function isInsideEditingChrome(
  x: number,
  y: number,
  target: EventTarget | null,
  boundary: RectLike | null,
  opts?: { pad?: number },
): boolean {
  if (target instanceof Element) {
    if (target.closest('[data-inline-edit-toolbar]')) return true
    if (target.closest('[data-inline-link-modal]')) return true
    if (target.closest('[data-inline-edit-session]')) return true
  }
  return pointInRect(x, y, boundary, opts?.pad ?? 0)
}
