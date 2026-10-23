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
    fireEvent.click(screen.getByText('Select image fixture'))
    expect(select).toHaveBeenCalledWith({ id: 1, url: '/media/image.webp', mimeType: 'image/webp' })
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
    fireEvent.click(screen.getByText('Select video fixture'))
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })
})
