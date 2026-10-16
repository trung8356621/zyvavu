import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import type { ThemeConfig, ThemeTemplateDocument, PageSettings } from '@/lib/theme-engine/types'
import {
  DEFAULT_PAGE_SETTINGS,
  resolveContainerWidth,
  resolveEffectivePageLayout,
  isLegacySystemDefaultLayout,
  resolvePageSettingsStyles,
} from '@/lib/theme-engine/page-settings'
import { generateThemeCss, getActiveThemeConfig } from '@/lib/theme-engine/styles'
import { resolveSectionLayerStyles } from '@/lib/style-engine/serializer'
import { SectionFrontend } from '@/widgets/Section/frontend'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'

describe('Global Layout & Spacing Inheritance System', () => {
  const baseThemeConfig: ThemeConfig = {
    name: 'corporate',
    version: 1,
    tokens: {
      colors: {
        primary: '#0e6b66',
        background: '#ffffff',
        surface: '#f8faf9',
        text: '#17201f',
        border: '#dfe5e2',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        xxl: '64px',
      },
      layout: {
        containerWidth: '1200px',
        narrowWidth: '800px',
        wideWidth: '1400px',
        alignment: 'left',
        pageSpacing: 'md',
      },
      radius: {
        sm: '4px',
        md: '8px',
      },
    },
  }

  describe('1. Global Container Width Propagation', () => {
    it('generates global layout CSS variables from active published theme', () => {
      const css = generateThemeCss(baseThemeConfig)
      expect(css).toContain('--zyvavu-theme-container: 1200px;')
      expect(css).toContain('--zyvavu-theme-container-narrow: 800px;')
      expect(css).toContain('--zyvavu-theme-container-wide: 1400px;')
      expect(css).toContain('--zyvavu-theme-alignment: left;')
      expect(css).toContain('--zyvavu-theme-page-spacing: 16px;')
    })

    it('propagates changed global container width to all inheriting components', () => {
      const customConfig: ThemeConfig = {
        ...baseThemeConfig,
        tokens: {
          ...baseThemeConfig.tokens,
          layout: {
            ...baseThemeConfig.tokens.layout,
            containerWidth: '1360px',
          },
        },
      }
      const css = generateThemeCss(customConfig)
      expect(css).toContain('--zyvavu-theme-container: 1360px;')

      const resolvedWidth = resolveContainerWidth('containerWidth', customConfig.tokens)
      expect(resolvedWidth).toContain('1360px')

      // Section with inherit inherits containerWidth
      const layers = resolveSectionLayerStyles(undefined, {
        containerWidth: 'inherit',
        pageContainerWidth: 'containerWidth',
      })
      expect(layers.containerStyle.maxWidth).toContain('var(--zyvavu-theme-container')
    })
  })

  describe('2. Page-Specific Layout Overrides', () => {
    it('applies override only to the configured template without affecting others', () => {
      const pageWithOverride: PageSettings = {
        layout: {
          containerWidth: 'narrowWidth',
          spacing: 'xl',
          alignment: 'center',
          isOverride: true,
        },
      }

      const pageWithoutOverride: PageSettings = {}

      const effectiveA = resolveEffectivePageLayout(pageWithOverride, baseThemeConfig.tokens)
      const effectiveB = resolveEffectivePageLayout(pageWithoutOverride, baseThemeConfig.tokens)

      expect(effectiveA.isOverridden.containerWidth).toBe(true)
      expect(effectiveA.containerWidth).toBe('narrowWidth')
      expect(effectiveA.alignment).toBe('center')
      expect(effectiveA.spacing).toBe('xl')

      expect(effectiveB.isOverridden.containerWidth).toBe(false)
      expect(effectiveB.containerWidth).toBe('containerWidth')
      expect(effectiveB.alignment).toBe('left')
      expect(effectiveB.spacing).toBe('md')
    })
  })

  describe('3. Reset to Theme Action', () => {
    it('restores theme inheritance when layout is reset', () => {
      const customizedPage: PageSettings = {
        layout: {
          containerWidth: 'wideWidth',
          spacing: 'lg',
          alignment: 'right',
          isOverride: true,
        },
      }

      expect(resolveEffectivePageLayout(customizedPage, baseThemeConfig.tokens).containerWidth).toBe('wideWidth')

      // Reset action sets layout to undefined or inherit
      const resetPage: PageSettings = {
        ...customizedPage,
        layout: undefined,
      }

      const effectiveAfterReset = resolveEffectivePageLayout(resetPage, baseThemeConfig.tokens)
      expect(effectiveAfterReset.isOverridden.containerWidth).toBe(false)
      expect(effectiveAfterReset.isOverridden.alignment).toBe(false)
      expect(effectiveAfterReset.isOverridden.spacing).toBe(false)
      expect(effectiveAfterReset.containerWidth).toBe('containerWidth')
      expect(effectiveAfterReset.alignment).toBe('left')
      expect(effectiveAfterReset.spacing).toBe('md')
    })
  })

  describe('4. Section Settings Override Scope', () => {
    it('allows a section to override its width while siblings inherit page layout', () => {
      const pageSettings: PageSettings = {
        layout: {
          containerWidth: 'containerWidth',
          isOverride: true,
        },
      }

      // Section 1: inherits page
      const section1Layers = resolveSectionLayerStyles(undefined, {
        containerWidth: 'inherit',
        pageContainerWidth: pageSettings.layout?.containerWidth,
      })

      // Section 2: overrides to full width
      const section2Layers = resolveSectionLayerStyles(undefined, {
        containerWidth: 'full',
        pageContainerWidth: pageSettings.layout?.containerWidth,
      })

      // Section 3: overrides to narrow width
      const section3Layers = resolveSectionLayerStyles(undefined, {
        containerWidth: 'narrowWidth',
        pageContainerWidth: pageSettings.layout?.containerWidth,
      })

      expect(section1Layers.containerStyle.maxWidth).toContain('var(--zyvavu-theme-container')
      expect(section2Layers.containerStyle.maxWidth).toBe('100%')
      expect(section3Layers.containerStyle.maxWidth).toContain('var(--zyvavu-theme-container-narrow')
    })
  })

  describe('5. Consistency Across Templates (Home, Single, Page, Category)', () => {
    it('renders home, single, page, and category consistently with sections', () => {
      const templates = ['home', 'single', 'page', 'category'] as const

      for (const tpl of templates) {
        const doc: ThemeTemplateDocument = {
          version: 1,
          template: tpl,
          root: {
            props: {
              pageSettings: {
                layout: {
                  containerWidth: 'inherit',
                  spacing: 'inherit',
                  alignment: 'inherit',
                },
              },
            },
          },
          content: [
            {
              type: 'Section',
              props: {
                id: `sec-${tpl}`,
                containerWidth: 'inherit',
                verticalPadding: 'md',
              },
            },
          ],
          zones: {
            [`sec-${tpl}:content`]: [
              {
                type: 'PostTitle',
                props: { id: `title-${tpl}`, tag: 'h1' },
              },
            ],
          },
        }

        const { container } = render(<ThemeRenderer document={doc} />)
        const rootEl = container.querySelector('.zyvavu-theme-root')
        expect(rootEl).toBeTruthy()

        const sectionEl = container.querySelector(`#sec-${tpl}`)
        expect(sectionEl).toBeTruthy()
      }
    })
  })

  describe('6. Preservation of Bundled Theme Layouts', () => {
    it('preserves distinct layouts for default, editorial, and industrial themes', () => {
      const defaultTheme = getActiveThemeConfig('default')
      const editorialTheme = getActiveThemeConfig('editorial')
      const industrialTheme = getActiveThemeConfig('industrial')

      expect(defaultTheme.tokens.layout.containerWidth).toBe('1200px')
      expect(defaultTheme.tokens.layout.narrowWidth).toBe('800px')

      expect(editorialTheme.tokens.layout.containerWidth).toBe('1160px')
      expect(editorialTheme.tokens.layout.narrowWidth).toBe('740px')
      expect(editorialTheme.tokens.layout.wideWidth).toBe('1360px')

      expect(industrialTheme.tokens.layout.containerWidth).toBe('1280px')
      expect(industrialTheme.tokens.layout.narrowWidth).toBe('860px')
      expect(industrialTheme.tokens.layout.wideWidth).toBe('1440px')

      const editCss = generateThemeCss(editorialTheme)
      expect(editCss).toContain('--zyvavu-theme-container: 1160px;')
      expect(editCss).toContain('--zyvavu-theme-container-narrow: 740px;')

      const indCss = generateThemeCss(industrialTheme)
      expect(indCss).toContain('--zyvavu-theme-container: 1280px;')
      expect(indCss).toContain('--zyvavu-theme-container-narrow: 860px;')
    })
  })

  describe('7. Compatibility with Existing Saved Templates', () => {
    it('safely normalizes legacy system boilerplate defaults without treating them as overrides', () => {
      const legacySavedLayout: PageSettings['layout'] = {
        containerWidth: 'containerWidth',
        spacing: 'md',
        alignment: 'left',
      }

      // Should be recognized as legacy system default boilerplate
      expect(isLegacySystemDefaultLayout(legacySavedLayout)).toBe(true)

      // When theme configuration changes, this template inherits the new alignment and spacing!
      const modifiedThemeTokens = {
        ...baseThemeConfig.tokens,
        layout: {
          ...baseThemeConfig.tokens.layout,
          alignment: 'center' as const,
          pageSpacing: 'lg',
        },
      }

      const effective = resolveEffectivePageLayout({ layout: legacySavedLayout }, modifiedThemeTokens)
      expect(effective.isOverridden.alignment).toBe(false)
      expect(effective.alignment).toBe('center') // Inherited new theme alignment!
      expect(effective.isOverridden.spacing).toBe(false)
      expect(effective.spacing).toBe('lg') // Inherited new theme spacing!
    })

    it('preserves genuine user customizations from legacy data', () => {
      const genuineCustomLayout = {
        containerWidth: 'narrowWidth',
        spacing: 'sm',
        alignment: 'right' as const,
      }

      expect(isLegacySystemDefaultLayout(genuineCustomLayout)).toBe(false)

      const effective = resolveEffectivePageLayout({ layout: genuineCustomLayout }, baseThemeConfig.tokens)
      expect(effective.isOverridden.containerWidth).toBe(true)
      expect(effective.containerWidth).toBe('narrowWidth')
      expect(effective.isOverridden.alignment).toBe(true)
      expect(effective.alignment).toBe('right')
    })
  })

  describe('8. CSS Resolution & Absence of Artificial Width Constraints', () => {
    it('does not apply nested conflicting max-widths on sectioned page roots', () => {
      const sectionedDoc: ThemeTemplateDocument = {
        version: 1,
        template: 'home',
        root: {
          props: {
            pageSettings: {
              layout: {
                containerWidth: 'inherit',
              },
            },
          },
        },
        content: [
          {
            type: 'Section',
            props: { id: 'full-hero', containerWidth: 'full' },
          },
        ],
      }

      const styles = resolvePageSettingsStyles(sectionedDoc.root?.props?.pageSettings, baseThemeConfig.tokens, 'home', true)
      // When hasSections is true, root does not impose maxWidth
      expect(styles.style.maxWidth).toBeUndefined()
    })
  })
})
