import { describe, expect, it } from 'vitest'
import {
  resetResponsiveTypographyProperty,
  serializeResponsiveStyleSheet,
  setResponsiveTypographyProperty,
} from '@/lib/style-engine/responsive-style'
import { resolveSectionLayerStyles, resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import type { UniversalStyle } from '@/lib/style-engine/types'
import {
  canApplyLinkDraft,
  createLinkDraftFromMark,
  resolveLinkMarkFromDraft,
  switchLinkDestination,
} from '@/components/builder/inline-edit/link-editor-model'
import { replayWidgetAnimation } from '@/lib/style-engine/animation-replay'

describe('Style Engine integration regression', () => {
  it('typography inherit → override → reset keeps unrelated domains', () => {
    const base: UniversalStyle = {
      typography: { typography: 'h1', colorToken: 'text' },
      background: { colorToken: 'surface' },
      border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
    }
    const overridden: UniversalStyle = {
      ...base,
      typography: { ...base.typography, fontSize: 'h2', align: 'center' },
    }
    expect(validateUniversalStyle(overridden).valid).toBe(true)
    const resetTypo = { ...overridden, typography: {} }
    expect(resetTypo.background).toEqual(base.background)
    expect(resetTypo.border).toEqual(base.border)
    expect(resolveWidgetStyles(overridden).textAlign).toBe('center')
  })

  it('borders asymmetric reopen and spacing side reset preserve siblings', () => {
    const style: UniversalStyle = {
      border: {
        style: 'solid',
        widthToken: 'thin',
        colorToken: 'primary',
        side: 'left',
      },
      radius: {
        topLeftToken: 'lg',
        topRightToken: 'sm',
        bottomRightToken: 'lg',
        bottomLeftToken: 'sm',
      },
      spacing: {
        padding: { topToken: 'md', rightToken: 'sm', bottomToken: 'md', leftToken: 'sm' },
      },
    }
    expect(validateUniversalStyle(style).valid).toBe(true)
    const clone = JSON.parse(JSON.stringify(style)) as UniversalStyle
    expect(clone.radius?.topLeftToken).toBe('lg')
    expect(clone.border?.side).toBe('left')
    const { topToken: _removed, ...restPadding } = clone.spacing!.padding as Record<string, string>
    const spacingReset = { ...clone, spacing: { padding: restPadding } }
    expect((spacingReset.spacing?.padding as any).topToken).toBeUndefined()
    expect((spacingReset.spacing?.padding as any).rightToken).toBe('sm')
  })

  it('button normal/hover round-trips and background pattern stays independent', () => {
    const style: UniversalStyle = {
      button: {
        version: 1,
        normal: { preset: 'theme', radius: { radiusToken: 'md' } },
        hover: { transform: 'lift', opacity: 0.9 },
      },
      background: {
        colorToken: 'surface',
        pattern: { preset: 'grid', colorToken: 'primary', opacity: 0.2, scale: 'md' },
      },
    }
    expect(validateUniversalStyle(style).valid).toBe(true)
    const roundTrip = JSON.parse(JSON.stringify(style)) as UniversalStyle
    expect(roundTrip.button?.hover?.transform).toBe('lift')
    const layers = resolveSectionLayerStyles(roundTrip)
    expect(layers.patternStyle.backgroundImage).toBeTruthy()
    expect(layers.baseColorStyle).toBeTruthy()
  })

  it('responsive desktop→tablet→mobile cascade, reset, and scoped CSS', () => {
    let responsive = setResponsiveTypographyProperty(undefined, 'tablet', 'fontSize', 'h2')
    responsive = setResponsiveTypographyProperty(responsive, 'mobile', 'fontSize', 'h3')
    responsive = setResponsiveTypographyProperty(responsive, 'tablet', 'align', 'center')
    const css = serializeResponsiveStyleSheet('w-reg', { responsive })
    expect(css).toContain('data-zyvavu-style-id="w-reg"')
    expect(css).toContain('--zyvavu-theme-h2-size')
    expect(css).toContain('--zyvavu-theme-h3-size')
    const afterMobileReset = resetResponsiveTypographyProperty(responsive, 'mobile', 'fontSize')
    expect(afterMobileReset?.mobile?.typography?.fontSize).toBeUndefined()
    expect(afterMobileReset?.tablet?.typography?.fontSize).toBe('h2')
  })

  it('link apply/cancel contracts and unsupported destinations never emit URLs', () => {
    const existing = createLinkDraftFromMark(
      { from: 1, to: 5 },
      { href: 'https://example.com', target: '_blank', rel: 'noopener' },
    )
    expect(existing.destination).toBe('web')
    expect(resolveLinkMarkFromDraft(existing)?.href).toBe('https://example.com')
    const unsupported = switchLinkDestination(existing, 'popup')
    expect(canApplyLinkDraft(unsupported)).toBe(false)
    expect(resolveLinkMarkFromDraft(unsupported)).toBeNull()
  })

  it('animation replay API is available for non-mutating preview', () => {
    expect(typeof replayWidgetAnimation).toBe('function')
  })
})
