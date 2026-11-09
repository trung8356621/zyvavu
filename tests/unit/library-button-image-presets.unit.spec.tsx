import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { BUTTON_PRESETS, IMAGE_PRESETS } from '@/lib/theme-engine/patterns/atom-presets'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { validateUniversalStyle } from '@/lib/style-engine/validation'

describe('Batch 5 — Button/Image library presets', () => {
  it('Button presets use Button Design V1 and render via atom renderer', () => {
    const Button = createAtomRenderer('Button')
    const ids = BUTTON_PRESETS.map((p) => p.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'button-default',
        'button-primary',
        'button-outline',
        'button-soft',
        'button-pill',
        'button-large',
      ]),
    )
    for (const pattern of BUTTON_PRESETS) {
      const root = pattern.payload.content[0]
      const style = root.props.style as any
      expect(style.button?.version).toBe(1)
      expect(validateUniversalStyle(style).valid).toBe(true)
      const html = renderToStaticMarkup(
        <Button id={String(root.props.id)} text={String(root.props.text || 'Btn')} style={style} />,
      )
      expect(html).toContain(String(root.props.text))
      if (style.button?.normal || style.button?.hover) {
        expect(html).toContain('zyvavu-styled-button')
      }
    }
  })

  it('Image presets use local sample thumbnail instead of empty src', () => {
    const Image = createAtomRenderer('Image')
    for (const pattern of IMAGE_PRESETS) {
      const root = pattern.payload.content[0]
      expect(root.props.src).toBe('/pattern-library/media-sample.svg')
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
      expect(html).not.toContain('Image not configured')
    }
  })
})
