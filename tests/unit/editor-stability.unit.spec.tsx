import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { Data } from '@puckeditor/core'

const model = vi.hoisted(() => ({
  snapshot: {} as Record<string, any>,
  listeners: new Set<() => void>(),
  uiIdentities: new Set<unknown>(),
  pluginIdentities: new Set<unknown>(),
  mounts: 0,
  unmounts: 0,
  onChange: undefined as undefined | ((data: Data) => void),
  history: [] as Data[],
}))

vi.mock('@payloadcms/ui', () => ({
  useDocumentDrawer: vi.fn(() => [vi.fn(), { closeDrawer: vi.fn() }]),
  useListDrawer: vi.fn(() => [vi.fn(), { closeDrawer: vi.fn() }]),
  useAuth: vi.fn(() => ({ user: { id: 1 } })),
  useConfig: vi.fn(() => ({ config: {} })),
}))

vi.mock('@puckeditor/core', async () => {
  const React = await import('react')
  function Canvas() {
    React.useEffect(() => {
      model.mounts++
      return () => {
        model.unmounts++
      }
    }, [])
    return (
      <div>
        <iframe id="preview-frame" title="unit canvas" />
        <img alt="original media" src="/media/original.jpg" />
        <span>Existing media placeholder</span>
      </div>
    )
  }
  const ActionBar = Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Label: ({ label }: { label: string }) => <span>{label}</span>,
      Action: ({ label, onClick, children }: any) => (
        <button aria-label={label} onClick={onClick}>
          {children}
        </button>
      ),
      Separator: () => <span />,
    },
  )
  return {
    ActionBar,
    fieldsPlugin: () => ({ name: 'fields', mobileOnly: true }),
    createUsePuck: () => (selector: (snapshot: any) => any) =>
      React.useSyncExternalStore(
        (listener) => {
          model.listeners.add(listener)
          return () => {
            model.listeners.delete(listener)
          }
        },
        () => selector(model.snapshot),
      ),
    Puck: Object.assign((props: any) => {
      model.uiIdentities.add(props.ui)
      model.pluginIdentities.add(props.plugins)
      React.useEffect(() => {
        model.onChange = props.onChange
      }, [props.onChange])
      // This matches installed Puck: overrides.puck is rendered as a component type.
      const Override = props.overrides.puck
      const Bar = props.overrides.actionBar
      return (
        <Override>
          <Canvas />
          <Bar label="Document Title">
            <button>Duplicate</button>
            <button>Delete</button>
          </Bar>
        </Override>
      )
    }, { Outline: () => <div>Native outline</div> }),
  }
})

import { PuckHost } from '@/components/builder/core/PuckHost'
import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import { clampModalPosition } from '@/components/admin/shared/SharedDraggableModal'
import { AnimationPresetPicker } from '@/components/admin/shared/AnimationPresetPicker'

const document = {
  version: 1,
  root: { props: {} },
  content: [
    { type: 'PostTitle', props: { id: 'title', style: { spacing: { padding: { token: 'sm' } } } } },
    { type: 'Section', props: { id: 'section', style: {} } },
  ],
  zones: {},
}

function select(id: string) {
  const data = model.snapshot.appState.data
  const item = data.content.find((entry: any) => entry.props.id === id)
  model.snapshot = {
    ...model.snapshot,
    selectedItem: item,
    appState: {
      ...model.snapshot.appState,
      ui: { itemSelector: { index: data.content.indexOf(item) } },
    },
  }
  model.listeners.forEach((listener) => listener())
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  model.uiIdentities.clear()
  model.pluginIdentities.clear()
  model.mounts = 0
  model.unmounts = 0
  model.history = []
  const dispatch = vi.fn((action) => {
    if (action.type !== 'setData') return
    const before = model.snapshot.appState.data
    const data = action.data(before)
    model.history.push(before)
    model.snapshot = {
      ...model.snapshot,
      appState: { ...model.snapshot.appState, data },
      selectedItem: data.content[0],
    }
    model.listeners.forEach((listener) => listener())
    model.onChange?.(data)
  })
  model.snapshot = {
    dispatch,
    history: {
      back: vi.fn(),
      forward: vi.fn(),
      hasPast: () => model.history.length > 0,
      hasFuture: () => false,
      index: model.history.length - 1,
      histories: model.history,
    },
    appState: { data: document, ui: { itemSelector: { index: 0 } } },
    selectedItem: document.content[0],
    getItemById: (id: string) => document.content.find((entry: any) => entry.props.id === id),
    getSelectorForId: (id: string) => {
      const index = document.content.findIndex((entry: any) => entry.props.id === id)
      return index >= 0 ? { index } : null
    },
    getPermissions: () => ({ edit: true, delete: true, duplicate: true }),
  }
})
afterEach(() => {
  cleanup()
  model.listeners.clear()
  stylePreviewStore.clearPreview()
  vi.unstubAllGlobals()
})

