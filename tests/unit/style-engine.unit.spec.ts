import { describe, expect, it } from 'vitest'
import {
  componentSupportsDomain,
  getComponentStyleCapabilities,
} from '@/lib/style-engine/capabilities'
import {
  resolveBorderWidthToken,
  resolveColorToken,
  resolveContainerWidth,
  resolveLetterSpacing,
  resolveLineHeight,
  resolvePatternCss,
  resolveRadiusToken,
  resolveShadowToken,
  resolveSpacingToken,
  resolveTextEffect,
  serializeGradientCss,
  serializeMeshCss,
} from '@/lib/style-engine/token-resolver'
import { resolveSectionLayerStyles, resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import type { GradientDef, MeshDef, UniversalStyle } from '@/lib/style-engine/types'

describe('Universal Visual Style Engine', () => {
  describe('1. Token Resolution', () => {
    it('resolves standard and custom color tokens into theme CSS variables', () => {
      expect(resolveColorToken('primary')).toContain('--zyvavu-theme-primary')
      expect(resolveColorToken('surface')).toContain('--zyvavu-theme-surface')
      expect(resolveColorToken('accent')).toContain('--zyvavu-theme-accent')
      expect(resolveColorToken('customColor')).toContain('--zyvavu-theme-color-custom-color')
      expect(resolveColorToken(undefined, '#123456')).toBe('#123456')
    })

    it('resolves layout container width tokens accurately', () => {
      expect(resolveContainerWidth('containerWidth')).toContain('--zyvavu-theme-container')
      expect(resolveContainerWidth('narrowWidth')).toContain('--zyvavu-theme-container-narrow')
      expect(resolveContainerWidth('wideWidth')).toContain('--zyvavu-theme-container-wide')
      expect(resolveContainerWidth('full')).toBe('100%')
    })

    it('resolves semantic spacing and radius tokens', () => {
      expect(resolveSpacingToken('none')).toBe('0px')
      expect(resolveSpacingToken('md')).toContain('--zyvavu-theme-spacing-md')
      expect(resolveRadiusToken('none')).toBe('0px')
      expect(resolveRadiusToken('pill')).toBe('9999px')
      expect(resolveRadiusToken('sm')).toContain('--zyvavu-theme-radius-sm')
      expect(resolveBorderWidthToken('thin')).toBe('1px')
      expect(resolveBorderWidthToken('thick')).toBe('4px')
    })

    it('resolves text effects into accessible CSS shadow and stroke properties', () => {
      expect(resolveTextEffect('none')).toEqual({})
      expect(resolveTextEffect('shadow-soft').textShadow).toBeDefined()
      expect(resolveTextEffect('glow').textShadow).toContain('var(--zyvavu-theme-accent')
      expect(resolveTextEffect('outline').WebkitTextStroke).toContain('var(--zyvavu-theme-border')
    })

    it('resolves letter spacing and line height presets', () => {
      expect(resolveLetterSpacing('tight')).toBe('-0.025em')
      expect(resolveLetterSpacing('wider')).toBe('0.1em')
      expect(resolveLineHeight('compact')).toBe('1.2')
      expect(resolveLineHeight('relaxed')).toBe('1.75')
    })

    it('resolves lightweight CSS pattern presets without external assets', () => {
      expect(resolvePatternCss('dots')).toContain('radial-gradient')
      expect(resolvePatternCss('grid')).toContain('linear-gradient')
      expect(resolvePatternCss('diagonal')).toContain('repeating-linear-gradient')
      expect(resolvePatternCss('none')).toBeUndefined()
    })
  })

  describe('2. Gradient and Mesh CSS Serialization', () => {
    it('serializes linear gradients with degree angles and token color stops', () => {
      const grad: GradientDef = {
        type: 'linear',
        angle: 90,
        stops: [
          { token: 'primary', position: 0 },
          { token: 'accent', position: 100 },
        ],
      }
      const css = serializeGradientCss(grad)
      expect(css).toContain('linear-gradient(90deg')
      expect(css).toContain('var(--zyvavu-theme-primary')
      expect(css).toContain('0%')
      expect(css).toContain('var(--zyvavu-theme-accent')
      expect(css).toContain('100%')
    })

    it('serializes radial gradients centered on canvas', () => {
      const grad: GradientDef = {
        type: 'radial',
        angle: 0,
        stops: [
          { token: 'surface', position: 20 },
          { token: 'primary', position: 80 },
        ],
      }
      const css = serializeGradientCss(grad)
      expect(css).toContain('radial-gradient(circle at center')
      expect(css).toContain('20%')
      expect(css).toContain('80%')
    })

    it('serializes multi-point Mesh Gradients using pure CSS radial layers', () => {
      const mesh: MeshDef = {
        points: [
          { id: 'p1', token: 'primary', x: 25, y: 30, radius: 60 },
          { id: 'p2', token: 'accent', x: 75, y: 80, radius: 45 },
        ],
      }
      const css = serializeMeshCss(mesh)
      expect(css).toContain('radial-gradient(circle at 25% 30%')
      expect(css).toContain('radial-gradient(circle at 75% 80%')
      expect(css).toContain('transparent 60%')
      expect(css).toContain('transparent 45%')
    })
  })

  describe('3. Multi-layer Architecture & Overlay Isolation', () => {
    it('maintains strict visual layer separation and keeps content independent of overlay opacity', () => {
      const style: UniversalStyle = {
        background: {
          mode: 'image',
          image: {
            url: '/images/hero.webp',
            position: 'center center',
            size: 'cover',
            overlay: {
              colorToken: 'primary',
              opacity: 0.65,
            },
            pattern: {
              preset: 'dots',
              opacity: 0.2,
            },
          },
        },
      }

      const layers = resolveSectionLayerStyles(style, { containerWidth: 'containerWidth' })

      // Base color layer (z-index 1)
      expect(layers.baseColorStyle.zIndex).toBe(1)

      // Media layer (z-index 2)
      expect(layers.mediaStyle.zIndex).toBe(2)
      expect(layers.mediaStyle.backgroundImage).toContain('/images/hero.webp')

      // Overlay layer (z-index 3)
      expect(layers.overlayStyle.zIndex).toBe(3)
      expect(layers.overlayStyle.opacity).toBe(0.65)
      expect(layers.overlayStyle.backgroundColor).toContain('var(--zyvavu-theme-primary')

      // Pattern layer (z-index 4)
      expect(layers.patternStyle.zIndex).toBe(4)
      expect(layers.patternStyle.opacity).toBe(0.2)
      expect(layers.patternStyle.backgroundImage).toContain('radial-gradient')

      // Container & Content layer (z-index 10) - Must NOT inherit overlay opacity!
      expect(layers.containerStyle.zIndex).toBe(10)
      expect(layers.containerStyle.opacity).toBeUndefined()
      expect(layers.contentStyle.opacity).toBeUndefined()
    })

    it('configures video backgrounds with muted autoplay and loop flags', () => {
      const style: UniversalStyle = {
        background: {
          mode: 'video',
          video: {
            url: 'https://example.com/ambient.mp4',
            posterUrl: 'https://example.com/poster.jpg',
            loop: true,
            autoplay: true,
            overlay: {
              colorToken: 'text',
              opacity: 0.4,
            },
          },
        },
      }

      const layers = resolveSectionLayerStyles(style)
      expect(layers.videoConfig).toBeDefined()
      expect(layers.videoConfig?.url).toBe('https://example.com/ambient.mp4')
      expect(layers.videoConfig?.posterUrl).toBe('https://example.com/poster.jpg')
      expect(layers.videoConfig?.muted).toBe(true)
      expect(layers.videoConfig?.loop).toBe(true)
      expect(layers.overlayStyle.opacity).toBe(0.4)
    })
  })

  describe('4. Style Validation & Atomic Design Enforcement', () => {
    it('accepts valid semantic style structures', () => {
      const validStyle: UniversalStyle = {
        typography: {
          typography: 'h2',
          colorToken: 'primary',
          align: 'center',
          effectPreset: 'glow',
          letterSpacing: 'wide',
          lineHeight: 'relaxed',
        },
        background: {
          mode: 'color',
          colorToken: 'surface',
        },
        border: {
          style: 'solid',
          widthToken: 'thin',
          colorToken: 'border',
        },
        radius: {
          radiusToken: 'md',
        },
        shadow: {
          shadowToken: 'shadowSoft',
        },
      }

      const res = validateUniversalStyle(validStyle)
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('rejects raw pixel/rem font sizes in typography', () => {
      const invalidStyle: UniversalStyle = {
        typography: {
          typography: '32px',
        },
      }
      const res = validateUniversalStyle(invalidStyle)
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('Direct font size')
    })

    it('rejects raw hex color values in colorToken', () => {
      const invalidStyle: UniversalStyle = {
        typography: {
          colorToken: '#ff0000',
        },
      }
      const res = validateUniversalStyle(invalidStyle)
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('Direct color value')
    })

    it('rejects script tags and injection attempts', () => {
      const dangerousStyle = {
        typography: {
          colorToken: '<script>alert(1)</script>',
        },
      }
      const res = validateUniversalStyle(dangerousStyle)
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Unsafe script'))).toBe(true)
    })

    it('validates numeric bounds for gradient angle and opacity', () => {
      const outOfBoundsStyle: UniversalStyle = {
        background: {
          mode: 'color',
          gradient: {
            type: 'linear',
            angle: 450, // invalid > 360
            stops: [{ token: 'primary', position: 150 }], // invalid > 100
          },
        },
        effects: {
          opacity: 2.5, // invalid > 1
        },
      }

      const res = validateUniversalStyle(outOfBoundsStyle)
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Gradient angle'))).toBe(true)
      expect(res.errors.some((e) => e.includes('stop position'))).toBe(true)
      expect(res.errors.some((e) => e.includes('Effects opacity'))).toBe(true)
    })
  })

  describe('5. Style Capability Registry', () => {
    it('returns approved style domains for Section', () => {
      const caps = getComponentStyleCapabilities('Section')
      expect(caps).toContain('section')
      expect(caps).toContain('background')
      expect(caps).toContain('border')
      expect(caps).toContain('shadow')
      expect(componentSupportsDomain('Section', 'background')).toBe(true)
      expect(componentSupportsDomain('Section', 'typography')).toBe(false)
    })

    it('returns approved style domains for PostTitle', () => {
      const caps = getComponentStyleCapabilities('PostTitle')
      expect(caps).toContain('typography')
      expect(caps).toContain('spacing')
      expect(componentSupportsDomain('PostTitle', 'typography')).toBe(true)
      expect(componentSupportsDomain('PostTitle', 'background')).toBe(true)
    })

    it('returns approved style domains for TextBlock', () => {
      const caps = getComponentStyleCapabilities('TextBlock')
      expect(caps).toContain('typography')
      expect(caps).toContain('background')
      expect(caps).toContain('border')
      expect(componentSupportsDomain('TextBlock', 'typography')).toBe(true)
      expect(componentSupportsDomain('TextBlock', 'background')).toBe(true)
    })
  })
})
