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
    Puck: (props: any) => {
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
    },
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
    appState: { data: document, ui: { itemSelector: { index: 0 } } },
    selectedItem: document.content[0],
  }
})
afterEach(() => {
  cleanup()
  model.listeners.clear()
  stylePreviewStore.clearPreview()
  vi.unstubAllGlobals()
})

describe('Editor stability', () => {
  it('keeps the same canvas/iframe/media through repeated open, draft, Cancel, Apply and selection changes', () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <PuckHost
          config={{ components: {} }}
          document={document}
          onSave={vi.fn()}
          onChange={onChange}
        />
      </MantineProvider>,
    )
    const iframe = screen.getByTitle('unit canvas')
    const media = screen.getByAltText('original media')
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Edit Style' }))
      expect(screen.getByTitle('unit canvas')).toBe(iframe)
      expect(screen.getByAltText('original media')).toBe(media)
      fireEvent.click(screen.getByRole('button', { name: 'Reset style' }))
      expect(stylePreviewStore.getPreview('title')).toEqual({})
      fireEvent.click(screen.getByRole('button', { name: 'Edit Style' }))
      expect(stylePreviewStore.getPreview('title')).toEqual({})
      expect(onChange).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Hủy / Cancel' }))
      expect(stylePreviewStore.getPreview('title')).toBeNull()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Edit Style' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset style' }))
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng / Apply' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(model.history).toHaveLength(1)
    // Puck's history emits onChange; the host must consume it without remounting.
    act(() => {
      model.onChange?.(model.history[0])
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Style' }))
    act(() => select('section'))
    expect(screen.queryByRole('button', { name: 'Áp dụng / Apply' })).toBeNull()
    expect(stylePreviewStore.getPreview('title')).toBeNull()
    expect(screen.getByTitle('unit canvas')).toBe(iframe)
    expect(screen.getByAltText('original media').getAttribute('src')).toBe('/media/original.jpg')
    expect(screen.getByText('Existing media placeholder')).toBeTruthy()
    expect(model.mounts).toBe(1)
    expect(model.unmounts).toBe(0)
    expect(model.uiIdentities.size).toBe(1)
    expect(model.pluginIdentities.size).toBe(1)
  })

  it('keeps an in-progress draft when currentStyle is reallocated by an unrelated parent render', () => {
    const update = vi.fn()
    const props = {
      opened: true,
      componentType: 'PostTitle',
      componentId: 'identity',
      anchorEl: null,
      onClose: vi.fn(),
      onUpdateStyle: update,
    }
    const { rerender } = render(
      <MantineProvider>
        <WidgetStyleContextMenu
          {...props}
          currentStyle={{ spacing: { padding: { token: 'sm' } } }}
        />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset style' }))
    rerender(
      <MantineProvider>
        <WidgetStyleContextMenu
          {...props}
          currentStyle={{ spacing: { padding: { token: 'sm' } } }}
        />
      </MantineProvider>,
    )
    expect(stylePreviewStore.getPreview('identity')).toEqual({})
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng / Apply' }))
    expect(update).toHaveBeenCalledWith({})
  })

  it('handles omitted currentStyle and keeps navigation/footer outside the scrolling body on resize', () => {
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
    const dialog = screen.getByRole('dialog', { name: /Style:/ })
    const body = dialog.querySelector('[data-modal-region="content"]')!
    const navigation = dialog.querySelector('[data-modal-region="navigation"]')!
    expect(body.contains(navigation)).toBe(false)
    expect(body.contains(screen.getByRole('button', { name: 'Áp dụng / Apply' }))).toBe(false)
    const previousHeight = Number.parseFloat((dialog as HTMLElement).style.maxHeight)
    vi.stubGlobal('innerHeight', 400)
    fireEvent(window, new Event('resize'))
    expect(Number.parseFloat((dialog as HTMLElement).style.maxHeight)).toBeLessThan(previousHeight)
    expect(
      clampModalPosition(
        { x: 900, y: 600 },
        { width: 700, height: 400 },
        { width: 360, height: 500 },
      ),
    ).toEqual({ x: 328, y: 12 })
  })

  it('groups animation cards, replays previews and keeps Scroll unavailable', () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <AnimationPresetPicker target="widget" onChange={onChange} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Animation: none' }))
    for (const name of ['Entrance', 'Loop', 'Scroll', 'Hover'])
      expect(screen.getByRole('tab', { name })).toBeTruthy()
    const sample = screen.getByTestId('animation-preview-fade')
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Fade' }))
    expect(screen.getByTestId('animation-preview-fade')).not.toBe(sample)
    fireEvent.click(screen.getByRole('tab', { name: 'Scroll' }))
    expect(
      (screen.getByRole('button', { name: 'Scroll fade — shell only' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('unavailable')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Loop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gentle pulse' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use animation' }))
    expect(onChange).toHaveBeenCalledWith({
      preset: 'pulse',
      trigger: 'loop',
      target: 'widget',
      options: undefined,
    })
  })
})
