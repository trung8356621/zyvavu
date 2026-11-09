import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  resolveButtonElementProps,
  resolveButtonHoverCssVars,
  resolveButtonNormalStyles,
} from '@/lib/style-engine/button-style'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import { validateUniversalStyle } from '@/lib/style-engine/validation'

describe('Button Design V1 persistence + render', () => {
  it('resolves normal preset and hover CSS variables without inventing history', () => {
    const normal = resolveButtonNormalStyles({
      version: 1,
      normal: {
        preset: 'theme',
        radius: { radiusToken: 'pill' },
        shadow: { shadowToken: 'shadowSoft' },
      },
    })
    expect(String(normal.backgroundColor)).toContain('primary')
    expect(normal.borderRadius).toBe('9999px')
    expect(normal.boxShadow).toContain('0 2px 8px')

    const hover = resolveButtonHoverCssVars({
      version: 1,
      hover: {
        background: { mode: 'color', colorToken: 'accent' },
        transform: 'lift',
        opacity: 0.8,
      },
    })
    expect(hover['--zyvavu-btn-hover-bg']).toContain('accent')
    expect(hover['--zyvavu-btn-hover-transform']).toBe('translateY(-3px)')
    expect(hover['--zyvavu-btn-hover-opacity']).toBe('0.8')
  })

  it('renders Button with class and hover vars on frontend markup', () => {
    const Button = createAtomRenderer('Button')
    const html = renderToStaticMarkup(
      <Button
        id="btn1"
        text="Go"
        href="/x"
        style={{
          button: {
            version: 1,
            normal: { preset: 'outline', radius: { radiusToken: 'md' } },
            hover: { transform: 'grow', text: { colorToken: 'primary' } },
          },
        }}
      />,
    )
    expect(html).toContain('zyvavu-styled-button')
    expect(html).toContain('--zyvavu-btn-hover-transform:scale(1.015)')
    expect(html).toContain('--zyvavu-btn-hover-color')
    expect(html).toContain('Go')
  })

  it('rejects icon shell persistence and accepts supported hover opacity', () => {
    expect(
      validateUniversalStyle({
        button: { version: 1, normal: { icon: { visible: true } } },
      }).valid,
    ).toBe(false)
    expect(
      validateUniversalStyle({
        button: { version: 1, hover: { opacity: 0.5, transform: 'none' } },
      }).valid,
    ).toBe(true)
    expect(resolveButtonElementProps({}).className).toBeUndefined()
  })
})
