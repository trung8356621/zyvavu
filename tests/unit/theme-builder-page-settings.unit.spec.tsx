import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import type { ThemeConfig, ThemeTemplateDocument, PageSettings } from '@/lib/theme-engine/types'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import {
  DEFAULT_PAGE_SETTINGS,
  resolveColorToken,
  resolveContainerWidth,
  resolvePageSettingsStyles,
  resolveRadiusToken,
  resolveSpacingToken,
  sanitizeScopedCss,
} from '@/lib/theme-engine/page-settings'
import { generateThemeCss, getActiveThemeConfig } from '@/lib/theme-engine/styles'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { getThemePaletteSwatches } from '@/components/admin/shared/ThemeColorPaletteModal'

describe('Theme Builder — Page Settings & Atomic Design System', () => {
  const mockDoc: ThemeTemplateDocument = {
    version: 1,
    template: 'single',
    root: {
      props: {
        pageSettings: {
          background: {
            type: 'palette',
            token: 'background',
          },
          text: {
            typography: 'p1',
            colorToken: 'text',
          },
          layout: {
            containerWidth: 'containerWidth',
            spacing: 'md',
            alignment: 'left',
          },
          customCSS: 'h2 { letter-spacing: 0.05em; }',
          customJS: '// safe hook',
        },
      },
    },
    content: [
      {
        type: 'Section',
        props: { id: 'sec-1' },
      },
    ],
    zones: {
      'sec-1:content': [
        {
          type: 'PostTitle',
          props: {
            id: 'title-1',
            tag: 'h1',
            style: {
              typography: 'h1',
              colorToken: 'primary',
              align: 'center',
            },
          },
        },
        {
          type: 'PostContent',
          props: {
            id: 'content-1',
          },
        },
      ],
    },
  }

  describe('1. Page Settings Validation & Atomic Design Enforcement', () => {
    it('validates a document with compliant semantic Page Settings', () => {
      const res = validateThemeTemplateDocument(mockDoc, 'single')
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('handles missing Page Settings gracefully using theme defaults (backward compatibility)', () => {
      const legacyDoc: ThemeTemplateDocument = {
        version: 1,
        template: 'single',
        root: {
          props: {},
        },
        content: [
          {
            type: 'Section',
            props: { id: 'sec-legacy' },
          },
        ],
        zones: {
          'sec-legacy:content': [
            {
              type: 'PostTitle',
              props: { id: 'title-1' },
            },
            {
              type: 'PostContent',
              props: { id: 'content-1' },
            },
          ],
        },
      }
      const res = validateThemeTemplateDocument(legacyDoc, 'single')
      expect(res.valid).toBe(true)
    })

    it('rejects raw hex color values in background.token', () => {
      const invalidDoc: ThemeTemplateDocument = {
        ...mockDoc,
        root: {
          props: {
            pageSettings: {
              background: {
                type: 'palette',
                token: '#ff0000', // Disallowed: raw hex
              },
            },
          },
        },
      }
      const res = validateThemeTemplateDocument(invalidDoc, 'single')
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Must be a semantic token ID'))).toBe(true)
    })

    it('rejects direct font-size values in text.typography', () => {
      const invalidDoc: ThemeTemplateDocument = {
        ...mockDoc,
        root: {
          props: {
            pageSettings: {
              text: {
                typography: '42px', // Disallowed: raw font size
              },
            },
          },
        },
      }
      const res = validateThemeTemplateDocument(invalidDoc, 'single')
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Must be a semantic preset ID'))).toBe(true)
    })

    it('rejects direct pixel dimensions in layout.containerWidth', () => {
      const invalidDoc: ThemeTemplateDocument = {
        ...mockDoc,
        root: {
          props: {
            pageSettings: {
              layout: {
                containerWidth: '1200px', // Disallowed: raw dimension
              },
            },
          },
        },
      }
      const res = validateThemeTemplateDocument(invalidDoc, 'single')
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Use semantic token'))).toBe(true)
    })

    it('rejects script tags inside customCSS', () => {
      const invalidDoc: ThemeTemplateDocument = {
        ...mockDoc,
        root: {
          props: {
            pageSettings: {
              customCSS: '<script>alert("xss")</script>',
            },
          },
        },
      }
      const res = validateThemeTemplateDocument(invalidDoc, 'single')
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('cannot contain script tags'))).toBe(true)
    })

    it('rejects unsafe eval or Function expressions in customJS', () => {
      const invalidDoc: ThemeTemplateDocument = {
        ...mockDoc,
        root: {
          props: {
            pageSettings: {
              customJS: 'eval("window.location = \'bad\'")',
            },
          },
        },
      }
      const res = validateThemeTemplateDocument(invalidDoc, 'single')
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Unsafe eval or Function constructor'))).toBe(true)
    })

    it('enforces Atomic Design System on widget styles by rejecting raw fontSize and color', () => {
      const invalidDoc: ThemeTemplateDocument = {
        ...mockDoc,
        content: [
          {
            type: 'PostTitle',
            props: {
              id: 'title-1',
              style: {
                fontSize: '42px', // Direct forbidden atom
                color: '#7c1d2e', // Direct forbidden atom
              },
            },
          },
          {
            type: 'PostContent',
            props: { id: 'content-1' },
          },
        ],
      }
      const res = validateThemeTemplateDocument(invalidDoc, 'single')
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('cannot define arbitrary fontSize'))).toBe(true)
      expect(res.errors.some((e) => e.includes('cannot define arbitrary color'))).toBe(true)
    })
  })

  describe('2. Semantic Token Resolution Logic', () => {
    it('resolves semantic color tokens into CSS variable references with fallback', () => {
      expect(resolveColorToken('primary')).toBe('var(--zyvavu-theme-primary, var(--zyvavu-theme-color-primary, #0e6b66))')
      expect(resolveColorToken('background')).toBe('var(--zyvavu-theme-background, var(--zyvavu-theme-color-background, #ffffff))')
      expect(resolveColorToken('surface')).toBe('var(--zyvavu-theme-surface, var(--zyvavu-theme-color-surface, #ffffff))')
      expect(resolveColorToken('primaryHover')).toBe('var(--zyvavu-theme-color-primary-hover, var(--zyvavu-theme-primaryHover, inherit))')
    })

    it('resolves container width tokens without arbitrary pixel inputs', () => {
      expect(resolveContainerWidth('containerWidth')).toBe('var(--zyvavu-theme-container, 1200px)')
      expect(resolveContainerWidth('narrowWidth')).toBe('var(--zyvavu-theme-container-narrow, 800px)')
      expect(resolveContainerWidth('full')).toBe('100%')
    })

    it('resolves spacing and radius scales', () => {
      expect(resolveSpacingToken('md')).toBe('var(--zyvavu-theme-spacing-md, 16px)')
      expect(resolveSpacingToken('none')).toBe('0px')
      expect(resolveRadiusToken('sm')).toBe('var(--zyvavu-theme-radius-sm, 8px)')
      expect(resolveRadiusToken('none')).toBe('0px')
    })

    it('safely sanitizes and scopes custom CSS to .zyvavu-theme-root', () => {
      const raw = `
        h1, h2 { color: blue; }
        .card { padding: 10px; }
        <script>alert("xss")</script>
        </style>
      `
      const scoped = sanitizeScopedCss(raw, '.zyvavu-theme-root')
      expect(scoped).toContain('.zyvavu-theme-root h1, .zyvavu-theme-root h2 { color: blue; }')
      expect(scoped).toContain('.zyvavu-theme-root .card { padding: 10px; }')
      expect(scoped).not.toContain('<script')
      expect(scoped).not.toContain('</style>')
    })

    it('resolves full PageSettings styles cleanly', () => {
      const settings: PageSettings = {
        background: { type: 'palette', token: 'surface' },
        text: { typography: 'p1', colorToken: 'text' },
        layout: { containerWidth: 'narrowWidth', spacing: 'lg', alignment: 'center' },
        customCSS: 'p { line-height: 1.8; }',
      }

      const res = resolvePageSettingsStyles(settings)
      expect(res.style.backgroundColor).toContain('var(--zyvavu-theme-surface')
      expect(res.style.color).toContain('var(--zyvavu-theme-text')
      expect(res.style.maxWidth).toContain('var(--zyvavu-theme-container-narrow')
      expect(res.style.textAlign).toBe('center')
      expect(res.className).toContain('zyvavu-preset-p1')
      expect(res.scopedCss).toContain('.zyvavu-theme-root p { line-height: 1.8; }')
    })
  })

  describe('3. Theme CSS Generation for Target Themes (Theme Builder CSS Resolution)', () => {
    it('generates Editorial theme CSS correctly when Editorial config is supplied', () => {
      const editorialConfig = getActiveThemeConfig('editorial')
      const css = generateThemeCss(editorialConfig)

      expect(css).toContain(`--zyvavu-theme-color-primary: ${editorialConfig.tokens.colors.primary};`)
      expect(css).toContain(`--zyvavu-theme-font: ${editorialConfig.tokens.typography.fontFamily};`)
      expect(css).toContain(`--zyvavu-theme-container: ${editorialConfig.tokens.layout.containerWidth};`)
    })

    it('generates Industrial theme CSS correctly when Industrial config is supplied', () => {
      const industrialConfig = getActiveThemeConfig('industrial')
      const css = generateThemeCss(industrialConfig)

      expect(css).toContain(`--zyvavu-theme-color-primary: ${industrialConfig.tokens.colors.primary};`)
      expect(css).toContain(`--zyvavu-theme-font: ${industrialConfig.tokens.typography.fontFamily};`)
      expect(css).toContain(`--zyvavu-theme-container: ${industrialConfig.tokens.layout.containerWidth};`)
    })
  })

  describe('4. Theme Color Palette Swatches for Background & Text Tokens', () => {
    it('provides standard swatches including background and surface tokens', () => {
      const config = getActiveThemeConfig('corporate')
      const swatches = getThemePaletteSwatches(config.tokens, undefined, { includeBackgroundTokens: true })

      const ids = swatches.map((s) => s.id)
      expect(ids).toContain('background')
      expect(ids).toContain('surface')
      expect(ids).toContain('text')
      expect(ids).toContain('primary')
      expect(ids).toContain('accent')
    })
  })

  describe('5. Frontend ThemeRenderer & Widget Semantic Styles Integration', () => {
    it('renders ThemeRenderer respecting PageSettings styles', () => {
      const docWithSettings: ThemeTemplateDocument = {
        version: 1,
        template: 'single',
        root: {
          props: {
            pageSettings: {
              background: { type: 'palette', token: 'surface' },
              layout: { containerWidth: 'containerWidth', alignment: 'center' },
            },
          },
        },
        content: [
          {
            type: 'PostTitle',
            props: { id: 'title-test', title: 'Hello World' },
          },
        ],
      }

      const { container } = render(<ThemeRenderer document={docWithSettings} />)
      const rootDiv = container.querySelector('.zyvavu-theme-root') as HTMLElement

      expect(rootDiv).not.toBeNull()
      expect(rootDiv.style.backgroundColor).toContain('var(--zyvavu-theme-surface')
      expect(rootDiv.style.textAlign).toBe('center')
    })

    it('renders PostTitleFrontend consuming semantic style props', () => {
      const { container } = render(
        <PostTitleFrontend
          title="Atomic Design Title"
          style={{
            typography: 'h2',
            colorToken: 'primary',
            align: 'right',
          }}
        />,
      )

      const wrapper = container.querySelector('.zyvavu-widget-post-title') as HTMLElement
      expect(wrapper.style.textAlign).toBe('right')

      const heading = container.querySelector('h2')
      expect(heading).not.toBeNull()
      expect(heading?.textContent).toBe('Atomic Design Title')
      expect(heading?.style.color).toContain('var(--zyvavu-theme-primary')
    })

    it('renders TextBlockFrontend consuming semantic style props', () => {
      const { container } = render(
        <TextBlockFrontend
          title="Feature Card"
          content="Card description content"
          style={{
            colorToken: 'accent',
            spacing: 'lg',
            radius: 'md',
            backgroundToken: 'surface',
          }}
        />,
      )

      const card = container.querySelector('.zyvavu-widget-text') as HTMLElement
      expect(card).not.toBeNull()
      expect(card.style.padding).toContain('var(--zyvavu-theme-spacing-lg')
      expect(card.style.borderRadius).toContain('var(--zyvavu-theme-radius-md')
      expect(card.style.backgroundColor).toContain('var(--zyvavu-theme-surface')
    })
  })
})
