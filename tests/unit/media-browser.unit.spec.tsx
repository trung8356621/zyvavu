import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MediaBrowser } from '@/components/admin/media/MediaBrowser'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('media browsing and demo selection', () => {
  it('shows an empty library without a redundant use action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ docs: [], totalPages: 1 }))),
    )
    render(
      <MantineProvider>
        <MediaBrowser api="/api" kind="image" onSelect={vi.fn()} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    expect(await screen.findByText('No images yet. Upload media to get started.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use Media' })).toBeNull()
  })
  it('uses an existing image on its thumbnail click', async () => {
    const select = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            docs: [
              { id: 5, filename: 'hero.webp', url: '/media/hero.webp', mimeType: 'image/webp' },
            ],
            totalPages: 1,
          }),
        ),
      ),
    )
    render(
      <MantineProvider>
        <MediaBrowser api="/api" kind="image" onSelect={select} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Select hero.webp' }))
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 5, url: '/media/hero.webp' }))
  })
  it('imports a demo on thumbnail click and uses only the returned local asset', async () => {
    const select = vi.fn()
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          doc: {
            id: 9,
            url: '/api/media/file/local.webp',
            mimeType: 'image/webp',
          },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetcher)
    render(
      <MantineProvider>
        <MediaBrowser canImport api="/api" kind="image" onSelect={select} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Demo Images'))
    expect(fetcher).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use Blue Marble' }))
    await act(async () => {})
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, url: '/api/media/file/local.webp' }),
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Source')).toBeNull()
    expect(screen.queryByRole('button', { name: /Import and use/ })).toBeNull()
  })
  it('surfaces failed import without modifying the selected widget source', async () => {
    const select = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Download unavailable' }), { status: 502 }),
        ),
    )
    render(
      <MantineProvider>
        <MediaBrowser canImport api="/api" kind="image" onSelect={select} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Demo Images'))
    fireEvent.click(screen.getByRole('button', { name: 'Use Blue Marble' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(select).not.toHaveBeenCalled()
  })
  it('ignores an import response after picker cancellation', async () => {
    let resolveImport!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveImport = resolve
          }),
      ),
    )
    const select = vi.fn()
    const { unmount } = render(
      <MantineProvider>
        <MediaBrowser canImport api="/api" kind="image" onSelect={select} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Demo Images'))
    fireEvent.click(screen.getByRole('button', { name: 'Use Blue Marble' }))
    unmount()
    await act(async () =>
      resolveImport(
        new Response(
          JSON.stringify({ doc: { id: 9, url: '/media/demo.webp', mimeType: 'image/webp' } }),
        ),
      ),
    )
    expect(select).not.toHaveBeenCalled()
  })

  it('lists demo videos without fetching or autoplaying video files', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const { container } = render(
      <MantineProvider>
        <MediaBrowser canImport api="/api" kind="video" onSelect={vi.fn()} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Demo Videos'))
    expect(screen.getByRole('button', { name: 'Use Flowers in the breeze' })).toBeTruthy()
    expect(container.querySelector('video')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
