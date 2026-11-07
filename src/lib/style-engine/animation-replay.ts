import {
  isAnimationSupported,
  resolveAnimationOptions,
  resolveDurationSec,
  type AnimationConfig,
  type AnimationDirection,
} from './animation-presets'

export type AnimationReplayOptions = {
  /**
   * Editor-only: allow WAAPI preview even when prefers-reduced-motion is set.
   * Website runtime CSS still respects reduced motion; this never writes history.
   */
  force?: boolean
}

const REPLAY_ID = 'zyvavu-motion-replay'

function axisOffset(direction: AnimationDirection | undefined, distance: number) {
  const dir = direction || 'down'
  if (dir === 'horizontal') return { x: distance, y: 0 }
  if (dir === 'vertical' || dir === 'down') return { x: 0, y: -distance }
  if (dir === 'up') return { x: 0, y: distance }
  if (dir === 'left') return { x: distance, y: 0 }
  if (dir === 'right') return { x: -distance, y: 0 }
  return { x: 0, y: -distance }
}

function composeTransform(base: string, extra: string) {
  return `${base} ${extra}`.trim() || 'none'
}

function reducedMotionPreferred(win: Window | null | undefined) {
  return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

/** Cancel prior Zyvavu WAAPI previews on this element so replays do not stack. */
export function cancelElementMotionReplay(element: HTMLElement): void {
  const animations = typeof element.getAnimations === 'function' ? element.getAnimations() : []
  for (const animation of animations) {
    if ((animation as Animation & { id?: string }).id === REPLAY_ID) animation.cancel()
  }
}

function findMotionTarget(id: string): HTMLElement | null {
  const documents: Document[] = [document]
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
    if (target) return target
  }
  return null
}

export function cancelWidgetAnimation(id: string): void {
  const target = findMotionTarget(id)
  if (target) cancelElementMotionReplay(target)
}

/** Ephemeral WAAPI playback: never touches component props, keys, or document history. */
export function replayAnimation(
  element: HTMLElement,
  config?: AnimationConfig,
  options: AnimationReplayOptions = {},
): () => void {
  const win = element.ownerDocument.defaultView
  if (
    !config ||
    !isAnimationSupported(config) ||
    config.preset === 'none' ||
    (!options.force && reducedMotionPreferred(win)) ||
    !element.animate
  )
    return () => {}

  cancelElementMotionReplay(element)

  const original = win?.getComputedStyle(element)
  const transform = original?.transform === 'none' ? '' : original?.transform || ''
  const opacity = original?.opacity || '1'
  const opts = resolveAnimationOptions(config)
  const durationSec = resolveDurationSec(opts, config.trigger === 'loop' ? 1.5 : 0.8)
  const distance = typeof opts.distancePx === 'number' ? opts.distancePx : 25
  const delayMs = (typeof opts.delaySec === 'number' ? opts.delaySec : 0) * 1000
  const slide = axisOffset(opts.direction, 24)
  const breathe = axisOffset(
    opts.direction === 'horizontal' ? 'horizontal' : 'vertical',
    distance,
  )

  const frames: Record<string, Keyframe[]> = {
    fade: [{ opacity: 0.3 }, { opacity }],
    'slide-down': [
      {
        opacity: 0.3,
        transform: composeTransform(transform, `translate(${slide.x}px, ${slide.y}px)`),
      },
      { opacity, transform: transform || 'none' },
    ],
    'grow-in': [
      { opacity: 0.3, transform: composeTransform(transform, 'scale(0.72)') },
      { opacity, transform: transform || 'none' },
    ],
    'bounce-in': [
      { opacity: 0.3, transform: composeTransform(transform, 'translateY(-28px)') },
      { opacity, transform: composeTransform(transform, 'translateY(6px)') },
      { transform: composeTransform(transform, 'translateY(-3px)') },
      { transform: transform || 'none' },
    ],
    'spin-in': [
      { opacity: 0.3, transform: composeTransform(transform, 'rotate(-120deg) scale(0.85)') },
      { opacity, transform: transform || 'none' },
    ],
    'float-in': [
      { opacity: 0, transform: composeTransform(transform, 'translateY(14px)') },
      { opacity, transform: transform || 'none' },
    ],
    breathe: [
      { transform: transform || 'none' },
      {
        transform: composeTransform(
          transform,
          `translate(${breathe.x}px, ${breathe.y === 0 ? -distance : -Math.abs(breathe.y || distance)}px)`,
        ),
      },
      { transform: transform || 'none' },
    ],
    pulse: [
      { transform: transform || 'none' },
      { transform: composeTransform(transform, 'scale(1.04)') },
      { transform: transform || 'none' },
    ],
    bounce: [
      { transform: transform || 'none' },
      { transform: composeTransform(transform, `translateY(-${distance}px)`) },
      { transform: transform || 'none' },
    ],
    spin: [
      { transform: transform || 'none' },
      { transform: composeTransform(transform, 'rotate(360deg)') },
    ],
    wiggle: [
      { transform: transform || 'none' },
      { transform: composeTransform(transform, 'rotate(-6deg)') },
      { transform: composeTransform(transform, 'rotate(6deg)') },
      { transform: transform || 'none' },
    ],
    flash: [{ opacity }, { opacity: 0.35 }, { opacity }],
    lift: [
      { transform: transform || 'none' },
      { transform: composeTransform(transform, 'translateY(-3px)') },
      { transform: transform || 'none' },
    ],
  }

  const keyframes = frames[config.preset]
  if (!keyframes) return () => {}

  const animation = element.animate(keyframes, {
    duration: Math.round(durationSec * 1000),
    delay: delayMs,
    easing: config.preset === 'spin' ? 'linear' : 'ease-in-out',
    iterations: 1,
    // Never leave filled keyframes that could stick transform/opacity on the node.
    fill: 'none',
    id: REPLAY_ID,
  })
  const cancel = () => {
    animation.cancel()
  }
  animation.onfinish = cancel
  return cancel
}

export function replayWidgetAnimation(
  id: string,
  config?: AnimationConfig,
  options: AnimationReplayOptions = {},
): { cancel: () => void; message?: string } {
  const target = findMotionTarget(id)
  if (!target) {
    return { cancel: () => {}, message: 'The widget is not available in the current canvas.' }
  }
  if (!target.animate) {
    return { cancel: () => {}, message: 'Animation playback is unavailable in this browser.' }
  }
  const reduced = reducedMotionPreferred(target.ownerDocument.defaultView)
  if (reduced && !options.force) {
    return {
      cancel: () => {},
      message: 'Animation preview is disabled by reduced motion preference.',
    }
  }
  const cancel = replayAnimation(target, config, options)
  return {
    cancel,
    message:
      reduced && options.force
        ? 'Editor preview is running while the system prefers reduced motion. Published pages still respect that preference.'
        : undefined,
  }
}
