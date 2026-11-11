import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { renderToStaticMarkup } from 'react-dom/server'

import { TypographyStyleControl } from '@/components/admin/theme-builder/style-controls/TypographyStyleControl'
import { SpacingDimensionsControl } from '@/components/admin/theme-builder/style-controls/SpacingDimensionsControl'
import { resolveSectionLayout, resolveSpacingDisplay } from '@/lib/style-engine/effective-defaults'
import { resolveSectionLayerStyles } from '@/lib/style-engine/serializer'
import { resetStyleGroup } from '@/lib/style-engine/domains'
import {
  RESPONSIVE_BREAKPOINTS,
  resetResponsiveTypographyProperty,
  serializeResponsiveStyleSheet,
  setResponsiveSpacing,
  setResponsiveTypographyProperty,
} from '@/lib/style-engine/responsive-style'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { ResponsiveConfig, UniversalStyle } from '@/lib/style-engine/types'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const themeConfig = {
  name: 'test',
  version: 1,
  tokens: {
    colors: { text: '#111', primary: '#0e6b66' },
    typography: {
      fontFamily: 'Inter',
      fontFamilyHeading: 'Playfair',
      h1: { size: '44px', weight: '700', lineHeight: '1.2' },
      h2: { size: '32px', weight: '600', lineHeight: '1.3' },
    },
    spacing: {},
    layout: {},
    radius: {},
  },
} as any

