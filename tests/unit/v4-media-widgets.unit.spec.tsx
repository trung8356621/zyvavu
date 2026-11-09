import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
  BackgroundVideoPresets: [],
}))

import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { GalleryFrontend } from '@/widgets/Gallery/frontend'
import { galleryEditor } from '@/widgets/Gallery/editor'
import { VIDEO_PRESETS, IMAGE_PRESETS } from '@/lib/theme-engine/patterns/atom-presets'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import {
  instantiatePatternJSON,
  validatePatternJSON,
} from '@/lib/theme-engine/patterns/json'
import {
  insertWidgetPattern,
  validatePatternOperation,
} from '@/lib/theme-engine/widget-patterns'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { ATOM_TYPES } from '@/lib/theme-engine/widget-contracts'
import { ANIMATION_CSS } from '@/lib/style-engine/animation-presets'

const config = getEditorConfigForContext('home')
const base = { root: { props: {} }, content: [] }

describe('V4 — Image / Video / Gallery', () => {
  it('registers Video atom and Gallery widget', () => {
    expect(ATOM_TYPES).toContain('Video')
    expect(getWidgetManifest('Video')?.id).toBe('Video')
    expect(getWidgetManifest('Gallery')?.id).toBe('Gallery')
    expect(config.components.Video).toBeTruthy()
    expect(config.components.Gallery).toBeTruthy()
  })

  it('Image supports fit, position, caption, and safe link wrapping', () => {
    const Image = createAtomRenderer('Image')
    const html = renderToStaticMarkup(
      <Image
        id="img-1"
        src="/pattern-library/media-sample.svg"
        alt="Demo"
        caption="Caption text"
        href="https://example.com"
        newTab
        aspectRatio="1:1"
        objectFit="contain"
        objectPosition="top"
      />,
    )
    expect(html).toContain('<figure')
    expect(html).toContain('Caption text')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('object-fit:contain')
    expect(html).toContain('object-position:top')
    expect(html).toMatch(/aspect-ratio:\s*1\s*\/\s*1/)
    const unsafe = renderToStaticMarkup(
      <Image id="img-2" src="/x.svg" href="javascript:alert(1)" alt="" />,
    )
    expect(unsafe).not.toContain('javascript:')
  })

  it('Video defaults to no autoplay and respects reduced-motion poster contract', () => {
    const Video = createAtomRenderer('Video')
    const html = renderToStaticMarkup(
      <Video
        id="vid-1"
        src="/media/sample.mp4"
        posterUrl="/pattern-library/media-sample.svg"
        controls
        autoplay={false}
        muted
        aspectRatio="16:9"
      />,
    )
    expect(html).toContain('<video')
    expect(html).not.toMatch(/autoplay(?!=false)/i)
    expect(html).toContain('data-zyvavu-content-video')
    expect(html).toContain('data-zyvavu-video-poster')
    expect(ANIMATION_CSS).toContain('data-zyvavu-content-video')
    for (const preset of VIDEO_PRESETS) {
      expect(preset.payload.content[0].props.autoplay).toBe(false)
      expect(preset.payload.content[0].props.src).toBe('')
    }
  })

  it('Gallery renders CSS grid items with caption/href and rejects unsafe links', () => {
    const html = renderToStaticMarkup(
      <GalleryFrontend
        id="gal-1"
        columns={3}
        gapToken="md"
        aspectRatio="1:1"
        items={[
          {
            id: 'a',
            src: '/pattern-library/media-sample.svg',
            alt: 'A',
            caption: 'Shot A',
          },
          { id: 'b', src: '/pattern-library/media-sample.svg', alt: 'B', href: 'https://ok.test' },
          {
            id: 'c',
            src: '/pattern-library/media-sample.svg',
            href: 'javascript:alert(1)',
          },
        ]}
      />,
    )
    expect(html).toContain('grid-template-columns:repeat(3')
    expect(html).toContain('pattern-library/media-sample.svg')
    expect(html).toContain('href="https://ok.test"')
    expect(html).toContain('Shot A')
    expect(html).toContain('<figcaption')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<video')
  })

  it('inserts hero/testimonial/gallery section patterns with unique ids', () => {
    for (const id of ['section-hero-cta', 'section-testimonial', 'section-gallery']) {
      const record = SYSTEM_PATTERNS.find((p) => p.id === id)
      expect(record, id).toBeTruthy()
      expect(() => validatePatternJSON(record!)).not.toThrow()
      let n = 0
      const instance = instantiatePatternJSON(record!, config, () => `v4-${id}-${++n}`)
      const next = insertWidgetPattern(base, instance, 'home', config)
      expect(() => validatePatternOperation(next, base, 'home', config)).not.toThrow()
    }
  })

  it('Image presets retain sample src for library only; empty Image default has no sample', () => {
    expect(IMAGE_PRESETS.every((p) => p.payload.content[0].props.src)).toBe(true)
    expect(getWidgetManifest('Image')?.defaultProps?.src).toBe('')
  })

  it('Gallery Fields expose per-item alt/caption/href editor (no organizer)', () => {
    const fields = galleryEditor.fields as Record<string, { label?: string }>
    expect(fields.items?.label).toBe('Gallery images')
    expect(fields.columns).toBeTruthy()
    expect(fields.gapToken).toBeTruthy()
    expect(fields.aspectRatio).toBeTruthy()
    expect(fields.objectFit).toBeTruthy()
  })

  it('ItemImage supports portrait aspect + objectFit like FeaturedMedia', async () => {
    const { ItemImageFrontend } = await import('@/widgets/ItemImage/frontend')
    const html = renderToStaticMarkup(
      <ItemImageFrontend
        id="item-img-1"
        aspectRatio="3:4"
        objectFit="contain"
        linkToPost={false}
        dataContext={{
          type: 'home',
          item: {
            title: 'Post',
            url: '/post',
            image: { url: '/pattern-library/media-sample.svg', alt: 'Thumb' },
          },
        }}
      />,
    )
    expect(html).toContain('object-fit:contain')
    expect(html).toContain('padding-bottom:133.33%')
    expect(html).toContain('pattern-library/media-sample.svg')
  })
})
