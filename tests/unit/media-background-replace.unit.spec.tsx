import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { BackgroundConfig } from '@/lib/style-engine/types'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  BackgroundVideoPresets: () => null,
  MediaSourcePicker: ({ kind, onSelect }: { kind: string; onSelect: (doc: unknown) => void }) => (
    <button
      onClick={() => onSelect({ id: 17, url: `/media/new.${kind === 'image' ? 'webp' : 'mp4'}` })}
    >
      Replace {kind} fixture
    </button>
  ),
}))
import { BackgroundStyleControl } from '@/components/admin/theme-builder/style-controls/BackgroundStyleControl'
import { atomEditors } from '@/widgets/atoms/editor'

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
afterEach(cleanup)

describe('media presentation and fixed binding contracts', () => {
  it.each(['image', 'video'] as const)(
    'replaces only %s identity while keeping presentation',
    (kind) => {
      const source = {
        mediaId: 1,
        url: '/media/old',
        position: 'top left',
        overlay: { colorToken: 'primary', opacity: 0.3 },
        fallbackColorToken: 'surface',
      }
      const value: BackgroundConfig = {
        mode: kind,
        pattern: { preset: 'grid', opacity: 0.2 },
        [kind]: {
          ...source,
          ...(kind === 'image'
            ? { size: 'contain', repeat: 'no-repeat' }
            : { loop: false, muted: true, posterUrl: '/media/poster.webp' }),
        },
      }
      const change = vi.fn()
      render(
        <MantineProvider>
          <BackgroundStyleControl value={value} onChange={change} onOpenColorModal={vi.fn()} />
        </MantineProvider>,
      )
      fireEvent.click(screen.getByText(`Replace ${kind} fixture`))
      expect(change).toHaveBeenCalledWith({
        ...value,
        [kind]: {
          ...value[kind],
          mediaId: 17,
          url: `/media/new.${kind === 'image' ? 'webp' : 'mp4'}`,
        },
      })
      expect(value[kind]?.mediaId).toBe(1)
    },
  )

  it('exposes source selection only for the static Image atom', () => {
    expect(atomEditors.Image.config.fields.src?.type).toBe('custom')
    expect(atomEditors.DocumentFeaturedMedia.config.fields).toEqual({})
    expect(atomEditors.DocumentFeaturedMedia.config.defaultProps.binding).toBe(
      'document.featuredMedia',
    )
    expect(atomEditors.DocumentFeaturedMedia.config.defaultProps.role).toBe('document.media')
  })
})
