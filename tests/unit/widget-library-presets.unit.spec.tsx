import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import {
  ATOM_LIBRARY_PRIORITY,
  atomPresetCounts,
  sortLibraryCategories,
} from '@/lib/theme-engine/patterns/atom-presets'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import { isComplexPattern, validatePatternJSON } from '@/lib/theme-engine/patterns/json'
import { instantiatePattern, insertWidgetPattern } from '@/lib/theme-engine/widget-patterns'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { designPatternFromJSON } from '@/lib/theme-engine/widget-patterns'

const state = vi.hoisted(() => ({ current: null as any }))
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (selector: (value: any) => unknown) => selector(state.current),
}))
vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import { WidgetPatternLibrary } from '@/components/admin/theme-builder/WidgetPatternLibrary'
import { PatternThumbnail } from '@/components/admin/theme-builder/PatternPreview'

beforeEach(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  state.current = {
    config: getEditorConfigForContext('home'),
    appState: { data: { root: { props: {} }, content: [] } },
    selectedItem: null,
    dispatch: vi.fn(),
    getPermissions: vi.fn().mockReturnValue({ insert: true, edit: true }),
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('registers the required atom/container preset inventory', () => {
  expect(atomPresetCounts()).toEqual({
    Heading: 23,
    Text: 0,
    Button: 8,
    Image: 4,
    Container: 4,
  })
  // Body `copy-*` presets now insert Heading+P (free Text hidden from library).
  expect(
    SYSTEM_PATTERNS.filter((p) => p.widgetType === 'Heading' && p.id.startsWith('heading-')),
  ).toHaveLength(12)
  expect(
    SYSTEM_PATTERNS.filter((p) => p.widgetType === 'Heading' && p.id.startsWith('copy-')),
  ).toHaveLength(11)
  expect(SYSTEM_PATTERNS.filter((p) => p.widgetType === 'Text')).toHaveLength(0)
  for (const [type, count] of Object.entries(atomPresetCounts())) {
    if (type === 'Heading' || type === 'Text') continue
    const widgetType = type === 'Container' ? 'Section' : type
    const prefix = `${type.toLowerCase()}-`
    const scoped = SYSTEM_PATTERNS.filter(
      (pattern) => pattern.widgetType === widgetType && pattern.id.startsWith(prefix),
    )
    expect(scoped).toHaveLength(count as number)
  }
  for (const record of SYSTEM_PATTERNS.filter((pattern) =>
    ['heading-', 'copy-', 'button-', 'image-', 'container-'].some((prefix) =>
      pattern.id.startsWith(prefix),
    ),
  )) {
    expect(() => validatePatternJSON(record)).not.toThrow()
  }
  // Text library V1 presets must not use Shadow.
  for (const record of SYSTEM_PATTERNS.filter(
    (pattern) => pattern.id.startsWith('heading-') || pattern.id.startsWith('copy-'),
  )) {
    const root = record.payload.content[0]
    expect(root?.props?.style?.shadow).toBeUndefined()
  }
})

it('keeps atom HTML previews simple and section thumbnails complex', () => {
  for (const type of ATOM_LIBRARY_PRIORITY) {
    const record = SYSTEM_PATTERNS.find((pattern) => pattern.widgetType === type)!
    expect(isComplexPattern(record)).toBe(false)
  }
  expect(isComplexPattern(SYSTEM_PATTERNS.find((pattern) => pattern.id === 'section-airy')!)).toBe(
    true,
  )
})

it('inserts atom presets as the declared widget type through Puck setData', () => {
  const config = getEditorConfigForContext('home')
  const base = { root: { props: {} }, content: [] as any[] }
  for (const id of ['heading-display', 'copy-body', 'button-primary', 'image-landscape']) {
    const record = SYSTEM_PATTERNS.find((pattern) => pattern.id === id)!
    const pattern = designPatternFromJSON(record)
    let n = 0
    const item = instantiatePattern(pattern, config, () => `id-${++n}`)
    expect(item.type).toBe(record.widgetType)
    const next = insertWidgetPattern(base, item, 'home', config, undefined, () => `wrap-${++n}`)
    expect(next.content[0].type).toBe('Section')
    const leaf = next.content[0].props.content.at(-1)
    expect(leaf.type).toBe(record.widgetType)
  }
})

it('opens with Text category first as one continuous Heading+Text library', () => {
  expect(sortLibraryCategories(['sections', 'dynamic', 'buttons', 'text', 'images'])).toEqual([
    'text',
    'buttons',
    'images',
    'sections',
    'dynamic',
  ])
  render(
    <MantineProvider>
      <WidgetPatternLibrary context="home" beforeOperation={() => true} />
    </MantineProvider>,
  )
  expect(screen.getByRole('button', { name: 'Text', pressed: true })).toBeTruthy()
  // Text library uses one continuous list (no Basic / Styled Presets split).
  expect(screen.queryByText('Basic')).toBeNull()
  expect(screen.queryByText('Styled Presets')).toBeNull()
  expect(screen.getByRole('button', { name: 'Insert Heading' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Insert Body text' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Insert Surface panel' })).toBeTruthy()
  // Free Text atom is hidden; body presets insert Heading+P.
  expect(screen.queryByRole('button', { name: 'Insert Text' })).toBeNull()
  expect(screen.queryByRole('button', { name: /Add Heading/i })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Insert Display heading' }))
  expect(state.current.dispatch).toHaveBeenCalledOnce()
  expect(state.current.dispatch.mock.calls[0][0].data.content[0].props.content.at(-1).type).toBe(
    'Heading',
  )
})

it('does not mount section thumbnail images until near viewport', async () => {
  let callback: IntersectionObserverCallback | undefined
  const observe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb
      }
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
    },
  )
  const record = SYSTEM_PATTERNS.find((pattern) => pattern.id === 'section-airy')!
  const { container } = render(
    <MantineProvider>
      <PatternThumbnail record={record} />
    </MantineProvider>,
  )
  expect(container.querySelector('img')).toBeNull()
  expect(observe).toHaveBeenCalled()
  expect(callback).toBeTypeOf('function')
  await act(async () => {
    callback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
  expect(container.querySelector('img')).toBeTruthy()
  expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy')
  expect(container.querySelector('img')?.getAttribute('decoding')).toBe('async')
})

it('keeps Patterns category order when Sections is selected', () => {
  render(
    <MantineProvider>
      <WidgetPatternLibrary context="home" beforeOperation={() => true} />
    </MantineProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
  expect(screen.getByText('Styled Presets')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Insert Airy section' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Insert Airy section' }))
  expect(state.current.dispatch.mock.calls.at(-1)[0].data.content[0].type).toBe('Section')
})
