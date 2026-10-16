/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import {
  getServerMediaLibraryView,
  MEDIA_LIBRARY_VIEW_KEY,
  readMediaLibraryView,
  writeMediaLibraryView,
} from '@/components/admin/media/mediaLibraryPreference'
import {
  mediaDimensionsLabel,
  mediaFileKind,
  mediaPreviewSrc,
  prefersTransparencyBackdrop,
} from '@/components/admin/media/mediaThumbnail'

describe('media library view preference', () => {
  it('defaults to grid on the server and on a first visit', () => {
    window.localStorage.removeItem(MEDIA_LIBRARY_VIEW_KEY)
    expect(getServerMediaLibraryView()).toBe('grid')
    expect(readMediaLibraryView()).toBe('grid')
  })

  it('restores the last selected view from localStorage', () => {
    writeMediaLibraryView('table')
    expect(window.localStorage.getItem(MEDIA_LIBRARY_VIEW_KEY)).toBe('table')
    expect(readMediaLibraryView()).toBe('table')

    writeMediaLibraryView('grid')
    expect(readMediaLibraryView()).toBe('grid')
  })
})

describe('media thumbnail selection', () => {
  it('prefers a generated thumbnail over the original image', () => {
    expect(
      mediaPreviewSrc({
        mimeType: 'image/webp',
        thumbnailURL: '/api/media/file/card.webp',
        url: '/api/media/file/original.webp',
      }),
    ).toBe('/api/media/file/card.webp')
  })

  it('falls back to the original only for images', () => {
    expect(mediaPreviewSrc({ mimeType: 'image/png', url: '/api/media/file/logo.png' })).toBe(
      '/api/media/file/logo.png',
    )
    expect(mediaPreviewSrc({ mimeType: 'application/pdf', url: '/api/media/file/spec.pdf' })).toBeNull()
    expect(mediaPreviewSrc({ mimeType: 'video/mp4', url: '/api/media/file/clip.mp4' })).toBeNull()
  })

  it('uses a poster thumbnail for video and pdf when one exists', () => {
    expect(
      mediaPreviewSrc({
        mimeType: 'video/mp4',
        thumbnailURL: '/api/media/file/clip-poster.jpg',
        url: '/api/media/file/clip.mp4',
      }),
    ).toBe('/api/media/file/clip-poster.jpg')
  })

  it('classifies file kinds and transparency backdrops', () => {
    expect(mediaFileKind('image/svg+xml')).toBe('image')
    expect(mediaFileKind('application/pdf')).toBe('pdf')
    expect(mediaFileKind('video/webm')).toBe('video')
    expect(mediaFileKind('application/zip')).toBe('file')
    expect(prefersTransparencyBackdrop('image/png')).toBe(true)
    expect(prefersTransparencyBackdrop('image/jpeg')).toBe(false)
    expect(mediaDimensionsLabel(1600, 900)).toBe('1600 × 900')
    expect(mediaDimensionsLabel(null, 900)).toBeNull()
  })
})
