import { describe, expect, it } from 'vitest'
import { mediaKindWhere, mediaLibraryURL } from '@/components/admin/media/mediaLibraryQuery'

describe('shared media queries', () => {
  it('preserves unrelated filters without mutating native query state', () => {
    const where = { filename: { like: 'hero' }, mimeType: { contains: 'image/' } }
    expect(mediaKindWhere(where, 'video')).toEqual({
      filename: { like: 'hero' },
      mimeType: { contains: 'video/' },
    })
    expect(mediaKindWhere(where, 'all')).toEqual({ filename: { like: 'hero' } })
    expect(where.mimeType.contains).toBe('image/')
  })
  it('escapes search and bounds the page size for image/video browsing', () => {
    const url = new URL(mediaLibraryURL('/api', 'video', 'hero & city', 2), 'https://example.test')
    expect(url.searchParams.get('where[filename][like]')).toBe('hero & city')
    expect(url.searchParams.get('where[mimeType][contains]')).toBe('video/')
    expect(url.searchParams.get('limit')).toBe('24')
    expect(url.searchParams.get('page')).toBe('2')
  })
})
