import { describe, expect, it, vi } from 'vitest'
import {
  ANIMATION_CSS,
  ANIMATION_PRESETS,
  BLOCKED_WIX_ANIMATION_SLOTS,
  animationAttributes,
  animationCssVars,
  isAnimationSupported,
  resolveAnimationOptions,
  resolveDurationSec,
} from '@/lib/style-engine/animation-presets'
import { replayAnimation, replayWidgetAnimation } from '@/lib/style-engine/animation-replay'

describe('Entrance & Loop expansion contract', () => {
  it('implements verified Fade/Breathe plus distinct ZYVAVU_DEFAULT Entrance/Loop motions', () => {
    const entrance = ANIMATION_PRESETS.filter((p) => p.trigger === 'entrance' && p.id !== 'none')
    const loop = ANIMATION_PRESETS.filter((p) => p.trigger === 'loop')
    expect(entrance.filter((p) => p.implemented).map((p) => p.id)).toEqual([
      'fade',
      'slide-down',
      'grow-in',
      'bounce-in',
      'spin-in',
      'float-in',
    ])
    expect(loop.filter((p) => p.implemented).map((p) => p.id)).toEqual([
      'breathe',
      'pulse',
      'bounce',
      'spin',
      'wiggle',
      'flash',
    ])
    expect(ANIMATION_PRESETS.find((p) => p.id === 'fade')?.evidence).toBe('OBSERVED_WIX')
    expect(ANIMATION_PRESETS.find((p) => p.id === 'breathe')?.evidence).toBe('OBSERVED_WIX')
    expect(BLOCKED_WIX_ANIMATION_SLOTS.entrance).toHaveLength(13)
    expect(BLOCKED_WIX_ANIMATION_SLOTS.loop).toHaveLength(7)
  })

  it('applies Wix-aligned Fade and Breathe defaults and per-effect control validation', () => {
    expect(
      resolveAnimationOptions({
        preset: 'fade',
        trigger: 'entrance',
        target: 'widget',
      }),
    ).toMatchObject({ durationSec: 1.2, delaySec: 0 })
    expect(
      resolveAnimationOptions({
        preset: 'breathe',
        trigger: 'loop',
        target: 'widget',
      }),
    ).toMatchObject({ direction: 'vertical', distancePx: 25, durationSec: 4, loopDelaySec: 0 })

    expect(
      isAnimationSupported({
        preset: 'fade',
        trigger: 'entrance',
        target: 'widget',
        options: { durationSec: 2, delaySec: 0.5 },
      }),
    ).toBe(true)
    expect(
      isAnimationSupported({
        preset: 'breathe',
        trigger: 'loop',
        target: 'widget',
        options: { direction: 'horizontal', distancePx: 31, durationSec: 4 },
      }),
    ).toBe(true)
    expect(
      isAnimationSupported({
        preset: 'fade',
        trigger: 'entrance',
        target: 'widget',
        options: { durationSec: 99 },
      }),
    ).toBe(false)
    expect(
      isAnimationSupported({
        preset: 'grow-in',
        trigger: 'loop',
        target: 'widget',
      }),
    ).toBe(false)
  })

  it('serializes runtime attributes/CSS vars distinctly per motion', () => {
    const fade = animationAttributes({
      preset: 'fade',
      trigger: 'entrance',
      target: 'widget',
      options: { durationSec: 1.2, delaySec: 0.2 },
    })
    expect(fade).toMatchObject({
      'data-zyvavu-motion': 'fade',
      'data-zyvavu-duration': '1.2',
      'data-zyvavu-delay': '0.2',
    })
    const breathe = animationCssVars({
      preset: 'breathe',
      trigger: 'loop',
      target: 'section',
      options: { direction: 'horizontal', distancePx: 31, durationSec: 4 },
    })
    expect(breathe['--zyvavu-motion-duration' as keyof typeof breathe]).toBe('4s')
    expect(breathe['--zyvavu-motion-distance' as keyof typeof breathe]).toBe('31px')
    expect(breathe['--zyvavu-motion-axis-x' as keyof typeof breathe]).toBe('1')
    expect(ANIMATION_CSS).toContain('zyvavu-motion-breathe')
    expect(ANIMATION_CSS).toContain('zyvavu-motion-grow-in')
    expect(ANIMATION_CSS).toContain('zyvavu-motion-wiggle')
    expect(resolveDurationSec({ duration: 'fast' })).toBe(0.15)
  })

  it('replays each implemented Entrance/Loop preset with unique keyframes', () => {
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn(), onfinish: null })
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.animate = animate
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const seen = new Set<string>()
    for (const preset of ANIMATION_PRESETS.filter(
      (p) => p.implemented && (p.trigger === 'entrance' || p.trigger === 'loop') && p.id !== 'none',
    )) {
      animate.mockClear()
      replayAnimation(el, {
        preset: preset.id,
        trigger: preset.trigger,
        target: 'widget',
        options: 'defaults' in preset ? preset.defaults : undefined,
      })
      expect(animate).toHaveBeenCalled()
      const frames = animate.mock.calls[0][0] as Keyframe[]
      expect(frames.length).toBeGreaterThan(0)
      seen.add(JSON.stringify(frames))
    }
    expect(seen.size).toBeGreaterThan(8)
    el.remove()
  })

  it('allows forced editor canvas replay under reduced motion without writing attrs', () => {
    const element = document.createElement('div')
    element.dataset.widgetStyleSurface = 'rm-1'
    document.body.append(element)
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn(), onfinish: null })
    element.animate = animate
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const blocked = replayWidgetAnimation('rm-1', {
      preset: 'fade',
      trigger: 'entrance',
      target: 'widget',
    })
    expect(animate).not.toHaveBeenCalled()
    expect(blocked.message).toMatch(/reduced motion/i)
    const forced = replayWidgetAnimation(
      'rm-1',
      { preset: 'fade', trigger: 'entrance', target: 'widget' },
      { force: true },
    )
    expect(animate).toHaveBeenCalledOnce()
    expect(forced.message).toMatch(/Editor preview is running/i)
    element.remove()
  })
})
