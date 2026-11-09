/**
 * Animation preset registry + runtime CSS.
 *
 * Wix evidence used for verified controls/motion:
 * - FadeIn duration/delay + opacity playback: E220, E224, E229, E234
 * - Breathe direction/distance/duration/loop-delay + translateY: E216, E219, E227, E234
 *
 * Other Entrance/Loop motions here are ZYVAVU_DEFAULT interpretations of named
 * Wix catalog slots (E213/E228/E235) where sampled motion was not recorded.
 * Scroll/Mouse remain out of scope for this expansion batch.
 */

import type { CSSProperties } from 'react'

export type AnimationTrigger = 'entrance' | 'loop' | 'scroll' | 'hover'
export type AnimationTarget = 'widget' | 'section' | 'dropdown'

/** Legacy token durations (still accepted for saved docs). */
export type AnimationDurationToken = 'fast' | 'normal' | 'slow'

export type AnimationDirection =
  | 'vertical'
  | 'horizontal'
  | 'up'
  | 'down'
  | 'left'
  | 'right'

export type AnimationPresetId =
  | 'none'
  | 'fade'
  | 'slide-down'
  | 'grow-in'
  | 'bounce-in'
  | 'spin-in'
  | 'float-in'
  | 'breathe'
  | 'pulse'
  | 'bounce'
  | 'spin'
  | 'wiggle'
  | 'flash'
  | 'lift'
  | 'scroll-fade'

export type AnimationControlKey =
  | 'durationSec'
  | 'delaySec'
  | 'direction'
  | 'distancePx'
  | 'loopDelaySec'
  | 'duration' // legacy token — only when effect opts into it

export interface AnimationOptions {
  /** @deprecated Prefer durationSec. Kept for saved documents. */
  duration?: AnimationDurationToken
  /** Seconds. FadeIn Wix default 1.2 (E220). */
  durationSec?: number
  /** Seconds. FadeIn Wix default 0 (E220). */
  delaySec?: number
  /** Breathe Wix Dọc/Ngang (E216); slide ZYVAVU_DEFAULT axes. */
  direction?: AnimationDirection
  /** Breathe Wix default 25 px (E216/E219). */
  distancePx?: number
  /** Breathe inter-loop delay Wix default 0 s (E216). */
  loopDelaySec?: number
}

export interface AnimationConfig {
  preset: AnimationPresetId
  trigger: AnimationTrigger
  target: AnimationTarget
  options?: AnimationOptions
}

export type AnimationEvidence =
  | 'OBSERVED_WIX'
  | 'ZYVAVU_DEFAULT'
  | 'SHELL_ONLY'
  | 'LEGACY_ZYVAVU'

type PresetDef = {
  id: AnimationPresetId
  name: string
  trigger: AnimationTrigger
  targets: readonly AnimationTarget[]
  implemented: boolean
  thumbnail: AnimationPresetId
  controls: readonly AnimationControlKey[]
  evidence: AnimationEvidence
  wixSlot?: string
  defaults?: AnimationOptions
  dropdownTransition?: string
}

