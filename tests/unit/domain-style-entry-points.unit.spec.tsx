import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
  BackgroundVideoPresets: [],
}))

import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import {
  FIELDS_OWNED_STYLE_DOMAINS,
  getStyleModalDomains,
  orderStyleToolbarDomains,
  resetStyleDomain,
  resetStyleGroup,
} from '@/lib/style-engine/domains'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Domain-specific Style entry points', () => {
  it('orders primary toolbar domains first and keeps Heading/Text typography Fields-owned', () => {
    expect(orderStyleToolbarDomains(getStyleModalDomains('Section'))).toEqual([
      'animation',
      'background',
      'spacing',
      'borders',
    ])
    expect(FIELDS_OWNED_STYLE_DOMAINS.Heading).toContain('typography')
    expect(FIELDS_OWNED_STYLE_DOMAINS.Text).toContain('typography')
    expect(FIELDS_OWNED_STYLE_DOMAINS.DocumentTitle).toContain('typography')
    expect(FIELDS_OWNED_STYLE_DOMAINS.PostTitle).toContain('typography')
    expect(getStyleModalDomains('Heading')).not.toContain('typography')
    expect(getStyleModalDomains('Text')).not.toContain('typography')
    expect(getStyleModalDomains('DocumentTitle')).not.toContain('typography')
    expect(getStyleModalDomains('PostTitle')).not.toContain('typography')
  })

  it('opens only the requested domain body (no multi-domain Accordion)', () => {
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          domain="background"
          anchorEl={null}
          componentType="Section"
          componentId="sec-1"
          currentStyle={{ background: { colorToken: 'primary' }, border: { style: 'solid' } }}
          onClose={vi.fn()}
          onUpdateStyle={vi.fn(() => true)}
        />
      </MantineProvider>,
    )
    expect(screen.getByRole('dialog', { name: /Background:/ })).toBeTruthy()
    expect(screen.getByText('Surface')).toBeTruthy()
    expect(screen.getByText('Pattern')).toBeTruthy()
    expect(screen.queryByTestId('style-domain-launcher')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Animation' })).toBeNull()
  })

  it('right-click launcher lists domains then focuses one', () => {
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          anchorEl={null}
          componentType="Section"
          componentId="sec-2"
          currentStyle={{}}
          onClose={vi.fn()}
          onUpdateStyle={vi.fn(() => true)}
        />
      </MantineProvider>,
    )
    expect(screen.getByTestId('style-domain-launcher')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Layout' }))
    expect(screen.getByRole('dialog', { name: /Layout:/ })).toBeTruthy()
    expect(screen.getByText('Spacing')).toBeTruthy()
    expect(screen.getByText('Dimensions')).toBeTruthy()
  })

  it('domain Reset clears only the active domain', () => {
    const style = {
      background: { colorToken: 'primary' },
      border: { style: 'solid' as const },
      animation: { preset: 'fade-in' as const },
    }
    expect(resetStyleDomain(style, 'background')).toEqual({
      border: { style: 'solid' },
      animation: { preset: 'fade-in' },
    })
  })

  it('group Reset clears one Accordion group only', () => {
    const style = {
      spacing: { padding: { token: 'md' } },
      dimensions: { minHeight: 'sm', align: 'center' as const },
      border: { style: 'solid' as const },
      radius: { radiusToken: 'md' },
      background: {
        mode: 'image' as const,
        colorToken: 'surface',
        pattern: { preset: 'dots' as const },
        image: { url: '/a.jpg' },
      },
    }
    expect(resetStyleGroup(style, 'spacing')).toEqual({
      dimensions: { minHeight: 'sm', align: 'center' },
      border: { style: 'solid' },
      radius: { radiusToken: 'md' },
      background: style.background,
    })
    expect(resetStyleGroup(style, 'alignment').dimensions).toEqual({ minHeight: 'sm' })
    expect(resetStyleGroup(style, 'border').radius).toEqual({ radiusToken: 'md' })
    expect(resetStyleGroup(style, 'pattern').background?.pattern).toBeUndefined()
    expect(resetStyleGroup(style, 'pattern').background?.image?.url).toBe('/a.jpg')
    expect(resetStyleGroup(style, 'media').background?.image).toBeUndefined()
  })

  it('domain switch preserves selection identity and commits only the new domain UI', async () => {
    const onUpdate = vi.fn(() => true)
    const base = {
      opened: true as const,
      anchorEl: null,
      componentType: 'Section',
      componentId: 'keep-me',
      currentStyle: { background: { colorToken: 'primary' } },
      onClose: vi.fn(),
      onUpdateStyle: onUpdate,
    }
    const view = render(
      <MantineProvider>
        <WidgetStyleContextMenu {...base} domain="background" />
      </MantineProvider>,
    )
    expect(screen.getByText(/keep-me/)).toBeTruthy()
    view.rerender(
      <MantineProvider>
        <WidgetStyleContextMenu {...base} domain="borders" requestNonce={2} />
      </MantineProvider>,
    )
    expect(await screen.findByRole('dialog', { name: /Borders:/ })).toBeTruthy()
    expect(screen.getByText('Border')).toBeTruthy()
    expect(screen.getByText('Radius')).toBeTruthy()
    expect(screen.getByText(/keep-me/)).toBeTruthy()
  })
})
