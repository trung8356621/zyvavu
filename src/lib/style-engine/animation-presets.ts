export type AnimationTrigger = 'entrance' | 'loop' | 'scroll' | 'hover'
export type AnimationTarget = 'widget' | 'section' | 'dropdown'
export interface AnimationConfig {
  preset: 'none' | 'fade' | 'slide-down' | 'pulse' | 'lift' | 'scroll-fade'
  trigger: AnimationTrigger
  target: AnimationTarget
  options?: { duration?: 'fast' | 'normal' | 'slow' }
}

export const ANIMATION_PRESETS = [
  {
    id: 'none',
    dropdownTransition: 'none',
    name: 'None',
    trigger: 'entrance',
    targets: ['widget', 'section', 'dropdown'],
    implemented: true,
  },
  {
    id: 'fade',
    dropdownTransition: 'opacity 200ms ease',
    name: 'Fade',
    trigger: 'entrance',
    targets: ['widget', 'section', 'dropdown'],
    implemented: true,
  },
  {
    id: 'slide-down',
    dropdownTransition: 'transform 250ms ease, opacity 250ms ease',
    name: 'Slide Down',
    trigger: 'entrance',
    targets: ['widget', 'section', 'dropdown'],
    implemented: true,
  },
  {
    id: 'pulse',
    name: 'Gentle pulse',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
  },
  { id: 'lift', name: 'Lift', trigger: 'hover', targets: ['widget', 'section'], implemented: true },
  {
    id: 'scroll-fade',
    name: 'Scroll fade — shell only',
    trigger: 'scroll',
    targets: ['widget', 'section'],
    implemented: false,
  },
] as const

export function compatibleAnimations(target: AnimationTarget) {
  return ANIMATION_PRESETS.filter((p) => (p.targets as readonly string[]).includes(target))
}

export function isAnimationSupported(value: AnimationConfig): boolean {
  const preset = ANIMATION_PRESETS.find((p) => p.id === value.preset)
  return Boolean(
    preset?.implemented &&
    preset.trigger === value.trigger &&
    (preset.targets as readonly string[]).includes(value.target) &&
    (!value.options?.duration || ['fast', 'normal', 'slow'].includes(value.options.duration)),
  )
}

export function animationAttributes(value?: AnimationConfig) {
  return value && isAnimationSupported(value) && value.preset !== 'none'
    ? {
        'data-zyvavu-motion': value.preset,
        'data-zyvavu-speed': value.options?.duration || 'normal',
      }
    : {}
}

/** Visible by default: unsupported CSS or reduced motion never hides content. */
export const ANIMATION_CSS = `
@keyframes zyvavu-motion-fade { from { opacity: .3 } to { opacity: 1 } }
@keyframes zyvavu-motion-slide { from { opacity: .3; transform: translateY(-8px) } to { opacity: 1; transform: none } }
@keyframes zyvavu-motion-pulse { 50% { transform: scale(1.015) } }
@keyframes zyvavu-motion-lift-preview { 50% { transform: translateY(-3px) } }
@media (prefers-reduced-motion: reduce) { [data-widget-style-surface] video { display: none; } }
@media (prefers-reduced-motion: no-preference) {
  [data-zyvavu-motion] { --zyvavu-motion-duration: 250ms; }
  [data-zyvavu-speed="fast"] { --zyvavu-motion-duration: 150ms; }
  [data-zyvavu-speed="slow"] { --zyvavu-motion-duration: 500ms; }
  [data-zyvavu-motion="fade"] { animation: zyvavu-motion-fade var(--zyvavu-motion-duration) ease; }
  [data-zyvavu-motion="slide-down"] { animation: zyvavu-motion-slide var(--zyvavu-motion-duration) ease; }
  [data-zyvavu-motion="pulse"] { animation: zyvavu-motion-pulse calc(var(--zyvavu-motion-duration) * 12) ease-in-out infinite; }
  [data-zyvavu-motion="lift"] { transition: transform var(--zyvavu-motion-duration) ease; }
  [data-zyvavu-motion="lift"]:is(:hover, :focus-within) { transform: translateY(-3px); }
  [data-zyvavu-motion="lift"][data-zyvavu-motion-preview="true"] { animation: zyvavu-motion-lift-preview var(--zyvavu-motion-duration) ease; }
}
`
