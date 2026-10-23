import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

import { stylePreviewStore, useWidgetPreviewStyle } from '@/lib/style-engine/preview-store'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { adminMantineTheme } from '@/theme/mantineTheme'
import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'

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

describe('Transactional Style Editing & Overlay Layers', { timeout: 25000 }, () => {
  it('defines correct overlay layers hierarchy', () => {
    expect(ADMIN_OVERLAY_LAYERS.CANVAS).toBeLessThan(ADMIN_OVERLAY_LAYERS.STYLE_MODAL)
    expect(ADMIN_OVERLAY_LAYERS.STYLE_MODAL).toBeLessThan(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL)
    expect(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL).toBeLessThan(ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN)
    expect(ADMIN_OVERLAY_LAYERS.STYLE_MODAL).toBe(1050)
    expect(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL).toBe(1150)
    expect(ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN).toBe(1250)
  })

  it('configures Mantine Select comboboxProps to ACTIVE_DROPDOWN zIndex', () => {
    const selectDefaults = (adminMantineTheme.components as any)?.Select?.defaultProps
    expect(selectDefaults?.comboboxProps?.zIndex).toBe(ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN)
  })

  it('updates stylePreviewStore in real-time without modifying Puck document', () => {
    const componentId = 'sec-1'
    expect(stylePreviewStore.getPreview(componentId)).toBeNull()

    const onUpdateStyle = vi.fn()
    const onClose = vi.fn()

    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId={componentId}
          currentStyle={{
            backgroundToken: 'surface',
            background: { mode: 'color', colorToken: 'surface' },
          }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    // Initially, no preview in store yet (uses committed style) and onUpdateStyle not called
    expect(stylePreviewStore.getPreview(componentId)).toBeNull()
    expect(onUpdateStyle).not.toHaveBeenCalled()

    // Open Color Palette
    const changeColorBtn = screen.getByRole('button', { name: 'Change Palette' })
    fireEvent.click(changeColorBtn)

    // Select primary token swatch
    const primarySwatch = screen.getByRole('button', { name: /Select Primary Brand/i })
    fireEvent.click(primarySwatch)

    // Live preview must now be broadcast into stylePreviewStore for the component!
    const preview = stylePreviewStore.getPreview(componentId)
    expect(preview).not.toBeNull()
    expect(preview?.backgroundToken).toBe('primary')
    expect(screen.getByText('Color: primary')).toBeTruthy()

    // Document update must NOT be called yet (transactional draft only)
    expect(onUpdateStyle).not.toHaveBeenCalled()
  })

  it('discards draft changes and clears preview on Cancel', () => {
    const componentId = 'sec-2'
    const onUpdateStyle = vi.fn()
    const onClose = vi.fn()

    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId={componentId}
          currentStyle={{
            backgroundToken: 'surface',
            background: { mode: 'color', colorToken: 'surface' },
          }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    // Open palette and select a swatch
    const changeColorBtn = screen.getByRole('button', { name: 'Change Palette' })
    fireEvent.click(changeColorBtn)

    const primarySwatch = screen.getByRole('button', { name: /Select Primary Brand/i })
    fireEvent.click(primarySwatch)

    expect(stylePreviewStore.getPreview(componentId)?.backgroundToken).toBe('primary')

    // Cancel Palette
    const paletteCancelBtn = screen.getByRole('button', { name: /^Cancel$/i })
    fireEvent.click(paletteCancelBtn)

    // Preview should revert to pre-palette draft ('surface')
    const reverted = stylePreviewStore.getPreview(componentId)
    expect(reverted?.backgroundToken).toBe('surface')
    expect(screen.getByText('Color: surface')).toBeTruthy()

    // Now click Cancel in the main Style Editor
    const styleCancelBtn = screen.getByRole('button', { name: /Hủy \/ Cancel/i })
    fireEvent.click(styleCancelBtn)

    // Preview store cleared completely, onUpdateStyle never committed, modal closed
    expect(stylePreviewStore.getPreview(componentId)).toBeNull()
    expect(onUpdateStyle).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('previews repeated pattern changes without notifying canvas during render', () => {
    const errors = vi.spyOn(console, 'error')
    const onUpdateStyle = vi.fn()
    function CanvasSubscriber() {
      const preview = useWidgetPreviewStyle('pattern-test')
      return <div data-testid="pattern-preview">{preview?.background?.pattern?.preset || 'none'}</div>
    }
    try {
      render(<React.StrictMode><MantineProvider theme={adminMantineTheme}>
        <CanvasSubscriber />
        <WidgetStyleContextMenu domain="background" opened onClose={vi.fn()} anchorEl={null}
          componentType="Section" componentId="pattern-test" currentStyle={{ background: { mode: 'color', colorToken: 'surface' } }} onUpdateStyle={onUpdateStyle} />
      </MantineProvider></React.StrictMode>)
      for (const pattern of ['Dots', 'Grid']) {
        fireEvent.click(screen.getByLabelText('Background pattern'))
        fireEvent.click(screen.getByRole('option', { name: pattern }))
      }
      expect(screen.getByTestId('pattern-preview').textContent).toBe('grid')
      expect(onUpdateStyle).not.toHaveBeenCalled()
      expect(errors.mock.calls.flat().join(' ')).not.toContain('Cannot update a component')
      fireEvent.click(screen.getByRole('button', { name: /Hủy \/ Cancel/i }))
      expect(stylePreviewStore.getPreview('pattern-test')).toBeNull()
    } finally { errors.mockRestore() }
  })

  it('commits draft to Puck document and clears preview on Apply', () => {
    const componentId = 'sec-3'
    const onUpdateStyle = vi.fn()
    const onClose = vi.fn()

    render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId={componentId}
          currentStyle={{
            backgroundToken: 'surface',
            background: { mode: 'color', colorToken: 'surface' },
          }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    // Open palette and pick accent
    const changeColorBtn = screen.getByRole('button', { name: 'Change Palette' })
    fireEvent.click(changeColorBtn)

    const accentSwatch = screen.getByRole('button', { name: /Select Accent Highlight/i })
    fireEvent.click(accentSwatch)

    // Apply inside palette confirms into parent Style Editor's draft
    const paletteApplyBtn = screen.getByRole('button', { name: /^Apply$/i })
    fireEvent.click(paletteApplyBtn)

    // Still no commit to Puck document!
    expect(onUpdateStyle).not.toHaveBeenCalled()

    // Now click Apply in the parent Style Editor
    const mainApplyBtn = screen.getByRole('button', { name: /Áp dụng \/ Apply/i })
    fireEvent.click(mainApplyBtn)

    // Now committed as 1 logical update with semantic token preserved
    expect(onUpdateStyle).toHaveBeenCalledTimes(1)
    const committedArg = onUpdateStyle.mock.calls[0][0]
    expect(committedArg.backgroundToken).toBe('accent')
    expect(committedArg.background?.colorToken).toBe('accent')

    // Canvas preview store cleared
    expect(stylePreviewStore.getPreview(componentId)).toBeNull()
    expect(onClose).toHaveBeenCalled()
  })
})
