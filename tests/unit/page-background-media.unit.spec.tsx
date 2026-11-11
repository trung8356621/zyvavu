import React from 'react'
import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { PageSettings } from '@/lib/theme-engine/types'

type Document = { root: { props: { pageSettings: PageSettings } } }
const puck = vi.hoisted(() => ({
  data: { root: { props: { pageSettings: {} } } } as Document,
  dispatch: vi.fn(),
}))
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (selector: (state: unknown) => unknown) =>
    selector({ appState: { data: puck.data }, dispatch: puck.dispatch }),
}))
vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: ({ onSelect, triggerLabel }: {
    onSelect: (media: { url: string }) => void
    triggerLabel: string
  }) => <button onClick={() => onSelect({ url: '/api/media/file/new.webp' })}>{triggerLabel}</button>,
}))

import { PageSettingsPanel } from '@/components/admin/theme-builder/PageSettingsPanel'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  puck.dispatch.mockReset()
})

it('chooses, previews and removes a background image through scoped Puck history writes', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  puck.data.root.props.pageSettings = {
    background: { type: 'image', imagePosition: 'bottom', imageRepeat: 'repeat-x' },
    text: { colorToken: 'primary' },
  }
  puck.dispatch.mockImplementation(({ data }: { data: (previous: Document) => Document }) => {
    puck.data = data(puck.data)
  })
  const panel = <MantineProvider><PageSettingsPanel /></MantineProvider>
  const view = render(panel)
  fireEvent.click(screen.getByRole('button', { name: 'Choose Image' }))
  expect(puck.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'setData', recordHistory: true }))
  expect(puck.data.root.props.pageSettings).toMatchObject({
    background: { imageUrl: '/api/media/file/new.webp', imagePosition: 'bottom', imageRepeat: 'repeat-x' },
    text: { colorToken: 'primary' },
  })
  view.rerender(<MantineProvider><PageSettingsPanel /></MantineProvider>)
  expect(screen.getByRole('img', { name: 'Page background preview' }).getAttribute('src')).toBe('/api/media/file/new.webp')
  fireEvent.click(screen.getByRole('button', { name: 'Remove Image' }))
  expect(puck.data.root.props.pageSettings.background?.imageUrl).toBeUndefined()
  expect(puck.data.root.props.pageSettings.background?.imagePosition).toBe('bottom')
})
