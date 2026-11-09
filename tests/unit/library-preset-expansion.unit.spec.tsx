import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
  BackgroundVideoPresets: [],
}))

import {
  BUTTON_PRESETS,
  HEADING_PRESETS,
  IMAGE_PRESETS,
  TEXT_PRESETS,
} from '@/lib/theme-engine/patterns/atom-presets'
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
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { LivePatternPreview } from '@/components/admin/theme-builder/PatternPreview'
import { MantineProvider } from '@mantine/core'

const config = getEditorConfigForContext('home')
const base = { root: { props: {} }, content: [] }

const NEW_SECTION_IDS = [
  'section-media-start',
  'section-media-end',
  'section-feature-grid',
  'section-cta',
  'section-editorial-intro',
] as const

describe('Batch 11 — useful preset expansion', () => {
  it('keeps Heading/P and Button catalogs structurally distinct without unfinished icons', () => {
    const headingIds = HEADING_PRESETS.map((p) => p.id)
    const copyIds = TEXT_PRESETS.map((p) => p.id)
    expect(headingIds).toEqual(
      expect.arrayContaining([
        'heading-display',
        'heading-accent',
        'heading-bordered',
        'heading-compact',
        'heading-editorial',
      ]),
    )
    expect(copyIds).toEqual(
      expect.arrayContaining(['copy-lead', 'copy-bordered', 'copy-tint', 'copy-body']),
    )
    expect(new Set([...headingIds, ...copyIds]).size).toBe(headingIds.length + copyIds.length)
    for (const pattern of [...HEADING_PRESETS, ...TEXT_PRESETS, ...BUTTON_PRESETS]) {
      expect(validateUniversalStyle(pattern.payload.content[0].props.style as any).valid).toBe(true)
      expect(JSON.stringify(pattern.payload)).not.toMatch(/"icon"\s*:\s*\{[^}]*"visible"\s*:\s*true/)
    }
  })

  it('adds square and portrait Image presets that remain editable after render', () => {
    const Image = createAtomRenderer('Image')
    const square = IMAGE_PRESETS.find((p) => p.id === 'image-square')!
    const portrait = IMAGE_PRESETS.find((p) => p.id === 'image-portrait')!
    expect(square.payload.content[0].props.aspectRatio).toBe('1:1')
    expect(portrait.payload.content[0].props.aspectRatio).toBe('3:4')
    for (const pattern of [square, portrait]) {
      const root = pattern.payload.content[0]
      const html = renderToStaticMarkup(
        <Image
          id={String(root.props.id)}
          src={String(root.props.src)}
          alt={String(root.props.alt || '')}
          aspectRatio={root.props.aspectRatio as any}
          style={root.props.style as any}
        />,
      )
      expect(html).toContain('pattern-library/media-sample.svg')
      expect(html).toMatch(/aspect-ratio:\s*(1\s*\/\s*1|3\s*\/\s*4)/)
    }
  })

  it('inserts new Section layouts with unique recursive ids and valid slots', () => {
    for (const id of NEW_SECTION_IDS) {
      const record = SYSTEM_PATTERNS.find((p) => p.id === id)
      expect(record, id).toBeTruthy()
      expect(() => validatePatternJSON(record!)).not.toThrow()
      let serial = 0
      const ids = new Set<string>()
      const instance = instantiatePatternJSON(record!, config, () => {
        const next = `n-${id}-${++serial}`
        ids.add(next)
        return next
      })
      expect(instance.type).toBe('Section')
      expect(ids.size).toBe(serial)
      expect(serial).toBeGreaterThan(1)
      const next = insertWidgetPattern(base, instance, 'home', config)
      expect(() => validatePatternOperation(next, base, 'home', config)).not.toThrow()
      expect(JSON.parse(JSON.stringify(instance))).toEqual(instance)
    }
  })

  it('renders lightweight previews for new Section layouts without protected-route fallback', () => {
    for (const id of NEW_SECTION_IDS) {
      const record = SYSTEM_PATTERNS.find((p) => p.id === id)!
      const html = renderToStaticMarkup(
        <MantineProvider>
          <LivePatternPreview record={record} />
        </MantineProvider>,
      )
      expect(html).not.toContain('protected preview route')
      expect(html).not.toContain('Live preview unavailable')
      expect(html.length).toBeGreaterThan(40)
    }
  })

  it('media+text sections include Image + Heading children; CTA includes Button Design V1', () => {
    const media = SYSTEM_PATTERNS.find((p) => p.id === 'section-media-start')!
    const blob = JSON.stringify(media.payload)
    expect(blob).toContain('"type":"Image"')
    expect(blob).toContain('"type":"Heading"')
    expect(blob).toContain('pattern-library/media-sample.svg')

    const cta = SYSTEM_PATTERNS.find((p) => p.id === 'section-cta')!
    const button = JSON.stringify(cta.payload)
    expect(button).toContain('"type":"Button"')
    expect(button).toContain('"version":1')
  })
})
