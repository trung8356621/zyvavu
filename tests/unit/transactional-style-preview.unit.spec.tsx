import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

vi.mock('@payloadcms/ui', () => ({
  useDocumentDrawer: vi.fn(),
  useListDrawer: vi.fn(),
}))

vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@puckeditor/core')>()
  const mockState = {
    appState: {
      data: {
        root: {
          props: {
            pageSettings: {
              background: { type: 'theme' },
              text: {},
              layout: {},
            },
          },
        },
        content: [],
      },
    },
    dispatch: vi.fn(),
  }
  return {
    ...actual,
    usePuck: () => mockState,
    createUsePuck: () => (selector?: (s: any) => any) =>
      selector ? selector(mockState) : mockState,
  }
})

import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { adminMantineTheme } from '@/theme/mantineTheme'
import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'

beforeEach(() => {
  cleanup()
  stylePreviewStore.clearPreview()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  stylePreviewStore.clearPreview()
})

describe('Direct Style Editing & Overlay Layers', { timeout: 25000 }, () => {
  it('defines correct overlay layers hierarchy', () => {
    expect(ADMIN_OVERLAY_LAYERS.CANVAS).toBeLessThan(ADMIN_OVERLAY_LAYERS.STYLE_MODAL)
    expect(ADMIN_OVERLAY_LAYERS.STYLE_MODAL).toBeLessThan(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL)
    expect(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL).toBeLessThan(ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN)
  })

  it('renders docked Style sidebar without Apply', () => {
    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={vi.fn()}
          anchorEl={null}
          componentType="Section"
          componentId="sec-direct"
          currentStyle={{ backgroundToken: 'surface' }}
          onUpdateStyle={vi.fn(() => true)}
        />
      </MantineProvider>,
    )

    expect(screen.getByText(/Background:/i)).toBeTruthy()
    expect(screen.getByText(/Changes apply immediately/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Áp dụng \/ Apply/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Hủy \/ Cancel/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reset domain/i })).toBeTruthy()
  })

  it('Cancel closes the session when style matches the open snapshot', () => {
    const onUpdateStyle = vi.fn(() => true)
    const onClose = vi.fn()

    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId="sec-cancel"
          currentStyle={{ backgroundToken: 'surface' }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Hủy \/ Cancel/i }))
    expect(onClose).toHaveBeenCalled()
    expect(onUpdateStyle).not.toHaveBeenCalled()
  })

  it('Reset domain commits immediately without Apply', () => {
    const onUpdateStyle = vi.fn(() => true)
    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={vi.fn()}
          anchorEl={null}
          componentType="Section"
          componentId="sec-reset"
          currentStyle={{ backgroundToken: 'primary', border: { colorToken: 'border' } }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Reset domain/i }))
    expect(onUpdateStyle).toHaveBeenCalled()
    const committed = onUpdateStyle.mock.calls[0][0]
    expect(committed.backgroundToken).toBeUndefined()
    expect(committed.border?.colorToken).toBe('border')
  })

  it('nested pattern color picker opens without Apply and near the control', async () => {
    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={vi.fn()}
          anchorEl={null}
          componentType="Section"
          componentId="sec-palette"
          currentStyle={{
            background: {
              mode: 'color',
              colorToken: 'surface',
              pattern: { preset: 'dots', colorToken: 'text' },
            },
          }}
          themeConfig={
            {
              tokens: { colors: { primary: '#0e6b66', surface: '#fff', text: '#111' } },
            } as any
          }
          onUpdateStyle={vi.fn(() => true)}
        />
      </MantineProvider>,
    )

    expect(screen.getByLabelText('Background pattern')).toBeTruthy()
    const patternColorBtn = screen.getByRole('button', { name: /Pattern color/i })
    fireEvent.click(patternColorBtn)
    await waitFor(() => {
      expect(screen.getByText(/Theme Pattern Color/i)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /^Apply$/i })).toBeNull()
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeTruthy()
  })
})