export const ANIMATION_PRESETS = [
  {
    id: 'none',
    name: 'None',
    trigger: 'entrance',
    targets: ['widget', 'section', 'dropdown'],
    implemented: true,
    thumbnail: 'none',
    controls: [],
    evidence: 'OBSERVED_WIX',
    wixSlot: 'None',
    dropdownTransition: 'none',
  },
  {
    id: 'fade',
    name: 'Fade',
    trigger: 'entrance',
    targets: ['widget', 'section', 'dropdown'],
    implemented: true,
    thumbnail: 'fade',
    controls: ['durationSec', 'delaySec'],
    evidence: 'OBSERVED_WIX',
    wixSlot: 'FadeIn',
    defaults: { durationSec: 1.2, delaySec: 0 },
    dropdownTransition: 'opacity 200ms ease',
  },
  {
    id: 'slide-down',
    name: 'Slide',
    trigger: 'entrance',
    targets: ['widget', 'section', 'dropdown'],
    implemented: true,
    thumbnail: 'slide-down',
    controls: ['durationSec', 'delaySec', 'direction'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'SlideIn',
    defaults: { durationSec: 0.8, delaySec: 0, direction: 'down' },
    dropdownTransition: 'transform 250ms ease, opacity 250ms ease',
  },
  {
    id: 'grow-in',
    name: 'Grow',
    trigger: 'entrance',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'grow-in',
    controls: ['durationSec', 'delaySec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'GrowIn',
    defaults: { durationSec: 0.8, delaySec: 0 },
  },
  {
    id: 'bounce-in',
    name: 'Bounce In',
    trigger: 'entrance',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'bounce-in',
    controls: ['durationSec', 'delaySec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'BounceIn',
    defaults: { durationSec: 0.9, delaySec: 0 },
  },
  {
    id: 'spin-in',
    name: 'Spin In',
    trigger: 'entrance',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'spin-in',
    controls: ['durationSec', 'delaySec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'SpinIn',
    defaults: { durationSec: 0.8, delaySec: 0 },
  },
  {
    id: 'float-in',
    name: 'Float In',
    trigger: 'entrance',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'float-in',
    controls: ['durationSec', 'delaySec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'FloatIn',
    defaults: { durationSec: 1, delaySec: 0 },
  },
  {
    id: 'breathe',
    name: 'Breathe',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'breathe',
    controls: ['direction', 'distancePx', 'durationSec', 'loopDelaySec'],
    evidence: 'OBSERVED_WIX',
    wixSlot: 'Breathe',
    defaults: { direction: 'vertical', distancePx: 25, durationSec: 4, loopDelaySec: 0 },
  },
  {
    id: 'pulse',
    name: 'Pulse',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'pulse',
    controls: ['durationSec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'Pulse',
    defaults: { durationSec: 1.5 },
  },
  {
    id: 'bounce',
    name: 'Bounce',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'bounce',
    controls: ['durationSec', 'distancePx'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'Bounce',
    defaults: { durationSec: 1.2, distancePx: 12 },
  },
  {
    id: 'spin',
    name: 'Spin',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'spin',
    controls: ['durationSec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'Spin',
    defaults: { durationSec: 2 },
  },
  {
    id: 'wiggle',
    name: 'Wiggle',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'wiggle',
    controls: ['durationSec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'Wiggle',
    defaults: { durationSec: 0.8 },
  },
  {
    id: 'flash',
    name: 'Flash',
    trigger: 'loop',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'flash',
    controls: ['durationSec'],
    evidence: 'ZYVAVU_DEFAULT',
    wixSlot: 'Flash',
    defaults: { durationSec: 1.2 },
  },
  {
    id: 'lift',
    name: 'Lift',
    trigger: 'hover',
    targets: ['widget', 'section'],
    implemented: true,
    thumbnail: 'lift',
    controls: ['duration'],
    evidence: 'LEGACY_ZYVAVU',
    defaults: { duration: 'normal' },
  },
  {
    id: 'scroll-fade',
    name: 'Scroll fade — shell only',
    trigger: 'scroll',
    targets: ['widget', 'section'],
    implemented: false,
    thumbnail: 'scroll-fade',
    controls: [],
    evidence: 'SHELL_ONLY',
    wixSlot: 'FadeScroll',
  },
] as const satisfies readonly PresetDef[]

const DURATION_TOKEN_SEC: Record<AnimationDurationToken, number> = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.5,
}

export function getAnimationPreset(id: AnimationPresetId | string | undefined) {
  return ANIMATION_PRESETS.find((p) => p.id === id)
}

export function compatibleAnimations(target: AnimationTarget) {
  return ANIMATION_PRESETS.filter((p) => (p.targets as readonly string[]).includes(target))
}

export function resolveAnimationOptions(value?: AnimationConfig): AnimationOptions {
  const preset = getAnimationPreset(value?.preset)
  const defaults = (preset && 'defaults' in preset ? preset.defaults : undefined) || {}
  return { ...defaults, ...value?.options }
}

export function resolveDurationSec(options?: AnimationOptions, fallback = 0.8): number {
  if (typeof options?.durationSec === 'number' && Number.isFinite(options.durationSec))
    return Math.min(10, Math.max(0.1, options.durationSec))
  if (options?.duration) return DURATION_TOKEN_SEC[options.duration]
  return fallback
}

function isFiniteNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function isAnimationSupported(value: AnimationConfig): boolean {
  const preset = getAnimationPreset(value.preset)
  if (
    !preset?.implemented ||
    preset.trigger !== value.trigger ||
    !(preset.targets as readonly string[]).includes(value.target)
  )
    return false
  const opts = value.options
  if (!opts) return true
  if (opts.duration && !['fast', 'normal', 'slow'].includes(opts.duration)) return false
  if (opts.durationSec !== undefined && !isFiniteNumber(opts.durationSec, 0.1, 10)) return false
  if (opts.delaySec !== undefined && !isFiniteNumber(opts.delaySec, 0, 10)) return false
  if (opts.loopDelaySec !== undefined && !isFiniteNumber(opts.loopDelaySec, 0, 10)) return false
  if (opts.distancePx !== undefined && !isFiniteNumber(opts.distancePx, 1, 200)) return false
  if (
    opts.direction !== undefined &&
    !['vertical', 'horizontal', 'up', 'down', 'left', 'right'].includes(opts.direction)
  )
    return false
  return true
}

/** Data attributes + CSS custom properties for runtime / SSR surfaces. */
export function animationAttributes(value?: AnimationConfig): Record<string, string> {
  if (!value || !isAnimationSupported(value) || value.preset === 'none') return {}
  const opts = resolveAnimationOptions(value)
  const durationSec = resolveDurationSec(opts, value.trigger === 'loop' ? 1.5 : 0.8)
  const attrs: Record<string, string> = {
    'data-zyvavu-motion': value.preset,
    'data-zyvavu-duration': String(durationSec),
  }
  if (typeof opts.delaySec === 'number') attrs['data-zyvavu-delay'] = String(opts.delaySec)
  if (typeof opts.loopDelaySec === 'number')
    attrs['data-zyvavu-loop-delay'] = String(opts.loopDelaySec)
  if (typeof opts.distancePx === 'number') attrs['data-zyvavu-distance'] = String(opts.distancePx)
  if (opts.direction) attrs['data-zyvavu-direction'] = opts.direction
  if (opts.duration) attrs['data-zyvavu-speed'] = opts.duration
  return attrs
}

export function animationCssVars(value?: AnimationConfig): CSSProperties {
  if (!value || !isAnimationSupported(value) || value.preset === 'none') return {}
  const opts = resolveAnimationOptions(value)
  const durationSec = resolveDurationSec(opts, value.trigger === 'loop' ? 1.5 : 0.8)
  const distance = typeof opts.distancePx === 'number' ? opts.distancePx : 25
  const delay = typeof opts.delaySec === 'number' ? opts.delaySec : 0
  const loopDelay = typeof opts.loopDelaySec === 'number' ? opts.loopDelaySec : 0
  const direction = opts.direction || 'vertical'
  return {
    ['--zyvavu-motion-duration' as string]: `${durationSec}s`,
    ['--zyvavu-motion-delay' as string]: `${delay}s`,
    ['--zyvavu-motion-loop-delay' as string]: `${loopDelay}s`,
    ['--zyvavu-motion-distance' as string]: `${distance}px`,
    ['--zyvavu-motion-axis-x' as string]:
      direction === 'horizontal' || direction === 'left' || direction === 'right' ? '1' : '0',
    ['--zyvavu-motion-axis-y' as string]:
      direction === 'vertical' || direction === 'up' || direction === 'down' || !direction
        ? '1'
        : '0',
    ['--zyvavu-motion-sign-x' as string]: direction === 'left' ? '-1' : '1',
    ['--zyvavu-motion-sign-y' as string]: direction === 'up' ? '-1' : '1',
  } as CSSProperties
}

/** Visible by default: unsupported CSS or reduced motion never hides content. */
export const ANIMATION_CSS = `
@keyframes zyvavu-motion-fade { from { opacity: .3 } to { opacity: 1 } }
@keyframes zyvavu-motion-slide {
  from {
    opacity: .3;
    transform: translate(
      calc(var(--zyvavu-motion-sign-x, 1) * var(--zyvavu-motion-axis-x, 0) * -24px),
      calc(var(--zyvavu-motion-sign-y, 1) * var(--zyvavu-motion-axis-y, 1) * -24px)
    );
  }
  to { opacity: 1; transform: none; }
}
@keyframes zyvavu-motion-grow-in { from { opacity: .3; transform: scale(.72) } to { opacity: 1; transform: none } }
@keyframes zyvavu-motion-bounce-in {
  0% { opacity: .3; transform: translateY(-28px) }
  60% { opacity: 1; transform: translateY(6px) }
  80% { transform: translateY(-3px) }
  100% { transform: none }
}
@keyframes zyvavu-motion-spin-in { from { opacity: .3; transform: rotate(-120deg) scale(.85) } to { opacity: 1; transform: none } }
@keyframes zyvavu-motion-float-in { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes zyvavu-motion-breathe {
  0%, 100% { transform: translate(0, 0) }
  50% {
    transform: translate(
      calc(var(--zyvavu-motion-axis-x, 0) * var(--zyvavu-motion-distance, 25px)),
      calc(var(--zyvavu-motion-axis-y, 1) * var(--zyvavu-motion-distance, 25px) * -1)
    );
  }
}
@keyframes zyvavu-motion-pulse { 50% { transform: scale(1.04) } }
@keyframes zyvavu-motion-bounce-loop {
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(calc(var(--zyvavu-motion-distance, 12px) * -1)) }
}
@keyframes zyvavu-motion-spin-loop { to { transform: rotate(360deg) } }
@keyframes zyvavu-motion-wiggle {
  0%, 100% { transform: rotate(0deg) }
  25% { transform: rotate(-6deg) }
  75% { transform: rotate(6deg) }
}
@keyframes zyvavu-motion-flash {
  0%, 100% { opacity: 1 }
  40% { opacity: .35 }
  60% { opacity: 1 }
}
@keyframes zyvavu-motion-lift-preview { 50% { transform: translateY(-3px) } }
@media (prefers-reduced-motion: reduce) {
  [data-widget-style-surface] video { display: none; }
  /* Content Video atom: reveal static poster when motion video is suppressed. */
  [data-zyvavu-content-video] [data-zyvavu-video-poster] {
    display: block !important;
    position: relative !important;
    inset: auto !important;
    height: auto !important;
  }
}
[data-zyvavu-content-video] [data-zyvavu-video-poster] { display: none; }
@media (prefers-reduced-motion: no-preference) {
  /*
   * Layout-stable motion contract:
   * - Animate opacity/transform only (never box-model geometry).
   * - Never set z-index or position — preserve stacking context.
   * - Entrance uses fill-mode backwards (not both) so finished fills do not
   *   permanently override an existing stylesheet transform with "none".
   */
  [data-zyvavu-motion] {
    --zyvavu-motion-duration: 0.8s;
    --zyvavu-motion-delay: 0s;
    --zyvavu-motion-loop-delay: 0s;
    --zyvavu-motion-distance: 25px;
  }
  [data-zyvavu-speed="fast"] { --zyvavu-motion-duration: 0.15s; }
  [data-zyvavu-speed="normal"] { --zyvavu-motion-duration: 0.25s; }
  [data-zyvavu-speed="slow"] { --zyvavu-motion-duration: 0.5s; }
  [data-zyvavu-motion="fade"] {
    animation: zyvavu-motion-fade var(--zyvavu-motion-duration) ease var(--zyvavu-motion-delay) backwards;
  }
  [data-zyvavu-motion="slide-down"] {
    animation: zyvavu-motion-slide var(--zyvavu-motion-duration) ease var(--zyvavu-motion-delay) backwards;
  }
  [data-zyvavu-motion="grow-in"] {
    animation: zyvavu-motion-grow-in var(--zyvavu-motion-duration) ease var(--zyvavu-motion-delay) backwards;
  }
  [data-zyvavu-motion="bounce-in"] {
    animation: zyvavu-motion-bounce-in var(--zyvavu-motion-duration) ease var(--zyvavu-motion-delay) backwards;
  }
  [data-zyvavu-motion="spin-in"] {
    animation: zyvavu-motion-spin-in var(--zyvavu-motion-duration) ease var(--zyvavu-motion-delay) backwards;
  }
  [data-zyvavu-motion="float-in"] {
    animation: zyvavu-motion-float-in var(--zyvavu-motion-duration) ease var(--zyvavu-motion-delay) backwards;
  }
  [data-zyvavu-motion="breathe"] {
    animation: zyvavu-motion-breathe var(--zyvavu-motion-duration) ease-in-out var(--zyvavu-motion-loop-delay) infinite;
  }
  [data-zyvavu-motion="pulse"] {
    animation: zyvavu-motion-pulse var(--zyvavu-motion-duration) ease-in-out infinite;
  }
  [data-zyvavu-motion="bounce"] {
    animation: zyvavu-motion-bounce-loop var(--zyvavu-motion-duration) ease-in-out infinite;
  }
  [data-zyvavu-motion="spin"] {
    animation: zyvavu-motion-spin-loop var(--zyvavu-motion-duration) linear infinite;
  }
  [data-zyvavu-motion="wiggle"] {
    animation: zyvavu-motion-wiggle var(--zyvavu-motion-duration) ease-in-out infinite;
  }
  [data-zyvavu-motion="flash"] {
    animation: zyvavu-motion-flash var(--zyvavu-motion-duration) ease-in-out infinite;
  }
  [data-zyvavu-motion="lift"] { transition: transform var(--zyvavu-motion-duration) ease; }
  [data-zyvavu-motion="lift"]:is(:hover, :focus-within) { transform: translateY(-3px); }
  [data-zyvavu-motion="lift"][data-zyvavu-motion-preview="true"] {
    animation: zyvavu-motion-lift-preview var(--zyvavu-motion-duration) ease;
  }
}
`

/** Entrance/Loop slots blocked this batch (thumbnail-only or unverified motion). */
export const BLOCKED_WIX_ANIMATION_SLOTS = {
  entrance: [
    { wixName: 'ShuttersIn', reason: 'RESEARCH_GAP', missing: 'Motion sample + controls; clip/shutter path unknown' },
    { wixName: 'FoldIn', reason: 'RESEARCH_GAP', missing: 'Motion sample; 3D fold path unknown' },
    { wixName: 'BlurIn', reason: 'RESEARCH_GAP', missing: 'Motion sample; blur amount/timeline unknown' },
    { wixName: 'TurnIn', reason: 'RESEARCH_GAP', missing: 'Motion sample; axis/degrees unknown' },
    { wixName: 'ExpandIn', reason: 'RESEARCH_GAP', missing: 'Distinct from GrowIn motion unknown' },
    { wixName: 'DropIn', reason: 'RESEARCH_GAP', missing: 'VI label Co lại vs DropIn semantics + motion unknown' },
    { wixName: 'TiltIn', reason: 'RESEARCH_GAP', missing: 'Tilt axis/degrees unknown' },
    { wixName: 'RevealIn', reason: 'RESEARCH_GAP', missing: 'Reveal mask/clip unknown' },
    { wixName: 'ShapeIn', reason: 'RESEARCH_GAP', missing: 'Shape morph path unknown' },
    { wixName: 'GlitchIn', reason: 'RESEARCH_GAP', missing: 'Glitch pattern unknown (VI label Trượt ambiguous)' },
    { wixName: 'ArcIn', reason: 'RESEARCH_GAP', missing: 'Arc path unknown' },
    { wixName: 'FlipIn', reason: 'RESEARCH_GAP', missing: '3D flip axis unknown' },
    { wixName: 'WinkIn', reason: 'RESEARCH_GAP', missing: 'Wink/clip motion unknown' },
  ],
  loop: [
    { wixName: 'Rubber', reason: 'RESEARCH_GAP', missing: 'Motion sample + controls unknown' },
    { wixName: 'Flip', reason: 'RESEARCH_GAP', missing: '3D flip loop unknown' },
    { wixName: 'Poke', reason: 'RESEARCH_GAP', missing: 'Motion sample unknown' },
    { wixName: 'Fold', reason: 'RESEARCH_GAP', missing: 'Fold loop path unknown' },
    { wixName: 'Cross', reason: 'RESEARCH_GAP', missing: 'Cross motion unknown' },
    { wixName: 'Jello', reason: 'RESEARCH_GAP', missing: 'Skew/jello keyframes unknown' },
    { wixName: 'Swing', reason: 'RESEARCH_GAP', missing: 'Pivot/swing path unknown' },
  ],
} as const
