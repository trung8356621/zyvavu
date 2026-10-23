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
  it('shows an empty library and keeps use disabled', async () => {
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
    expect((screen.getByRole('button', { name: 'Use Media' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
  it('only commits selected media after Use Media', async () => {
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
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use Media' }))
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 5, url: '/media/hero.webp' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Import and use Blue Marble' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Import and use Blue Marble' }))
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

  it('reports zero demo videos without loading or autoplaying placeholder files', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const { container } = render(
      <MantineProvider>
        <MediaBrowser canImport api="/api" kind="video" onSelect={vi.fn()} onCancel={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByText('Demo Videos'))
    expect(screen.getByText(/No verified demo videos/)).toBeTruthy()
    expect(container.querySelector('video')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
