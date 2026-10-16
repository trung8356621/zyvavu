import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@puckeditor/core')>()
  return {
    ...actual,
    usePuck: () => ({
      appState: {
        data: {
          root: {
            props: {
              pageSettings: {
                background: { type: 'theme' },
                text: {},
                layout: {},
                customCSS: '',
                customJS: '',
              },
            },
          },
          content: [],
        },
      },
      dispatch: vi.fn(),
    }),
  }
})

import {
  WidgetStyleContextMenu,
  computeTranslatedAnchorPosition,
} from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { PageSettingsPanel } from '@/components/admin/theme-builder/PageSettingsPanel'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Theme Builder Hotfix — Flat Accordion & Style Context Menu', () => {
  describe('1. Coordinate Translation & computeTranslatedAnchorPosition', () => {
    it('returns sensible fallback coordinates when anchor is null', () => {
      const pos = computeTranslatedAnchorPosition(null, 340, 480)
      expect(pos.x).toBeGreaterThan(0)
      expect(pos.y).toBeGreaterThan(0)
    })

    it('positions to the right of an ordinary DOM anchor element', () => {
      const el = document.createElement('div')
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 200,
        right: 250,
        top: 100,
        bottom: 140,
        width: 50,
        height: 40,
        x: 200,
        y: 100,
        toJSON: () => {},
      })

      const pos = computeTranslatedAnchorPosition(el, 300, 400)
      // right = 250 + padding 12 = 262
      expect(pos.x).toBe(262)
      expect(pos.y).toBe(100)
    })

    it('translates coordinates relative to parent window when anchor is inside an iframe', () => {
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)

      vi.spyOn(iframe, 'getBoundingClientRect').mockReturnValue({
        left: 320, // 320px sidebar offset
        right: 1200,
        top: 60,   // 60px header offset
        bottom: 800,
        width: 880,
        height: 740,
        x: 320,
        y: 60,
        toJSON: () => {},
      })

      const iframeDoc = iframe.contentDocument || document.implementation.createHTMLDocument()
      const anchorInIframe = iframeDoc.createElement('button')
      iframeDoc.body.appendChild(anchorInIframe)

      Object.defineProperty(iframeDoc.defaultView || {}, 'frameElement', {
        value: iframe,
        writable: true,
      })

      vi.spyOn(anchorInIframe, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 150,
        top: 50,
        bottom: 80,
        width: 50,
        height: 30,
        x: 100,
        y: 50,
        toJSON: () => {},
      })

      const pos = computeTranslatedAnchorPosition(anchorInIframe, 300, 400)
      // Translated X = iframeLeft (320) + anchorRight (150) + padding (12) = 482
      // Translated Y = iframeTop (60) + anchorTop (50) = 110
      expect(pos.x).toBe(482)
      expect(pos.y).toBe(110)

      document.body.removeChild(iframe)
    })

    it('clamps coordinates within viewport boundaries when overflowing', () => {
      const el = document.createElement('div')
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 950,
        right: 1000,
        top: 900,
        bottom: 950,
        width: 50,
        height: 50,
        x: 950,
        y: 900,
        toJSON: () => {},
      })

      const pos = computeTranslatedAnchorPosition(el, 340, 400)
      expect(pos.x).toBeGreaterThanOrEqual(12)
      expect(pos.y).toBeGreaterThanOrEqual(12)
      expect(pos.x + 340).toBeLessThanOrEqual(window.innerWidth)
      expect(pos.y + 400).toBeLessThanOrEqual(window.innerHeight)
    })
  })

  describe('2. WidgetStyleContextMenu Stability & Capability Filtering', () => {
    it('renders with initialPosition and displays typography domain for text widget', () => {
      const onUpdate = vi.fn()
      const onClose = vi.fn()

      render(
        <MantineProvider>
          <WidgetStyleContextMenu
            opened={true}
            onClose={onClose}
            anchorEl={null}
            initialPosition={{ x: 400, y: 150 }}
            componentType="PostTitle"
            componentId="test-post-title"
            currentStyle={{ typography: 'h1', align: 'center' }}
            onUpdateStyle={onUpdate}
          />
        </MantineProvider>,
      )

      expect(screen.getByText(/Style:.*Title/i)).toBeDefined()
      expect(screen.getByText('Type')).toBeDefined()
      expect(screen.getByText('Layout')).toBeDefined()
      expect(screen.queryByText('Backdrop')).toBeNull()
    })

    it('filters out typography domain and selects background for Section widget', () => {
      const onUpdate = vi.fn()
      const onClose = vi.fn()

      render(
        <MantineProvider>
          <WidgetStyleContextMenu
            opened={true}
            onClose={onClose}
            anchorEl={null}
            initialPosition={{ x: 400, y: 150 }}
            componentType="Section"
            componentId="test-section"
            currentStyle={{}}
            onUpdateStyle={onUpdate}
          />
        </MantineProvider>,
      )

      expect(screen.getByText(/Style: Section/i)).toBeDefined()
      expect(screen.queryByText('Type')).toBeNull()
      expect(screen.getByText('Backdrop')).toBeDefined()
    })
  })

  describe('3. PageSettingsPanel Flat Accordion Appearance', () => {
    it('renders all 4 accordion sections in a flat, multi-expand layout', () => {
      render(
        <MantineProvider>
          <PageSettingsPanel templateName="single" />
        </MantineProvider>,
      )

      // Header title
      expect(screen.getByText('Page Settings')).toBeDefined()
      expect(screen.getByText('SINGLE')).toBeDefined()

      // 4 Sections present
      expect(screen.getByText('Background')).toBeDefined()
      expect(screen.getByText('Default Typography & Color')).toBeDefined()
      expect(screen.getByText('Layout & Spacing')).toBeDefined()
      expect(screen.getByText('Advanced: Custom CSS & JS')).toBeDefined()

      // Custom CSS/JS Textareas are rendered
      expect(screen.getByText('Template Custom CSS')).toBeDefined()
      expect(screen.getByText('Template Custom JS')).toBeDefined()
    })
  })
})
