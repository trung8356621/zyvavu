import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

import { BuilderChromeProvider } from '@/components/builder/core/editor-bridge'
import { PuckTypographyStyleFieldRender } from '@/components/builder/fields/PuckTypographyStyleField'
import { FIELDS_OWNED_STYLE_DOMAINS, getStyleModalDomains } from '@/lib/style-engine/domains'
import { atomEditors } from '@/widgets/atoms/editor'

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
    colors: { text: '#111', primary: '#0e6b66', background: '#fff', surface: '#f8', border: '#ddd' },
    typography: {
      fontFamily: 'Inter, sans-serif',
      fontFamilyHeading: 'Playfair Display, serif',
      h1: { size: '44px', weight: '700' },
      h2: { size: '32px', weight: '600' },
    },
    spacing: {},
    layout: { containerWidth: '1200px' },
    radius: {},
  },
} as any

describe('Heading native Fields typography ownership', () => {
  it('exposes Content, HTML Tag, and Style Engine typography field on Heading', () => {
    const fields = atomEditors.Heading.config.fields
    expect(fields.text).toBeDefined()
    expect(fields.tag).toBeDefined()
    expect(fields.style).toEqual(
      expect.objectContaining({ type: 'custom', label: 'Typography' }),
    )
    expect(fields.fontSize).toBeUndefined()
  })

  it('keeps typography out of Style domains for Heading and Text (no duplicate UI)', () => {
    expect(FIELDS_OWNED_STYLE_DOMAINS.Heading).toContain('typography')
    expect(FIELDS_OWNED_STYLE_DOMAINS.Text).toContain('typography')
    expect(getStyleModalDomains('Heading')).not.toContain('typography')
    expect(getStyleModalDomains('Text')).not.toContain('typography')
    expect(getStyleModalDomains('Heading')).toEqual(
      expect.arrayContaining(['animation', 'background', 'spacing', 'borders']),
    )
    // Composite TextBlock still uses Style domain typography until migrated.
    expect(getStyleModalDomains('TextBlock')).toContain('typography')
  })

  it('exposes Style Engine typography field on Text atom Fields', () => {
    const fields = atomEditors.Text.config.fields
    expect(fields.text).toBeDefined()
    expect(fields.style).toEqual(
      expect.objectContaining({ type: 'custom', label: 'Typography' }),
    )
  })

  it('domain Reset clears typography while preserving sibling style domains', () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <BuilderChromeProvider themeConfig={themeConfig}>
          <PuckTypographyStyleFieldRender
            value={{
              animation: { preset: 'fade-in' } as any,
              typography: { fontWeight: '700', colorToken: 'primary' },
              colorToken: 'primary',
            }}
            onChange={onChange}
          />
        </BuilderChromeProvider>
      </MantineProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)?.[0]
    expect(next.animation).toEqual({ preset: 'fade-in' })
    expect(next.typography).toBeUndefined()
    expect(next.colorToken).toBeUndefined()
  })

  it('per-property reset keeps other typography overrides and sibling domains', () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <BuilderChromeProvider themeConfig={themeConfig}>
          <PuckTypographyStyleFieldRender
            value={{
              animation: { preset: 'fade-in' } as any,
              typography: { fontWeight: '700', fontStyle: 'italic' },
            }}
            onChange={onChange}
          />
        </BuilderChromeProvider>
      </MantineProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset fontWeight' }))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)?.[0]
    expect(next.animation).toEqual({ preset: 'fade-in' })
    expect(next.typography?.fontWeight).toBeUndefined()
    expect(next.typography?.fontStyle).toBe('italic')
  })
})
