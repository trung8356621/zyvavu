import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

const state = vi.hoisted(() => {
  const record = {
    id: 'section-airy',
    name: 'Airy section',
    description: '',
    category: 'sections',
    widgetType: 'Section',
    source: 'system',
    version: 1,
    payload: { content: [] },
  }
  const pattern = {
    id: record.id,
    name: record.name,
    widgetType: 'Section',
    canonical: record,
    props: {},
  }
  return {
    record,
    pattern,
    dispatch: vi.fn(),
    validate: vi.fn(),
    instantiate: vi.fn(),
    insert: vi.fn(),
    apply: vi.fn(),
    thumbnail: vi.fn().mockResolvedValue(true),
    hover: vi.fn(),
    selected: { type: 'Section', props: { id: 'selected' } },
  }
})
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (select: (value: unknown) => unknown) =>
    select({
      config: { components: { Section: { label: 'Section', fields: {} } } },
      appState: { data: { root: {}, content: [] } },
      selectedItem: state.selected,
      dispatch: state.dispatch,
      getPermissions: () => ({ edit: true, insert: true }),
    }),
}))
vi.mock('@/lib/theme-engine/widget-registry-manifests', () => ({
  getWidgetManifest: () => ({ label: 'Section', capabilities: [] }),
}))
vi.mock('@/lib/theme-engine/widget-contracts', () => ({ systemDescriptor: () => undefined }))
vi.mock('@/lib/theme-engine/widget-patterns', () => ({
  getWidgetDesignPatterns: () => [state.pattern],
  instantiatePattern: state.instantiate,
  insertWidgetPattern: state.insert,
  applyWidgetPattern: state.apply,
  canApplyWidgetPattern: () => true,
  validatePatternOperation: state.validate,
  walkPatternDocument: () => {},
  designPatternFromJSON: () => state.pattern,
}))
vi.mock('@/lib/theme-engine/patterns/json', () => ({
  serializeSelectedPattern: vi.fn(),
  validatePatternJSON: vi.fn(),
}))
vi.mock('@/lib/style-engine/preview-store', () => ({
  stylePreviewStore: { setPreview: state.hover, clearPreview: vi.fn() },
}))
vi.mock('@/components/admin/theme-builder/PatternPreview', () => ({
  PatternThumbnail: () => <span>Design thumbnail</span>,
  PatternPreviewModal: () => <div>Pattern modal</div>,
}))
vi.mock('@/components/admin/theme-builder/useMyPatterns', () => ({
  useMyPatterns: () => ({
    docs: [{ id: 1, record: state.record, thumbnailStatus: 'ready' }],
    loading: false,
    page: 1,
    totalPages: 1,
    thumbnail: state.thumbnail,
  }),
}))
import { WidgetPatternLibrary } from '@/components/admin/theme-builder/WidgetPatternLibrary'

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  state.instantiate.mockReturnValue({ type: 'Section', props: { id: 'inserted' } })
  state.insert.mockReturnValue({
    root: {},
    content: [{ type: 'Section', props: { id: 'inserted' } }],
  })
})
afterEach(cleanup)
function library(mode: 'blocks' | 'user' = 'blocks', allowed = true) {
  return render(
    <MantineProvider>
      <WidgetPatternLibrary mode={mode} context="home" beforeOperation={() => allowed} />
    </MantineProvider>,
  )
}
describe('Pattern library interaction', () => {
  it('inserts once through the existing validation/dispatch path even with a compatible selection', () => {
    library()
    const tile = screen.getByRole('button', { name: 'Insert Airy section' })
    expect(tile.tagName).toBe('BUTTON') // Native Enter/Space activation; no custom keyboard handler.
    fireEvent.click(tile)
    expect(state.instantiate).toHaveBeenCalledTimes(1)
    expect(state.insert).toHaveBeenCalledTimes(1)
    expect(state.validate).toHaveBeenCalledTimes(1)
    expect(state.dispatch).toHaveBeenCalledWith({
      type: 'setData',
      data: state.insert.mock.results[0].value,
    })
    expect(state.apply).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Preview Airy section')).toBeNull()
    expect(screen.queryByLabelText('More actions for Airy section')).toBeNull()
    fireEvent.mouseEnter(tile.parentElement!)
    expect(state.hover).not.toHaveBeenCalled()
  })
  it('respects an active style transaction before inserting', () => {
    library('blocks', false)
    fireEvent.click(screen.getByRole('button', { name: 'Insert Airy section' }))
    expect(state.insert).not.toHaveBeenCalled()
    expect(state.dispatch).not.toHaveBeenCalled()
    expect(screen.getByText('Apply or cancel the active style draft first.')).toBeTruthy()
  })
  it('retains My Patterns management and preview separately from the insert button', async () => {
    library('user')
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Airy section' }))
    expect(await screen.findByRole('menuitem', { name: 'Edit metadata / Rename' })).toBeTruthy()
    expect(
      await screen.findByRole('menuitem', { name: 'Update from selected widget' }),
    ).toBeTruthy()
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Retry thumbnail' }))
    expect(state.thumbnail).toHaveBeenCalledTimes(1)
    expect(state.insert).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Preview Airy section')).toBeTruthy()
  })
})
