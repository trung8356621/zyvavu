import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

const native = vi.hoisted(() => ({ list: vi.fn(), document: vi.fn() }))
vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { api: '/api' } } }),
  useAuth: () => ({ permissions: { collections: { media: { create: true } } } }),
  useListDrawer: (options: unknown) => {
    native.list(options)
    return [
      ({ onSelect }: { onSelect: (value: unknown) => void }) => (
        <>
          <button
            onClick={() =>
              onSelect({ doc: { id: 1, url: '/media/image.webp', mimeType: 'image/webp' } })
            }
          >
            Select image fixture
          </button>
          <button
            onClick={() =>
              onSelect({ doc: { id: 2, url: '/media/video.mp4', mimeType: 'video/mp4' } })
            }
          >
            Select video fixture
          </button>
        </>
      ),
      {},
      { openDrawer: vi.fn(), closeDrawer: vi.fn() },
    ]
  },
  useDocumentDrawer: (options: unknown) => {
    native.document(options)
    return [
      ({ onSave }: { onSave: (value: unknown) => void }) => (
        <button
          onClick={() =>
            onSave({ doc: { id: 3, url: '/media/upload.webp', mimeType: 'image/webp' } })
          }
        >
          Save upload fixture
        </button>
      ),
      {},
      { openDrawer: vi.fn(), closeDrawer: vi.fn() },
    ]
  },
}))
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({
    docs: [{ id: 4, url: '/api/media/file/marker.png', mimeType: 'image/png', filename: 'marker.png' }],
    totalPages: 1,
  })))
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('native media selection bridge', () => {
  it('filters images and rejects videos before changing a source', () => {
    const select = vi.fn()
    render(
      <MantineProvider>
        <MediaSourcePicker kind="image" onSelect={select} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Choose image from Media'))
    expect(native.list).toHaveBeenCalledWith(
      expect.objectContaining({ filterOptions: { media: { mimeType: { contains: 'image/' } } } }),
    )
    fireEvent.click(screen.getByText('Select video fixture'))
    expect(select).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('Choose a valid image')
    const [firstOptions] = native.list.mock.calls[0]
    expect(native.list.mock.calls.at(-1)?.[0].collectionSlugs).toBe(firstOptions.collectionSlugs)
    expect(native.list.mock.calls.at(-1)?.[0].filterOptions).toBe(firstOptions.filterOptions)
    fireEvent.click(screen.getByText('Select image fixture'))
    expect(select).toHaveBeenCalledWith({ id: 1, url: '/media/image.webp', mimeType: 'image/webp' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByText('Choose image from Media'))
    fireEvent.click(screen.getByText('Save upload fixture'))
    expect(select).toHaveBeenLastCalledWith(expect.objectContaining({ id: 3 }))
  })

  it('filters videos and uses native document save for uploaded media', () => {
    const select = vi.fn()
    render(
      <MantineProvider>
        <MediaSourcePicker kind="video" onSelect={select} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Choose video from Media'))
    expect(native.list).toHaveBeenCalledWith(
      expect.objectContaining({ filterOptions: { media: { mimeType: { contains: 'video/' } } } }),
    )
    fireEvent.click(screen.getByText('Save upload fixture'))
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Choose video from Media'))
    fireEvent.click(screen.getByText('Select video fixture'))
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each([
    ['folder', /^folder$/i, 'lucide'],
    ['zalo', /^zalo$/i, 'custom'],
  ] as const)('selects %s directly from the shared library navigation', (query, label, source) => {
    const select = vi.fn()
    render(<MantineProvider><MediaSourcePicker kind="icon" onSelect={select} /></MantineProvider>)
    fireEvent.click(screen.getByText('Choose from Media Library'))
    fireEvent.click(screen.getByRole('button', { name: 'Media categories' }))
    expect(screen.getByRole('navigation', { name: 'Media library categories' }).textContent)
      .toContain('Built-in icons')
    expect(screen.queryByText('Videos')).toBeNull()
    fireEvent.change(screen.getByLabelText('Search icons'), { target: { value: query } })
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(select).toHaveBeenCalledOnce()
    expect(select).toHaveBeenCalledWith({ source, name: query, recolorable: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cancels without replacing an icon and applies an uploaded image on one click', async () => {
    const select = vi.fn()
    render(<MantineProvider>
      <MediaSourcePicker kind="icon" value={{ source: 'lucide', name: 'folder' }} onSelect={select} />
    </MantineProvider>)
    fireEvent.click(screen.getByText('Choose from Media Library'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(select).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Choose from Media Library'))
    fireEvent.click(screen.getByRole('button', { name: 'Media categories' }))
    fireEvent.click(screen.getByText('Images', { exact: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select marker.png' }))
    expect(select).toHaveBeenCalledOnce()
    expect(select).toHaveBeenCalledWith({
      source: 'media', mediaId: 4, mediaUrl: '/api/media/file/marker.png',
      mediaFilename: 'marker.png', recolorable: false,
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