describe('Editor stability', () => {
  it('opens the tool panel without remounting Puck and returns focus to its rail button', () => {
    render(
      <MantineProvider>
        <PuckHost config={{ components: {} }} document={document} onSave={vi.fn()} templateContext="single" />
      </MantineProvider>,
    )
    const canvas = screen.getByTitle('unit canvas')
    const outline = screen.getByRole('button', { name: 'Outline' })
    expect(screen.getByRole('button', { name: 'Theme Settings' })).toBeTruthy()
    fireEvent.click(outline)
    const panel = screen.getByRole('region', { name: 'Outline' })
    expect(panel.textContent).toContain('Native outline')
    expect(panel.ownerDocument.activeElement).toBe(panel)
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Outline' })).toBeNull()
    expect(outline.ownerDocument.activeElement).toBe(outline)
    expect(screen.getByTitle('unit canvas')).toBe(canvas)
    expect(model.mounts).toBe(1)
  })

  it.each(['Heading', 'Text', 'Button', 'Image'])(
    'exposes Settings, Design and More for %s',
    async (type) => {
      const { getStyleModalDomains, orderStyleToolbarDomains, STYLE_MODAL_TITLES } = await import(
        '@/lib/style-engine/domains'
      )
      const atomDoc = { ...document, content: [{ type, props: { id: 'atom', text: 'Content' } }] }
      model.snapshot = {
        ...model.snapshot,
        selectedItem: atomDoc.content[0],
        appState: { data: atomDoc, ui: { itemSelector: { index: 0 } } },
      }
      const onChange = vi.fn()
      render(
        <MantineProvider>
          <PuckHost
            config={{ components: {} }}
            document={atomDoc}
            onSave={vi.fn()}
            onChange={onChange}
          />
        </MantineProvider>,
      )
      const selected = model.snapshot.selectedItem
      // UX V5: Settings | Design | More — capability domains still owned by style-engine.
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Design' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'More actions' })).toBeTruthy()
      const domains = orderStyleToolbarDomains(getStyleModalDomains(type))
      expect(domains.length).toBeGreaterThan(0)
      for (const domain of domains) {
        expect(STYLE_MODAL_TITLES[domain]).toBeTruthy()
      }
      expect(model.snapshot.selectedItem).toBe(selected)
      expect(model.history).toHaveLength(0)
      expect(model.snapshot.dispatch).not.toHaveBeenCalled()
      expect(onChange).not.toHaveBeenCalled()
      expect(model.mounts).toBe(1)
    },
  )

  it('keeps the same canvas/iframe/media through repeated open, Reset, Cancel and selection changes', () => {
    const onChange = vi.fn()
    const onUpdateStyle = vi.fn(() => true)
    function Harness() {
      const [styleOpen, setStyleOpen] = React.useState(false)
      return (
        <>
          <PuckHost
            config={{ components: {} }}
            document={document}
            onSave={vi.fn()}
            onChange={onChange}
          />
          <button type="button" onClick={() => setStyleOpen(true)}>
            Open Style Test
          </button>
          {styleOpen && (
            <WidgetStyleContextMenu
              opened
              domain="animation"
              anchorEl={null}
              componentType="Section"
              componentId="section"
              currentStyle={{}}
              onClose={() => setStyleOpen(false)}
              onUpdateStyle={onUpdateStyle}
            />
          )}
        </>
      )
    }
    render(
      <MantineProvider>
        <Harness />
      </MantineProvider>,
    )
    const openStyle = () => fireEvent.click(screen.getByRole('button', { name: 'Open Style Test' }))
    const iframe = screen.getByTitle('unit canvas')
    const media = screen.getByAltText('original media')
    for (let i = 0; i < 3; i++) {
      openStyle()
      expect(screen.getByTitle('unit canvas')).toBe(iframe)
      expect(screen.getByAltText('original media')).toBe(media)
      fireEvent.click(screen.getByRole('button', { name: 'Reset domain' }))
      fireEvent.click(screen.getByRole('button', { name: 'Hủy / Cancel' }))
    }
    openStyle()
    fireEvent.click(screen.getByRole('button', { name: 'Reset domain' }))
    expect(onUpdateStyle).toHaveBeenCalled()
    act(() => {
      model.onChange?.(model.history[0] || document)
    })
    openStyle()
    act(() => select('section'))
    expect(screen.queryByRole('button', { name: 'Áp dụng / Apply' })).toBeNull()
    expect(screen.getByTitle('unit canvas')).toBe(iframe)
    expect(screen.getByAltText('original media').getAttribute('src')).toBe('/media/original.jpg')
    expect(screen.getByText('Existing media placeholder')).toBeTruthy()
    expect(model.mounts).toBe(1)
    expect(model.unmounts).toBe(0)
    expect(model.uiIdentities.size).toBe(1)
    expect(model.pluginIdentities.size).toBe(1)
  })

  it('direct Reset commits immediately and survives currentStyle reallocation', () => {
    const update = vi.fn(() => true)
    const props = {
      opened: true,
      componentType: 'PostTitle',
      componentId: 'identity',
      anchorEl: null,
      onClose: vi.fn(),
      onUpdateStyle: update,
      domain: 'spacing' as const,
    }
    const { rerender } = render(
      <MantineProvider>
        <WidgetStyleContextMenu
          {...props}
          currentStyle={{ spacing: { padding: { token: 'sm' } } }}
        />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset domain' }))
    expect(update).toHaveBeenCalled()
    rerender(
      <MantineProvider>
        <WidgetStyleContextMenu
          {...props}
          currentStyle={{ spacing: { padding: { token: 'sm' } } }}
        />
      </MantineProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Áp dụng / Apply' })).toBeNull()
  })

  it('handles omitted currentStyle and keeps footer outside the scrolling body on Style dialog', () => {
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          componentType="PostTitle"
          componentId="empty"
          anchorEl={null}
          onClose={vi.fn()}
          onUpdateStyle={vi.fn()}
        />
      </MantineProvider>,
    )
    const dialog = screen.getByRole('dialog', { name: /Design ·/ })
    expect(dialog.getAttribute('data-modal-mode')).toBe('floating')
    const body = dialog.querySelector('[data-modal-region="content"]')!
    expect(body.contains(screen.getByRole('button', { name: 'Hủy / Cancel' }))).toBe(false)
    expect(screen.queryByRole('button', { name: 'Áp dụng / Apply' })).toBeNull()
    expect(
      clampModalPosition(
        { x: 900, y: 600 },
        { width: 700, height: 400 },
        { width: 360, height: 500 },
      ),
    ).toEqual({ x: 328, y: 12 })
  })

  it('groups animation cards, opens settings on select and keeps Scroll browsable as shell', () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <AnimationPresetPicker target="widget" onChange={onChange} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Animation:/i }))
    for (const name of ['Entrance', 'Loop', 'Hover', 'Scroll'])
      expect(screen.getByRole('tab', { name })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Scroll' }))
    expect(screen.getByTestId('animation-scroll-shell-note')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Loop' }))
    fireEvent.click(screen.getByRole('button', { name: /^Pulse$/i }))
    expect(screen.getByTestId('animation-settings-page')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Use animation/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'pulse',
        trigger: 'loop',
        target: 'widget',
      }),
    )
  })
})
