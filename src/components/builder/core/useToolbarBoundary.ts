import { useLayoutEffect, useRef } from 'react'

export function toolbarOffset(
  rect: { left: number; top: number; width: number; height: number },
  bounds: { left: number; top: number; right: number; bottom: number },
) {
  const left = Math.max(bounds.left, Math.min(rect.left, bounds.right - rect.width))
  const top = Math.max(bounds.top, Math.min(rect.top, bounds.bottom - rect.height))
  return { x: left - rect.left, y: top - rect.top }
}

/** Keep Puck's native overlay/zoom positioning; constrain only our shared action surface. */
export function useToolbarBoundary() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const doc = element.ownerDocument
    const win = doc.defaultView
    if (!win) return
    let frame = 0
    let offset = { x: 0, y: 0 }
    const update = () => {
      const canvas = doc.querySelector('#preview-frame') || element.closest('[data-puck-preview]')
      const canvasRect = canvas?.getBoundingClientRect()
      const bounds = {
        left: Math.max(8, (canvasRect?.left || 0) + 8),
        top: Math.max(8, (canvasRect?.top || 0) + 8),
        right: Math.min(win.innerWidth - 8, (canvasRect?.right || win.innerWidth) - 8),
        bottom: Math.min(win.innerHeight - 8, (canvasRect?.bottom || win.innerHeight) - 8),
      }
      element.style.maxWidth = `${Math.max(0, bounds.right - bounds.left)}px`
      const rect = element.getBoundingClientRect()
      const natural = { left: rect.left - offset.x, top: rect.top - offset.y }
      const preferredTop = natural.top - rect.height - 16
      const clamped = toolbarOffset({ left: natural.left, top: preferredTop, width: rect.width, height: rect.height }, bounds)
      offset = { x: clamped.x, y: preferredTop + clamped.y - natural.top }
      element.style.translate = `${offset.x}px ${offset.y}px`
    }
    const schedule = () => {
      win.cancelAnimationFrame(frame)
      frame = win.requestAnimationFrame(update)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    const mutations = new MutationObserver(schedule)
    // Puck moves these two native overlay ancestors on selection, scroll and zoom.
    if (element.parentElement) mutations.observe(element.parentElement, { attributes: true, attributeFilter: ['style'] })
    if (element.parentElement?.parentElement) mutations.observe(element.parentElement.parentElement, { attributes: true, attributeFilter: ['style'] })
    doc.addEventListener('scroll', schedule, true)
    win.addEventListener('resize', schedule)
    update()
    return () => {
      win.cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      doc.removeEventListener('scroll', schedule, true)
      win.removeEventListener('resize', schedule)
    }
  }, [])
  return ref
}
