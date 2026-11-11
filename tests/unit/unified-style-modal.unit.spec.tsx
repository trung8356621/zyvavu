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
  getStyleModalDomains,
  orderStyleToolbarDomains,
  STYLE_MODAL_TITLES,
} from '@/lib/style-engine/domains'
import actionBarStyles from '@/components/builder/core/WidgetActionBar.module.css'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
  }))
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Floating Design Panel host (PO UX V5 2026-11-11)', () => {
  it('opens every primary Design domain in one shared non-modal floating panel', () => {
    const domains = orderStyleToolbarDomains(getStyleModalDomains('Section'))
    expect(domains).toEqual(['animation', 'background', 'spacing', 'borders'])

    for (const domain of domains) {
      cleanup()
      render(
        <MantineProvider>
          <WidgetStyleContextMenu
            opened
            domain={domain}
            anchorEl={null}
            componentType="Section"
            componentId={`sec-${domain}`}
            currentStyle={{}}
            onClose={vi.fn()}
            onUpdateStyle={vi.fn(() => true)}
          />
        </MantineProvider>,
      )
      const dialog = screen.getByTestId('unified-style-modal')
      expect(dialog.getAttribute('data-modal-mode')).toBe('floating')
      expect(dialog.getAttribute('aria-modal')).not.toBe('true')
      expect(screen.getByRole('dialog', { name: new RegExp(`${STYLE_MODAL_TITLES[domain]} ·`) })).toBeTruthy()
      expect(screen.queryByTestId('style-domain-launcher')).toBeNull()
    }
  })

  it('collapse hides the panel chrome and restore brings it back', () => {
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          domain="background"
          anchorEl={null}
          componentType="Section"
          componentId="sec-collapse"
          currentStyle={{}}
          onClose={vi.fn()}
          onUpdateStyle={vi.fn(() => true)}
        />
      </MantineProvider>,
    )
    expect(screen.getByTestId('unified-style-modal')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Design panel' }))
    expect(screen.queryByTestId('unified-style-modal')).toBeNull()
    expect(screen.getByTestId('design-panel-collapsed')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Restore Design panel' }))
    expect(screen.getByTestId('unified-style-modal')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: /Background ·/ })).toBeTruthy()
  })

  it('Escape closes via Cancel semantics without an Apply button', () => {
    const onClose = vi.fn()
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          domain="spacing"
          anchorEl={null}
          componentType="Section"
          componentId="sec-esc"
          currentStyle={{ spacing: { padding: { token: 'md' } } }}
          onClose={onClose}
          onUpdateStyle={vi.fn(() => true)}
        />
      </MantineProvider>,
    )
    expect(screen.queryByRole('button', { name: /Apply/i })).toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('exposes ActionBar alignment tokens for a single control row', () => {
    expect(actionBarStyles.toolbar).toBeTruthy()
    expect(actionBarStyles.styleTrigger).toBeTruthy()
    expect(actionBarStyles.overflowTrigger).toBeTruthy()
  })
})
