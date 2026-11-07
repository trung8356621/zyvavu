import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import {
  formatControlPlaceholder,
  formatEffectiveLabel,
  formatSourceIndicator,
  resolveEffectiveTypography,
  resolveTypographyBasePreset,
} from '@/lib/style-engine/effective-typography'
import { TypographyStyleControl } from '@/components/admin/theme-builder/style-controls/TypographyStyleControl'

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
    colors: { text: '#231F20', primary: '#0e6b66', background: '#fff', surface: '#f8', border: '#ddd' },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontFamilyHeading: 'Playfair Display, serif',
      h1: { size: '44px', weight: '700', lineHeight: '1.2' },
      h2: { size: '32px', weight: '700', lineHeight: '1.3' },
      p1: { size: '16px', weight: '400', lineHeight: '1.5' },
    },
    spacing: {},
    layout: { containerWidth: '1200px' },
    radius: {},
  },
} as any

describe('Effective typography resolution', () => {
  it('resolves base preset from HTML tag then widget default', () => {
    expect(resolveTypographyBasePreset({ htmlTag: 'h3', widgetType: 'Heading' })).toBe('h3')
    expect(resolveTypographyBasePreset({ widgetType: 'Heading' })).toBe('h2')
    expect(resolveTypographyBasePreset({ widgetType: 'Text' })).toBe('p1')
    expect(
      resolveTypographyBasePreset({
        override: { typography: 'h1' },
        htmlTag: 'h6',
        widgetType: 'Heading',
      }),
    ).toBe('h1')
  })

  it('shows theme/tag inherited values without requiring overrides', () => {
    const effective = resolveEffectiveTypography({
      override: {},
      themeConfig,
      htmlTag: 'h2',
      widgetType: 'Heading',
    })
    expect(effective.basePreset).toBe('h2')
    expect(effective.fontSize.display).toBe('32px')
    expect(effective.fontSize.inherited).toBe(true)
    expect(effective.fontSize.sourceLabel).toBe('Theme Heading 2')
    expect(effective.fontWeight.display).toBe('700')
    expect(effective.color.display).toBe('#231F20')
    expect(effective.color.sourceLabel).toBe('Theme')
    expect(formatEffectiveLabel(effective.fontSize)).toBe('32px (Theme Heading 2)')
    expect(formatControlPlaceholder(effective.fontSize)).toBe('32px')
    expect(formatSourceIndicator(effective.fontSize)).toBe('Theme Heading 2')
    expect(formatSourceIndicator(effective.color)).toBeNull()
    expect(formatSourceIndicator(effective.align)).toBeNull()
  })

  it('keeps explicit overrides and reports unresolved gaps', () => {
    const effective = resolveEffectiveTypography({
      override: { fontWeight: '600', colorToken: 'primary' },
      themeConfig,
      htmlTag: 'h2',
      widgetType: 'Heading',
    })
    expect(effective.fontWeight.inherited).toBe(false)
    expect(effective.fontWeight.sourceLabel).toBe('Override')
    expect(effective.fontSize.inherited).toBe(true)
    expect(effective.color.raw).toBe('primary')

    const missing = resolveEffectiveTypography({
      override: {},
      themeConfig: { tokens: { colors: {}, typography: {}, spacing: {}, layout: {}, radius: {} } } as any,
      widgetType: 'Text',
    })
    expect(missing.fontSize.unresolved).toBe(true)
    expect(missing.fontFamily.unresolved).toBe(true)
  })

  it('propagates theme changes for inherited fields and survives override after theme change', () => {
    const before = resolveEffectiveTypography({
      override: {},
      themeConfig,
      htmlTag: 'h2',
      widgetType: 'Heading',
    })
    const nextTheme = {
      ...themeConfig,
      tokens: {
        ...themeConfig.tokens,
        typography: {
          ...themeConfig.tokens.typography,
          h2: { size: '40px', weight: '800', lineHeight: '1.25' },
        },
      },
    }
    const afterTheme = resolveEffectiveTypography({
      override: {},
      themeConfig: nextTheme,
      htmlTag: 'h2',
      widgetType: 'Heading',
    })
    expect(before.fontSize.display).toBe('32px')
    expect(afterTheme.fontSize.display).toBe('40px')

    const withOverride = resolveEffectiveTypography({
      override: { fontSize: 'h1' },
      themeConfig: nextTheme,
      htmlTag: 'h2',
      widgetType: 'Heading',
    })
    expect(withOverride.fontSize.display).toBe('44px')
    expect(withOverride.fontSize.inherited).toBe(false)
  })

  it('TypographyStyleControl displays effective values and reset restores inheritance', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <MantineProvider>
        <TypographyStyleControl
          value={{}}
          themeConfig={themeConfig}
          htmlTag="h2"
          widgetType="Heading"
          onChange={onChange}
          onOpenColorModal={() => {}}
        />
      </MantineProvider>,
    )

    // Semantic preset names as selected Select values (not raw px/weight digits).
    expect((screen.getByRole('combobox', { name: 'Size' }) as HTMLInputElement).value).toBe(
      'Heading 2',
    )
    expect((screen.getByRole('combobox', { name: 'Weight' }) as HTMLInputElement).value).toBe(
      'Bold',
    )
    expect(screen.getByText('#231F20')).toBeTruthy()
    expect(screen.getAllByText('Theme Heading 2').length).toBeGreaterThan(0)
    expect(screen.queryByText(/· inherited/)).toBeNull()
    expect(screen.queryByText(/Showing effective/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    // Color modal open is parent-owned; simulate override via onChange path:
    rerender(
      <MantineProvider>
        <TypographyStyleControl
          value={{ fontWeight: '600' }}
          themeConfig={themeConfig}
          htmlTag="h2"
          widgetType="Heading"
          onChange={onChange}
          onOpenColorModal={() => {}}
        />
      </MantineProvider>,
    )
    expect(screen.getByText('Override')).toBeTruthy()
    expect((screen.getByRole('combobox', { name: 'Weight' }) as HTMLInputElement).value).toBe(
      'Semi Bold',
    )
    expect((screen.getByRole('combobox', { name: 'Size' }) as HTMLInputElement).value).toBe(
      'Heading 2',
    )
    expect(screen.getAllByText('Theme Heading 2').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Reset fontWeight' }))
    expect(onChange).toHaveBeenCalled()
    const cleared = onChange.mock.calls.at(-1)?.[0]
    expect(cleared.fontWeight).toBeUndefined()
  })
})
