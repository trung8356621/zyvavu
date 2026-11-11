import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Editor } from '@tiptap/core'
import { InlineFormatToolbar } from '@/components/builder/inline-edit/InlineFormatToolbar'
import { buttonLabelExtensions } from '@/components/builder/inline-edit/extensions'

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
  it('updates Button formatting and toolbar state in the current TipTap session', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: buttonLabelExtensions(),
      content: '<p>Mua ngay</p>',
    })
    try {
      render(
        <MantineProvider theme={adminMantineTheme}>
          <InlineFormatToolbar editor={editor} anchorEl={document.body} onOpenLink={vi.fn()} allowLink={false} />
        </MantineProvider>,
      )
      act(() => { editor.commands.setTextSelection({ from: 1, to: 9 }) })
      for (const [label, key] of [['Bold', 'b'], ['Italic', 'i'], ['Underline', 'u']]) {
        const button = screen.getByLabelText(label)
        act(() => { editor.commands.keyboardShortcut(`Mod-${key}`) })
        expect(button.getAttribute('aria-pressed')).toBe('true')
        fireEvent.click(button)
        expect(button.getAttribute('aria-pressed')).toBe('false')
      }
      expect(editor.getHTML()).toBe('<p>Mua ngay</p>')
    } finally {
      cleanup()
      editor.destroy()
    }
  })

  it.each([
    ['Parent → Child → Cancel', ['Parent Item', 'Child Item'], 'Background', 'Cancel', {
      itemParent: { spacing: { padding: { token: 'sm' } } },
      itemChild: { backgroundToken: 'surface' },
    }],
    ['Child → Parent → Cancel', ['Child Item', 'Parent Item'], 'Background', 'Cancel', {
      itemParent: { backgroundToken: 'primary', spacing: { padding: { token: 'sm' } } },
      itemChild: {},
    }],
    ['Parent → Child → Parent → Cancel', ['Parent Item', 'Child Item', 'Parent Item'], 'Layout', 'Cancel', {
      itemParent: { spacing: { padding: { token: 'sm' } } },
      itemChild: {},
    }],
    ['Background → Layout → Cancel', ['Parent Item', 'Parent Item'], 'Layout', 'Cancel', {
      itemParent: { spacing: { padding: { token: 'sm' } } },
      itemChild: { backgroundToken: 'surface' },
    }],
    ['Background → Close X', ['Parent Item'], 'Background', 'Close modal', {
      itemParent: { spacing: { padding: { token: 'sm' } } },
      itemChild: { backgroundToken: 'surface' },
    }],
  ] as const)('%s in the same dock', (_name, targets, lastDomain, action, expected) => {
    type Presentation = NonNullable<React.ComponentProps<typeof WidgetStyleContextMenu>['listPresentation']>
    const original: Presentation = {
      itemParent: { backgroundToken: 'primary', spacing: { padding: { token: 'sm' } } },
      itemChild: { backgroundToken: 'surface' },
    }
    const onUpdate = vi.fn()
    const onClose = vi.fn()
    function Dock() {
      const [presentation, setPresentation] = React.useState(original)
      return (
        <MantineProvider theme={adminMantineTheme}>
          <WidgetStyleContextMenu
            opened
            inWorkspace={action === 'Cancel'}
            anchorEl={null}
            componentType="CategoryList"
            componentId="categories"
            listPresentation={presentation}
            onClose={onClose}
            onUpdateStyle={vi.fn()}
            onUpdateListPresentation={(next) => {
              setPresentation(next)
              onUpdate(next)
            }}
          />
        </MantineProvider>
      )
    }
    render(<Dock />)
    if (action === 'Cancel') {
      expect(screen.getByTestId('unified-style-modal').getAttribute('data-modal-mode')).toBe('docked')
      expect(screen.queryByRole('button', { name: 'Close modal' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Collapse Design panel' })).toBeNull()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    }
    targets.forEach((target, index) => {
      if (target === targets[index - 1]) {
        fireEvent.click(screen.getByRole('button', { name: 'Back to design domains' }))
      } else {
        fireEvent.click(screen.getByRole('combobox', { name: 'Style Target' }))
        fireEvent.click(screen.getByRole('option', { name: target }))
      }
      const domain = index === targets.length - 1 ? lastDomain : 'Background'
      fireEvent.click(screen.getByRole('button', { name: domain }))
      fireEvent.click(screen.getByRole('button', { name: /Reset domain/i }))
    })
    expect(onUpdate).toHaveBeenCalledTimes(targets.length)
    const beforeClose = onUpdate.mock.lastCall?.[0]
    fireEvent.click(screen.getByRole('button', { name: new RegExp(action, 'i') }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onUpdate).toHaveBeenCalledTimes(targets.length + (action === 'Cancel' ? 1 : 0))
    if (action === 'Cancel') expect(beforeClose).not.toEqual(expected)
    expect(onUpdate.mock.lastCall?.[0]).toEqual(expected)
  })

  it('uses the latest host listPresentation after Undo and Redo', () => {
    const onUpdate = vi.fn()
    const renderDock = (token: string) => (
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          opened
          domain="background"
          anchorEl={null}
          componentType="CategoryList"
          componentId="categories"
          listPresentation={{
            container: { backgroundToken: 'text' },
            itemParent: { backgroundToken: token },
          }}
          onClose={vi.fn()}
          onUpdateStyle={vi.fn()}
          onUpdateListPresentation={onUpdate}
        />
      </MantineProvider>
    )
    const { rerender } = render(renderDock('primary'))
    for (const token of ['surface', 'primary']) {
      rerender(renderDock(token))
      expect(onUpdate).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: /Reset domain/i }))
      expect(onUpdate).toHaveBeenCalledWith({
        container: {},
        itemParent: { backgroundToken: token },
      }, undefined)
      onUpdate.mockClear()
    }
  })

  it('defines correct overlay layers hierarchy', () => {
    expect(ADMIN_OVERLAY_LAYERS.CANVAS).toBeLessThan(ADMIN_OVERLAY_LAYERS.STYLE_MODAL)
    expect(ADMIN_OVERLAY_LAYERS.STYLE_MODAL).toBeLessThan(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL)
    expect(ADMIN_OVERLAY_LAYERS.PALETTE_MODAL).toBeLessThan(ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN)
  })

  it('renders shared Style dialog without Apply', () => {
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

    const dialog = screen.getByTestId('unified-style-modal')
    expect(dialog.getAttribute('data-modal-mode')).toBe('floating')
    expect(screen.getByText(/Background ·/i)).toBeTruthy()
    expect(screen.getByText(/Edits apply live/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Áp dụng \/ Apply/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Hủy \/ Cancel/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reset domain/i })).toBeTruthy()
    expect(screen.queryByText(/^Editing /)).toBeNull()
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

  it('P0: Close (X) keeps committed style and never restores the session snapshot', () => {
    const onUpdateStyle = vi.fn(() => true)
    const onClose = vi.fn()
    const { rerender } = render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId="sec-close-keep"
          currentStyle={{ backgroundToken: 'surface' }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    // Simulate a live document edit that already committed (host syncs currentStyle).
    rerender(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId="sec-close-keep"
          currentStyle={{ backgroundToken: 'primary' }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    onUpdateStyle.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /Close modal/i }))
    expect(onClose).toHaveBeenCalled()
    // Close must not write the session-open snapshot back.
    expect(onUpdateStyle).not.toHaveBeenCalled()
  })

  it('P0: Cancel without session-owned dirty paths does not rollback host-synced style', () => {
    // Host sync alone (e.g. Undo/Redo / other session) must not be treated as this session's dirtiness.
    const onUpdateStyle = vi.fn(() => true)
    const onClose = vi.fn()
    const { rerender } = render(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId="sec-cancel-restore"
          currentStyle={{ backgroundToken: 'surface' }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    rerender(
      <MantineProvider theme={adminMantineTheme}>
        <WidgetStyleContextMenu
          domain="background"
          opened={true}
          onClose={onClose}
          anchorEl={null}
          componentType="Section"
          componentId="sec-cancel-restore"
          currentStyle={{ backgroundToken: 'primary' }}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )

    onUpdateStyle.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /Hủy \/ Cancel/i }))
    expect(onClose).toHaveBeenCalled()
    expect(onUpdateStyle).not.toHaveBeenCalled()
  })

  it('Reset domain commits immediately without Apply', () => {
    const onUpdateStyle = vi.fn<React.ComponentProps<typeof WidgetStyleContextMenu>['onUpdateStyle']>(
      () => true,
    )
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
