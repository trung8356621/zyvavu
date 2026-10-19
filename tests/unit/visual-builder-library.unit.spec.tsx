import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
const state = vi.hoisted(() => ({ current: null as any }))
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (selector: (value: any) => unknown) => selector(state.current),
}))
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import { WidgetPatternLibrary } from '@/components/admin/theme-builder/WidgetPatternLibrary'
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
afterEach(() => { cleanup(); stylePreviewStore.clearPreview(); vi.unstubAllGlobals() })
it('renders registry categories and inserts a real pattern as one Puck operation', () => {
  render(
    <MantineProvider>
      <WidgetPatternLibrary context="home" beforeOperation={() => true} />
    </MantineProvider>,
  )
  expect(screen.getByRole('navigation', { name: 'Widget categories' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
  expect(screen.getByText('Airy section')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Insert Airy section' }))
  expect(state.current.dispatch).toHaveBeenCalledOnce()
  const operation = state.current.dispatch.mock.calls[0][0]
  expect(operation.type).toBe('setData')
  expect(operation.data.content[0].type).toBe('Section')
  expect(state.current.appState.data.content).toHaveLength(0)
})
it('blocks library mutation while a style draft is active', () => {
  render(
    <MantineProvider>
      <WidgetPatternLibrary context="home" beforeOperation={() => false} />
    </MantineProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
  fireEvent.click(screen.getByRole('button', { name: 'Insert Airy section' }))
  expect(state.current.dispatch).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('Apply or cancel')
})
it('honors Puck insertion permissions and shows a recoverable error', () => {
  state.current.getPermissions.mockReturnValue({ insert: false, edit: true })
  render(
    <MantineProvider>
      <WidgetPatternLibrary context="home" beforeOperation={() => true} />
    </MantineProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Sections' }))
  fireEvent.click(screen.getByRole('button', { name: 'Insert Airy section' }))
  expect(state.current.dispatch).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('cannot be inserted')
})

it('opens My Patterns as a standalone modal without changing Puck data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [], totalPages: 1, page: 1 }) }))
  render(<MantineProvider><WidgetPatternLibrary context="home" beforeOperation={() => true} /></MantineProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'My Patterns' }))
  expect(await screen.findByRole('dialog', { name: 'My Patterns' })).toBeTruthy()
  expect(screen.queryByRole('radio', { name: 'System' })).toBeNull()
  expect(state.current.dispatch).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
it('groups Theme by fixed role and previews hover without document writes', () => {
  state.current.config = getEditorConfigForContext('single')
  const title = { type: 'DocumentTitle', props: { id: 'title', binding: 'document.title', role: 'document.title' } }
  state.current.selectedItem = title
  state.current.appState.data = { root: { props: {} }, content: [{ type: 'Section', props: { id: 'section', content: [title, { type: 'PostContent', props: { id: 'body' } }] } }] }
  render(<MantineProvider><WidgetPatternLibrary context="single" mode="theme" beforeOperation={() => true} /></MantineProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Document Title' }))
  const card = screen.getByText('Document Title Accent').closest('[data-with-border]')!
  fireEvent.mouseEnter(card)
  expect(stylePreviewStore.getPreview('title')).not.toBeNull()
  expect(state.current.dispatch).not.toHaveBeenCalled()
  fireEvent.mouseLeave(card)
  expect(stylePreviewStore.getPreview('title')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Insert Document Title Accent' }))
  expect(state.current.dispatch).toHaveBeenCalledOnce()
  const next = state.current.dispatch.mock.calls[0][0].data
  expect(next.content[0].props.content[0].props.binding).toBe('document.title')
  expect(next.content[0].props.content).toHaveLength(2)
})
