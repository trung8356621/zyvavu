import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@puckeditor/core')>()
  const mockState = {
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
  }
  return {
    ...actual,
    usePuck: () => mockState,
    createUsePuck: () => (selector?: (s: any) => any) => (selector ? selector(mockState) : mockState),
  }
})

import {
  WidgetStyleContextMenu,
  computeTranslatedAnchorPosition,
} from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { PageSettingsPanel } from '@/components/admin/theme-builder/PageSettingsPanel'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import { BackgroundStyleControl } from '@/components/admin/theme-builder/style-controls/BackgroundStyleControl'

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

    it('ensures minimum clearance below top toolbar and positions inward near right edge', () => {
      const el = document.createElement('div')
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 900,
        right: 980,
        top: 20, // Near top toolbar
        bottom: 50,
        width: 80,
        height: 30,
        x: 900,
        y: 20,
        toJSON: () => {},
      })

      const pos = computeTranslatedAnchorPosition(el, 340, 480)
      // Because top (20) < 68, y is placed below the anchor: bottom (50) + 8 = 58, clamped to min 68
      expect(pos.y).toBeGreaterThanOrEqual(68)
      // Because right (980) + 12 + 340 (1332) > innerWidth - 12 (1012),
      // inward candidate (980 - 340 = 640) is chosen, extending inward
      expect(pos.x).toBe(640)
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

    it('correctly maps friendly Puck label Document Title to PostTitle capabilities', () => {
      const onUpdate = vi.fn()
      const onClose = vi.fn()

      render(
        <MantineProvider>
          <WidgetStyleContextMenu
            opened={true}
            onClose={onClose}
            anchorEl={null}
            initialPosition={{ x: 400, y: 150 }}
            componentType="Document Title"
            componentId="test-post-title"
            currentStyle={{ typography: 'h1', align: 'center' }}
            onUpdateStyle={onUpdate}
          />
        </MantineProvider>,
      )

      expect(screen.getByText(/Style:.*Title/i)).toBeDefined()
      expect(screen.getByText('Type')).toBeDefined()
      expect(screen.getByText('Layout')).toBeDefined()
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

  describe('4. ThemeColorPaletteModal Swatch Selection & Semantic Token Propagation', () => {
    it('applies the newly selected color token instead of the initial token', () => {
      const onApplyToken = vi.fn()
      const onApply = vi.fn()
      const onClose = vi.fn()

      render(
        <MantineProvider>
          <ThemeColorPaletteModal
            opened={true}
            value="surface"
            includeBackgroundTokens={true}
            onClose={onClose}
            onApplyToken={onApplyToken}
            onApply={onApply}
          />
        </MantineProvider>,
      )

      // Find the Accent Highlight swatch button
      const accentButton = screen.getByLabelText(/Select Accent Highlight/i)
      expect(accentButton).toBeDefined()
      fireEvent.click(accentButton)

      // Click Apply
      const applyBtn = screen.getByRole('button', { name: /^Apply$/i })
      fireEvent.click(applyBtn)

      // Must call onApplyToken with 'accent' (not 'surface')
      expect(onApplyToken).toHaveBeenCalledWith('accent', expect.any(String))
      expect(onClose).toHaveBeenCalled()
    })

    it('differentiates tokens that share identical hex color (#ffffff)', () => {
      const onApplyToken = vi.fn()
      const onClose = vi.fn()

      render(
        <MantineProvider>
          <ThemeColorPaletteModal
            opened={true}
            value="surface"
            includeBackgroundTokens={true}
            onClose={onClose}
            onApplyToken={onApplyToken}
          />
        </MantineProvider>,
      )

      // Both 'Background' and 'Surface Card' might have #ffffff. Click 'Background'.
      const bgButton = screen.getByLabelText(/Select Background:/i)
      expect(bgButton).toBeDefined()
      fireEvent.click(bgButton)

      const applyBtn = screen.getByRole('button', { name: /^Apply$/i })
      fireEvent.click(applyBtn)

      expect(onApplyToken).toHaveBeenCalledWith('background', expect.any(String))
    })
  })

  describe('5. BackgroundStyleControl Wix-like Visual Preview & Configure Entry', () => {
    it('renders prominent background visual preview with solid color and Configure action', () => {
      const onChange = vi.fn()
      const onOpenColorModal = vi.fn()

      render(
        <MantineProvider>
          <BackgroundStyleControl
            value={{ mode: 'color', colorToken: 'primary' }}
            onChange={onChange}
            onOpenColorModal={onOpenColorModal}
          />
        </MantineProvider>,
      )

      // Preview badges
      expect(screen.getByText(/Color: primary/i)).toBeDefined()

      // Configure / Thiết lập button exists and triggers color palette
      const configBtn = screen.getByRole('button', { name: /Configure \/ Thiết lập/i })
      expect(configBtn).toBeDefined()
      fireEvent.click(configBtn)
      expect(onOpenColorModal).toHaveBeenCalledWith('background')
    })

    it('renders prominent preview in image mode with overlay and fallback controls', () => {
      const onChange = vi.fn()
      const onOpenColorModal = vi.fn()

      render(
        <MantineProvider>
          <BackgroundStyleControl
            value={{
              mode: 'image',
              image: {
                url: 'https://example.com/hero.jpg',
                position: 'center center',
                size: 'cover',
                fallbackColorToken: 'surface',
                overlay: {
                  colorToken: 'primary',
                  opacity: 0.6,
                },
                pattern: {
                  preset: 'dots',
                  opacity: 0.2,
                },
              },
            }}
            onChange={onChange}
            onOpenColorModal={onOpenColorModal}
          />
        </MantineProvider>,
      )

      // Badges
      expect(screen.getByText(/Image: cover/i)).toBeDefined()
      expect(screen.getByText(/Overlay 60%/i)).toBeDefined()
      expect(screen.getByText(/Pattern: dots/i)).toBeDefined()

      // Fallback Color section exists with Change button calling 'fallback'
      expect(screen.getByText('Fallback Color')).toBeDefined()
      const changeButtons = screen.getAllByRole('button', { name: /^Change$/i })
      expect(changeButtons.length).toBeGreaterThan(0)
      fireEvent.click(changeButtons[0])
      expect(onOpenColorModal).toHaveBeenCalledWith('fallback')
    })

    it('renders prominent preview in video mode with poster and video overlay controls', () => {
      const onChange = vi.fn()
      const onOpenColorModal = vi.fn()

      render(
        <MantineProvider>
          <BackgroundStyleControl
            value={{
              mode: 'video',
              video: {
                url: 'https://example.com/bg.mp4',
                posterUrl: 'https://example.com/poster.jpg',
                fallbackColorToken: 'background',
                loop: true,
                overlay: {
                  colorToken: 'text',
                  opacity: 0.4,
                },
              },
            }}
            onChange={onChange}
            onOpenColorModal={onOpenColorModal}
          />
        </MantineProvider>,
      )

      expect(screen.getByText(/Video backdrop/i)).toBeDefined()
      expect(screen.getByText(/Overlay 40%/i)).toBeDefined()
      expect(screen.getByLabelText(/Loop Video/i)).toBeDefined()
    })
  })
})

