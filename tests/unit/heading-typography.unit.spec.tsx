import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { renderToStaticMarkup } from 'react-dom/server'

import { TypographyStyleControl } from '@/components/admin/theme-builder/style-controls/TypographyStyleControl'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { getDomainResetStyle } from '@/lib/style-engine/style-session-contract'
import { COMPONENT_STYLE_CAPABILITIES } from '@/lib/style-engine/capabilities'
import { atomEditors } from '@/widgets/atoms/editor'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import type { TypographyStyleConfig } from '@/lib/style-engine/types'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

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
    colors: { text: '#111', primary: '#0e6b66', background: '#fff', surface: '#f8faf9', border: '#ddd' },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontFamilyHeading: 'Playfair Display, serif',
      h1: { size: '44px', weight: '700', lineHeight: '1.2' },
      h2: { size: '32px', weight: '600', lineHeight: '1.3' },
      p1: { size: '16px', weight: '400', lineHeight: '1.5' },
    },
    spacing: {},
    layout: { containerWidth: '1200px' },
    radius: {},
  },
} as any

describe('Heading Typography V1', () => {
  it('keeps HTML tag in Atom Settings and typography capability on Style Sidebar', () => {
    expect(atomEditors.Heading.config.fields.text).toBeDefined()
    expect(atomEditors.Heading.config.fields.tag).toBeDefined()
    expect(atomEditors.Heading.config.fields.fontSize).toBeUndefined()
    expect(atomEditors.Heading.config.defaultProps.tag).toBe('h2')
    expect(COMPONENT_STYLE_CAPABILITIES.Heading).toContain('typography')
  })

  it('renders semantic HTML tag independently of typography style overrides', () => {
    const Heading = createAtomRenderer('Heading')
    const style = {
      typography: {
        fontWeight: '700' as const,
        fontSize: 'h1',
        colorToken: 'primary',
        textTransform: 'uppercase' as const,
      },
    }
    const h2 = renderToStaticMarkup(
      <Heading id="h1" text="Hello" tag="h2" style={style} />,
    )
    const h6 = renderToStaticMarkup(
      <Heading id="h2" text="Hello" tag="h6" style={style} />,
    )
    expect(h2).toContain('<h2')
    expect(h2).toContain('Hello')
    expect(h2).toContain('font-weight:700')
    expect(h2).toContain('text-transform:uppercase')
    expect(h6).toContain('<h6')
    expect(h6).toContain('font-weight:700')
    expect(h6).toContain('Hello')
  })

  it('serializes explicit typography overrides without writing theme defaults when unset', () => {
    expect(resolveWidgetStyles({})).toEqual({})
    expect(resolveWidgetStyles({ typography: {} })).toEqual({})

    const css = resolveWidgetStyles({
      typography: {
        fontFamily: 'heading',
        fontWeight: '600',
        fontSize: 'h3',
        fontStyle: 'italic',
        textDecoration: 'underline',
        textTransform: 'capitalize',
        letterSpacing: 'wide',
        lineHeight: 'relaxed',
        align: 'center',
        colorToken: 'primary',
      },
    })
    expect(css.fontFamily).toContain('--zyvavu-theme-font-heading')
    expect(css.fontWeight).toBe('600')
    expect(css.fontSize).toContain('--zyvavu-theme-h3-size')
    expect(css.fontStyle).toBe('italic')
    expect(css.textDecoration).toBe('underline')
    expect(css.textTransform).toBe('capitalize')
    expect(css.letterSpacing).toBe('0.05em')
    expect(css.lineHeight).toBe('1.75')
    expect(css.textAlign).toBe('center')
    expect(String(css.color)).toContain('--zyvavu-theme-primary')
  })

  it('rejects raw CSS size/color in typography overrides', () => {
    expect(
      validateUniversalStyle({ typography: { fontSize: '24px' } }).valid,
    ).toBe(false)
    expect(
      validateUniversalStyle({ typography: { colorToken: '#ff0000' } }).valid,
    ).toBe(false)
    expect(
      validateUniversalStyle({
        typography: { fontFamily: 'heading', fontWeight: '700', fontSize: 'h2' },
      }).valid,
    ).toBe(true)
  })

  it('domain reset clears typography overrides only', () => {
    const style = {
      typography: { fontWeight: '700' as const, colorToken: 'primary' },
      colorToken: 'primary',
      align: 'center' as const,
      background: { mode: 'color' as const, colorToken: 'surface' },
    }
    const next = getDomainResetStyle(style, 'typography')
    expect(next.typography).toBeUndefined()
    expect(next.colorToken).toBeUndefined()
    expect(next.align).toBeUndefined()
    expect(next.background).toEqual({ mode: 'color', colorToken: 'surface' })
  })

  it('TypographyStyleControl exposes inherit/clearable controls and per-property reset', () => {
    const onChange = vi.fn()
    const onResetDomain = vi.fn()
    const initial: TypographyStyleConfig = {
      fontWeight: '700',
      fontStyle: 'italic',
      textDecoration: 'underline',
      textTransform: 'uppercase',
      fontFamily: 'heading',
      fontSize: 'h2',
      colorToken: 'primary',
      align: 'center',
    }
    render(
      <MantineProvider>
        <TypographyStyleControl
          value={initial}
          themeConfig={themeConfig}
          onChange={onChange}
          onResetDomain={onResetDomain}
          onOpenColorModal={() => {}}
        />
      </MantineProvider>,
    )

    expect(screen.getByText('Font')).toBeTruthy()
    expect(screen.getByText('Weight')).toBeTruthy()
    expect(screen.getByText('Size')).toBeTruthy()
    expect(screen.getByText('Style')).toBeTruthy()
    expect(screen.getByText('Decoration')).toBeTruthy()
    expect(screen.getByText('Transform')).toBeTruthy()
    expect(screen.getByText('Letter spacing')).toBeTruthy()
    expect(screen.getByText('Line height')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reset fontWeight' }))
    expect(onChange).toHaveBeenCalled()
    const afterWeight = onChange.mock.calls.at(-1)?.[0] as TypographyStyleConfig
    expect(afterWeight.fontWeight).toBeUndefined()
    expect(afterWeight.fontStyle).toBe('italic')

    fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }))
    expect(onResetDomain).toHaveBeenCalled()
  })

  it('does not invent per-viewport typography (responsive gap)', () => {
    // ResponsiveConfig only supports visibility/stack flags — no typography breakpoints.
    const css = resolveWidgetStyles({
      typography: { fontWeight: '700' },
      responsive: { hideOnMobile: true },
    } as any)
    expect(css.fontWeight).toBe('700')
    expect((css as any)['@media']).toBeUndefined()
  })
})
