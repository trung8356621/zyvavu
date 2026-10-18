import { isAnimationSupported, type AnimationConfig } from './animation-presets'

/** Ephemeral WAAPI playback: never touches component props, keys, or document history. */
export function replayAnimation(element: HTMLElement, config?: AnimationConfig): () => void {
  const win = element.ownerDocument.defaultView
  if (
    !config ||
    !isAnimationSupported(config) ||
    config.preset === 'none' ||
    win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    !element.animate
  )
    return () => {}
  const original = win?.getComputedStyle(element)
  const transform = original?.transform === 'none' ? '' : original?.transform || ''
  const opacity = original?.opacity || '1'
  const frames: Record<string, Keyframe[]> = {
    fade: [{ opacity: 0.3 }, { opacity }],
    'slide-down': [
      { opacity: 0.3, transform: `${transform} translateY(-8px)` },
      { opacity, transform: transform || 'none' },
    ],
    pulse: [
      { transform: transform || 'none' },
      { transform: `${transform} scale(1.015)` },
      { transform: transform || 'none' },
    ],
    lift: [
      { transform: transform || 'none' },
      { transform: `${transform} translateY(-3px)` },
      { transform: transform || 'none' },
    ],
  }
  const duration = { fast: 150, normal: 250, slow: 500 }[config.options?.duration || 'normal']
  const animation = element.animate(frames[config.preset], {
    duration: config.trigger === 'loop' ? duration * 4 : duration,
    easing: 'ease-in-out',
    iterations: 1,
    fill: 'none',
  })
  const preference = win?.matchMedia?.('(prefers-reduced-motion: reduce)')
  const cancel = () => {
    animation.cancel()
    preference?.removeEventListener?.('change', cancel)
  }
  preference?.addEventListener?.('change', cancel)
  animation.onfinish = cancel
  return cancel
}

export function replayWidgetAnimation(
  id: string,
  config?: AnimationConfig,
): { cancel: () => void; message?: string } {
  const documents = [document]
  const frame = document.querySelector<HTMLIFrameElement>('.zyvavu-puck-host-wrapper iframe')
  try {
    if (frame?.contentDocument) documents.unshift(frame.contentDocument)
  } catch {
    /* inaccessible iframe */
  }
  for (const doc of documents) {
    const surface = [...doc.querySelectorAll<HTMLElement>('[data-widget-style-surface]')].find(
      (node) => node.dataset.widgetStyleSurface === id,
    )
    const section = doc.getElementById(id)
    const overlay = [...doc.querySelectorAll<HTMLElement>('[data-puck-component]')].find(
      (node) => node.dataset.puckComponent === id,
    )
    const target =
      surface || section || overlay?.querySelector<HTMLElement>('.zyvavu-widget-section')
    if (target) {
      if (doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
        return {
          cancel: () => {},
          message: 'Animation preview is disabled by reduced motion preference.',
        }
      if (!target.animate)
        return { cancel: () => {}, message: 'Animation playback is unavailable in this browser.' }
      return { cancel: replayAnimation(target, config) }
    }
  }
  return { cancel: () => {}, message: 'The widget is not available in the current canvas.' }
}
