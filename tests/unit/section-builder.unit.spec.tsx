import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import { sectionManifest } from '@/widgets/Section/manifest'
import { SectionFrontend } from '@/widgets/Section/frontend'
import { sectionEditor } from '@/widgets/Section/editor'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'

describe('Theme Builder — Section Component & Universal Visual Styling', () => {
  describe('1. Section Widget Manifest & Capabilities', () => {
    it('has layout and section capabilities and supports all key template contexts', () => {
      expect(sectionManifest.id).toBe('Section')
      expect(sectionManifest.category).toBe('layout')
      expect(sectionManifest.capabilities).toContain('layout.container')
      expect(sectionManifest.capabilities).toContain('layout.section')
      expect(sectionManifest.supportedContexts).toContain('*')
    })

    it('defines a slot for nested widgets and layout fields in editor config', () => {
      expect(sectionEditor.fields).toBeDefined()
      expect(sectionEditor.fields.content).toEqual({ type: 'slot' })
      expect(sectionEditor.fields.containerWidth).toBeDefined()
      expect(sectionEditor.fields.verticalPadding).toBeDefined()
      expect(sectionEditor.fields.minHeight).toBeDefined()
    })
  })

  describe('2. Section Multi-layer Frontend SSR Rendering', () => {
    it('renders image background with isolated overlay and inner content', () => {
      const { container } = render(
        <SectionFrontend
          id="hero-section"
          containerWidth="wideWidth"
          verticalPadding="lg"
          style={{
            background: {
              mode: 'image',
              image: {
                url: 'https://example.com/banner.webp',
                position: 'center center',
                size: 'cover',
                overlay: {
                  colorToken: 'primary',
                  opacity: 0.5,
                },
                pattern: {
                  preset: 'dots',
                  opacity: 0.1,
                },
              },
            },
          }}
          content={<div data-testid="nested-hero-content">Hero Title</div>}
        />,
      )

      const sectionEl = container.querySelector('#hero-section')
      expect(sectionEl).toBeTruthy()

      // Media layer
      const mediaEl = container.querySelector('.zyvavu-section__media') as HTMLElement
      expect(mediaEl).toBeTruthy()
      expect(mediaEl.style.backgroundImage).toContain('https://example.com/banner.webp')

      // Overlay layer
      const overlayEl = container.querySelector('.zyvavu-section__overlay') as HTMLElement
      expect(overlayEl).toBeTruthy()
      expect(overlayEl.style.backgroundColor).toContain('var(--zyvavu-theme-primary')
      expect(overlayEl.style.opacity).toBe('0.5')

      // Pattern layer
      const patternEl = container.querySelector('.zyvavu-section__pattern') as HTMLElement
      expect(patternEl).toBeTruthy()
      expect(patternEl.style.backgroundImage).toContain('radial-gradient')

      // Nested content
      const contentEl = container.querySelector('[data-testid="nested-hero-content"]')
      expect(contentEl).toBeTruthy()
      expect(contentEl?.textContent).toBe('Hero Title')
    })

    it('renders video backgrounds with muted autoplay and poster fallback', () => {
      const { container } = render(
        <SectionFrontend
          id="video-section"
          style={{
            background: {
              mode: 'video',
              video: {
                url: 'https://example.com/intro.mp4',
                posterUrl: 'https://example.com/poster.jpg',
                loop: true,
                autoplay: true,
                overlay: {
                  colorToken: 'text',
                  opacity: 0.3,
                },
              },
            },
          }}
          content={<div>Video Overlay Content</div>}
        />,
      )

      const videoEl = container.querySelector('video')
      expect(videoEl).toBeTruthy()
      expect(videoEl?.getAttribute('poster')).toBe('https://example.com/poster.jpg')
      expect(videoEl?.muted).toBe(true)
      expect(videoEl?.loop).toBe(true)

      const sourceEl = container.querySelector('video source')
      expect(sourceEl?.getAttribute('src')).toBe('https://example.com/intro.mp4')
    })
  })

  describe('3. Template Policy & Nested Zone Validation', () => {
    it('validates a document where Section contains ordinary widgets in zones', () => {
      const sectionDoc: ThemeTemplateDocument = {
        version: 1,
        template: 'single',
        root: { props: {} },
        content: [
          {
            type: 'Section',
            props: {
              id: 'sec-1',
              containerWidth: 'containerWidth',
              style: {
                background: {
                  mode: 'color',
                  colorToken: 'surface',
                },
              },
            },
          },
        ],
        zones: {
          'sec-1:content': [
            {
              type: 'PostTitle',
              props: {
                id: 'title-nested',
                tag: 'h1',
                style: {
                  typography: {
                    typography: 'h1',
                    colorToken: 'primary',
                  },
                },
              },
            },
            {
              type: 'PostContent',
              props: {
                id: 'content-nested',
              },
            },
          ],
        },
      }

      const res = validateThemeTemplateDocument(sectionDoc, 'single')
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('enforces widget locks inside nested Section zones', () => {
      const prevDoc: ThemeTemplateDocument = {
        version: 1,
        template: 'single',
        root: { props: {} },
        content: [
          {
            type: 'Section',
            props: { id: 'sec-1' },
          },
        ],
        zones: {
          'sec-1:content': [
            {
              type: 'PostContent',
              props: {
                id: 'content-locked',
                lock: { canDelete: false },
              },
            },
          ],
        },
      }

      // Candidate doc that illegally deletes the locked widget
      const candidateDoc: ThemeTemplateDocument = {
        version: 1,
        template: 'single',
        root: { props: {} },
        content: [
          {
            type: 'Section',
            props: { id: 'sec-1' },
          },
        ],
        zones: {
          'sec-1:content': [],
        },
      }

      const res = validateThemeTemplateDocument(candidateDoc, 'single', prevDoc)
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('locked against deletion'))).toBe(true)
    })
  })

  describe('4. Semantic HTML Independence', () => {
    it('renders configured semantic tag while applying distinct visual typography preset', () => {
      const { container } = render(
        <PostTitleFrontend
          id="post-title"
          tag="h3" // Semantic tag configured in right sidebar Widget Settings
          style={{
            typography: {
              typography: 'h1', // Visual presentation preset from Style Engine
              colorToken: 'primary',
              effectPreset: 'glow',
              letterSpacing: 'wide',
            },
          }}
          title="Important Announcement"
        />,
      )

      // Must render semantic <h3> in the DOM
      const headingEl = container.querySelector('h3')
      expect(headingEl).toBeTruthy()
      expect(headingEl?.tagName.toLowerCase()).toBe('h3')

      // Must carry visual H1 preset class and CSS variables
      expect(headingEl?.className).toContain('zyvavu-typo-preset--h1')
      expect(headingEl?.style.fontSize).toContain('var(--zyvavu-theme-h1-size')
      expect(headingEl?.style.textShadow).toContain('var(--zyvavu-theme-accent')
      expect(headingEl?.style.letterSpacing).toBe('0.05em')
    })
  })

  describe('5. SSR ThemeRenderer Integration & Backward Compatibility', () => {
    it('renders full SSR document containing Section container with nested widgets', () => {
      const doc: ThemeTemplateDocument = {
        version: 1,
        template: 'home',
        root: { props: {} },
        content: [
          {
            type: 'Section',
            props: {
              id: 'intro-section',
              containerWidth: 'containerWidth',
              style: {
                background: {
                  mode: 'color',
                  colorToken: 'background',
                },
              },
            },
          },
        ],
        zones: {
          'intro-section:content': [
            {
              type: 'TextBlock',
              props: {
                id: 'txt-1',
                title: 'Welcome to Zyvavu',
                content: 'Modern decoupled CMS architecture.',
              },
            },
          ],
        },
      }

      const { container } = render(<ThemeRenderer document={doc} />)

      const sectionEl = container.querySelector('#intro-section')
      expect(sectionEl).toBeTruthy()

      const titleEl = container.querySelector('.zyvavu-widget-text__title')
      expect(titleEl?.textContent).toBe('Welcome to Zyvavu')
    })

    it('preserves existing templates without Section containers (backward compatibility)', () => {
      const legacyDoc: ThemeTemplateDocument = {
        version: 1,
        template: 'single',
        root: { props: {} },
        content: [
          {
            type: 'PostTitle',
            props: { id: 'title-old', title: 'Classic Post' },
          },
          {
            type: 'PostContent',
            props: { id: 'content-old' },
          },
        ],
      }

      const { container } = render(<ThemeRenderer document={legacyDoc} />)
      const titleEl = container.querySelector('.zyvavu-widget-post-title__heading')
      expect(titleEl?.textContent).toBe('Classic Post')
    })
  })
})
