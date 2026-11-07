import { describe, expect, it, vi } from 'vitest'
import {
  ANIMATION_CSS,
  ANIMATION_PRESETS,
  animationAttributes,
  animationCssVars,
} from '@/lib/style-engine/animation-presets'
import {
  cancelElementMotionReplay,
  replayAnimation,
  replayWidgetAnimation,
} from '@/lib/style-engine/animation-replay'

describe('Animation stability gate', () => {
  it('keeps runtime CSS layout-stable without z-index or absolute positioning', () => {
    expect(ANIMATION_CSS).not.toMatch(/z-index\s*:/)
    expect(ANIMATION_CSS).not.toMatch(/position\s*:\s*absolute/)
    expect(ANIMATION_CSS).not.toMatch(/\b(width|height|margin|top|left|right|bottom)\s*:/)
    // Entrance must not use fill-mode both (would stick transform:none over stylesheet transforms).
    expect(ANIMATION_CSS).toMatch(
      /data-zyvavu-motion="spin-in"\][^{]*\{[^}]*animation:[^;]*backwards/,
    )
    expect(ANIMATION_CSS).toMatch(
      /data-zyvavu-motion="bounce-in"\][^{]*\{[^}]*animation:[^;]*backwards/,
    )
    expect(ANIMATION_CSS).toMatch(
      /data-zyvavu-motion="slide-down"\][^{]*\{[^}]*animation:[^;]*backwards/,
    )
    expect(ANIMATION_CSS).toMatch(
      /data-zyvavu-motion="grow-in"\][^{]*\{[^}]*animation:[^;]*backwards/,
    )
    expect(ANIMATION_CSS).not.toMatch(/animation:[^;]*\bboth\b/)
  })

  it('clears motion attributes for None and never invents stacking vars', () => {
    expect(animationAttributes(undefined)).toEqual({})
    expect(
      animationAttributes({ preset: 'none', trigger: 'entrance', target: 'widget' }),
    ).toEqual({})
    const vars = animationCssVars({
      preset: 'spin-in',
      trigger: 'entrance',
      target: 'widget',
    })
    expect(JSON.stringify(vars)).not.toMatch(/z-index|zIndex/)
  })

  it('composes WAAPI frames with an existing transform and uses fill none', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn(), onfinish: null, id: '' })
    el.animate = animate
    el.getAnimations = vi.fn().mockReturnValue([])
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      transform: 'matrix(1, 0, 0, 1, 10, 20)',
      opacity: '1',
    } as CSSStyleDeclaration)
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })

    replayAnimation(
      el,
      { preset: 'spin-in', trigger: 'entrance', target: 'widget' },
      { force: true },
    )
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          transform: expect.stringContaining('matrix(1, 0, 0, 1, 10, 20)'),
        }),
      ]),
      expect.objectContaining({ fill: 'none', id: 'zyvavu-motion-replay' }),
    )
    const frames = animate.mock.calls[0][0] as Keyframe[]
    expect(frames.at(-1)?.transform).toContain('matrix(1, 0, 0, 1, 10, 20)')
    el.remove()
  })

  it('cancels prior replays before starting another and on explicit cleanup', () => {
    const el = document.createElement('div')
    el.dataset.widgetStyleSurface = 'stable-1'
    document.body.append(el)
    const firstCancel = vi.fn()
    const secondCancel = vi.fn()
    const prior = { id: 'zyvavu-motion-replay', cancel: firstCancel }
    el.getAnimations = vi
      .fn()
      .mockReturnValueOnce([prior])
      .mockReturnValueOnce([prior])
      .mockReturnValue([])
    const animate = vi
      .fn()
      .mockReturnValueOnce({ cancel: secondCancel, onfinish: null, id: 'zyvavu-motion-replay' })
    el.animate = animate
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })

    replayWidgetAnimation(
      'stable-1',
      { preset: 'bounce', trigger: 'loop', target: 'widget' },
      { force: true },
    )
    expect(firstCancel).toHaveBeenCalled()
    expect(animate).toHaveBeenCalledOnce()

    cancelElementMotionReplay(el)
    el.remove()
  })

  it('covers implemented spin/bounce/slide/grow/breathe/wiggle presets in the registry', () => {
    const ids = ANIMATION_PRESETS.filter((p) => p.implemented).map((p) => p.id)
    for (const id of [
      'spin-in',
      'bounce-in',
      'slide-down',
      'grow-in',
      'breathe',
      'bounce',
      'spin',
      'wiggle',
    ]) {
      expect(ids).toContain(id)
      expect(ANIMATION_CSS).toContain(`data-zyvavu-motion="${id}"`)
    }
  })
})