describe('Responsive Style Engine V1', () => {
  it('renders unset Layout values without writing to the document', () => {
    const onChangeSpacing = vi.fn()
    const onChangeDimensions = vi.fn()
    render(
      <MantineProvider>
        <SpacingDimensionsControl onChangeSpacing={onChangeSpacing} onChangeDimensions={onChangeDimensions} />
      </MantineProvider>,
    )
    expect(screen.getByRole<HTMLInputElement>('combobox', { name: 'Padding' }).value).toBe('0 px')
    expect(screen.getByRole<HTMLInputElement>('combobox', { name: 'Minimum Height' }).value).toBe('Auto')
    expect(onChangeSpacing).not.toHaveBeenCalled()
    expect(onChangeDimensions).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('switch', { name: 'Link padding sides' }))
    expect(screen.getByRole<HTMLInputElement>('combobox', { name: 'Top' }).value).toBe('0 px')
    expect(onChangeSpacing).not.toHaveBeenCalled()
  })

  it('cascades responsive spacing per side and isolates reset from root and tablet', () => {
    const desktop = { padding: { token: 'md' }, margin: { token: 'sm' } }
    const responsive = {
      tablet: { spacing: { padding: { topToken: 'lg' } } },
      mobile: { spacing: { padding: { bottomToken: 'none' } } },
    }
    const mobile = resolveSpacingDisplay(desktop, responsive, 'mobile')
    expect(mobile.padding('topToken')).toBe('lg')
    expect(mobile.padding('leftToken')).toBe('md')
    expect(mobile.padding('bottomToken')).toBe('none')
    const reset = setResponsiveSpacing(responsive, 'mobile', undefined)
    expect(reset.tablet).toEqual(responsive.tablet)
    expect(resolveSpacingDisplay(desktop, reset, 'mobile').padding('bottomToken')).toBe('md')
    expect(desktop.padding.token).toBe('md')
  })

  it('uses Section layout defaults in both display and CSS and scopes the Dimensions reset', () => {
    const props = { containerWidth: 'inherit', pageContainerWidth: 'wideWidth', verticalPadding: 'lg' }
    const style: UniversalStyle = { section: { minHeight: 'sm', verticalPadding: 'xs' } }
    expect(resolveSectionLayout(style, props)).toEqual({
      containerWidth: 'wideWidth', minHeight: 'sm', verticalPadding: 'xs',
    })
    expect(resolveSectionLayerStyles(style, props).rootStyle.minHeight).toBe('200px')
    const reset = resetStyleGroup(style, 'dimensions')
    expect(reset.section).toEqual({ verticalPadding: 'xs' })
    expect(resolveSectionLayout(reset, props).minHeight).toBe('auto')
  })

  it('documents additive schema — hide/stack coexist with tablet/mobile overrides', () => {
    const responsive: ResponsiveConfig = {
      hideOnMobile: true,
      stackOnMobile: true,
      tablet: { typography: { fontSize: 'h3' } },
      mobile: { spacing: { padding: { token: 'sm' } } },
    }
    expect(responsive.hideOnMobile).toBe(true)
    expect(responsive.tablet?.typography?.fontSize).toBe('h3')
    expect(validateUniversalStyle({ responsive }).valid).toBe(true)
  })

  it('serializes desktop base untouched and tablet→mobile media cascade', () => {
    const css = serializeResponsiveStyleSheet('w1', {
      typography: { fontSize: 'h1' },
      responsive: {
        tablet: { typography: { fontSize: 'h2', lineHeight: 'normal', align: 'center' } },
        mobile: { typography: { fontSize: 'h3' }, spacing: { padding: { token: 'xs' } } },
      },
    })
    expect(css).toContain(`@media (max-width:${RESPONSIVE_BREAKPOINTS.tabletMax}px)`)
    expect(css).toContain(`@media (max-width:${RESPONSIVE_BREAKPOINTS.mobileMax}px)`)
    expect(css).toContain('data-zyvavu-style-id="w1"')
    expect(css).toContain('--zyvavu-theme-h2-size')
    expect(css).toContain('line-height:1.5')
    expect(css).toContain('text-align:center!important')
    expect(css).toContain('--zyvavu-theme-h3-size')
    expect(css).toContain('padding:')
    // Desktop base is NOT rewritten into the stylesheet.
    expect(css).not.toContain('--zyvavu-theme-h1-size')
  })

  it('reset clears only the selected breakpoint property and preserves hide/stack', () => {
    const start: ResponsiveConfig = {
      hideOnTablet: true,
      tablet: { typography: { fontSize: 'h2', lineHeight: 'relaxed', align: 'center' } },
      mobile: { typography: { fontSize: 'h3' } },
    }
    const after = resetResponsiveTypographyProperty(start, 'tablet', 'fontSize')
    expect(after?.hideOnTablet).toBe(true)
    expect(after?.tablet?.typography?.fontSize).toBeUndefined()
    expect(after?.tablet?.typography?.lineHeight).toBe('relaxed')
    expect(after?.mobile?.typography?.fontSize).toBe('h3')
  })

  it('does not persist computed defaults — empty writes prune nested keys', () => {
    let responsive: ResponsiveConfig | undefined = setResponsiveTypographyProperty(
      undefined,
      'tablet',
      'fontSize',
      'h2',
    )
    responsive = setResponsiveTypographyProperty(responsive, 'tablet', 'fontSize', undefined)
    expect(responsive?.tablet).toBeUndefined()
    responsive = setResponsiveSpacing(undefined, 'mobile', { padding: { token: 'md' } })
    expect(responsive.mobile?.spacing?.padding?.token).toBe('md')
    responsive = setResponsiveSpacing(responsive, 'mobile', undefined)
    expect(responsive?.mobile).toBeUndefined()
  })

  it('rejects raw CSS and unsupported responsive keys', () => {
    expect(
      validateUniversalStyle({
        responsive: { tablet: { typography: { fontSize: '18px' } } },
      }).valid,
    ).toBe(false)
    expect(
      validateUniversalStyle({
        responsive: { tablet: { typography: { fontWeight: '700' } as any } },
      }).valid,
    ).toBe(false)
  })

  it('injects responsive stylesheet on widget surface for Canvas/frontend parity', () => {
    const node = withWidgetStyleSurface(
      <h2 style={{ fontSize: 'var(--zyvavu-theme-h1-size)' }}>Title</h2>,
      {
        typography: { fontSize: 'h1' },
        responsive: { tablet: { typography: { fontSize: 'h2' } } },
      },
      'heading-1',
    )
    const html = renderToStaticMarkup(node)
    expect(html).toContain('data-zyvavu-style-id="heading-1"')
    expect(html).toContain('data-zyvavu-responsive-css')
    expect(html).toContain(`max-width:${RESPONSIVE_BREAKPOINTS.tabletMax}px`)
    expect(html).toContain('--zyvavu-theme-h2-size')
  })

  it('scopes CSS per widget id — no leakage between instances of the same type', () => {
    const a = serializeResponsiveStyleSheet('heading-a', {
      responsive: { mobile: { typography: { fontSize: 'h3' } } },
    })
    const b = serializeResponsiveStyleSheet('heading-b', {
      responsive: { mobile: { typography: { fontSize: 'h4' } } },
    })
    expect(a).toContain('data-zyvavu-style-id="heading-a"')
    expect(a).not.toContain('heading-b')
    expect(b).toContain('data-zyvavu-style-id="heading-b"')
    expect(b).not.toContain('heading-a')
    expect(a).toContain('--zyvavu-theme-h3-size')
    expect(b).toContain('--zyvavu-theme-h4-size')
    expect(a).not.toContain('--zyvavu-theme-h4-size')
  })

  it('escapes unsafe widget ids in selectors and emits no CSS without overrides', () => {
    expect(serializeResponsiveStyleSheet('bad"id', { responsive: { tablet: {} } })).toBe('')
    const css = serializeResponsiveStyleSheet('w with spaces!', {
      responsive: { tablet: { typography: { align: 'right' } } },
    })
    expect(css).toContain('data-zyvavu-style-id="w_with_spaces_"')
    expect(css).not.toContain('w with spaces!')
  })

  it('drops responsive tag when widget is deleted (no orphaned style without surface)', () => {
    const withOverride = withWidgetStyleSurface(
      <p>A</p>,
      { responsive: { tablet: { typography: { fontSize: 'h2' } } } },
      'gone-widget',
    )
    const without = withWidgetStyleSurface(<p>B</p>, { typography: { fontSize: 'h1' } }, 'gone-widget')
    expect(renderToStaticMarkup(withOverride)).toContain('data-zyvavu-responsive-css="gone-widget"')
    expect(renderToStaticMarkup(without)).not.toContain('data-zyvavu-responsive-css')
  })

  it('TypographyStyleControl writes tablet size override without mutating desktop typography', () => {
    const onChange = vi.fn()
    const onChangeResponsive = vi.fn()
    render(
      <MantineProvider>
        <TypographyStyleControl
          value={{ fontWeight: '700', fontSize: 'h1' }}
          themeConfig={themeConfig}
          htmlTag="h1"
          widgetType="Heading"
          onChange={onChange}
          onChangeResponsive={onChangeResponsive}
          onOpenColorModal={() => {}}
        />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Tablet' }))
    // Size select still shows desktop effective Heading 1 until override chosen.
    expect(screen.getByRole('combobox', { name: 'Size' })).toBeTruthy()
    fireEvent.click(screen.getByRole('combobox', { name: 'Size' }))
    fireEvent.click(screen.getByRole('option', { name: 'Heading 2' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(onChangeResponsive).toHaveBeenCalled()
    const next = onChangeResponsive.mock.calls.at(-1)?.[0] as ResponsiveConfig
    expect(next.tablet?.typography?.fontSize).toBe('h2')
  })
})
