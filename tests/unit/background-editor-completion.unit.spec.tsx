import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import type { BackgroundConfig } from '@/lib/style-engine/types'
import { resolveSectionLayerStyles, resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { resolveContrastForegroundToken } from '@/lib/theme-engine/presets'
import { generateThemeCss, getActiveThemeConfig } from '@/lib/theme-engine/styles'
import { SectionFrontend } from '@/widgets/Section/frontend'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
  BackgroundVideoPresets: ({ onSelect }: { onSelect: (doc: unknown) => void }) => (
    <button
      onClick={() =>
        onSelect({ id: 7, url: '/local.mp4', posterUrl: '/poster.webp', posterMediaId: 8 })
      }
    >
      Use video fixture
    </button>
  ),
}))
import { BackgroundStyleControl } from '@/components/admin/theme-builder/style-controls/BackgroundStyleControl'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Background editor independent overlay', () => {
  it('keeps pattern settings across Color/Image/Video and removes only the overlay for None', () => {
    const pattern = {
      preset: 'noise' as const,
      colorToken: 'primary',
      opacity: 0.3,
      scale: 'lg' as const,
    }
    const change = vi.fn()
    function Control() {
      const [value, setValue] = useState<BackgroundConfig>({
        mode: 'color',
        colorToken: 'surface',
        pattern,
      })
      return (
        <BackgroundStyleControl
          value={value}
          onOpenColorModal={vi.fn()}
          onChange={(next) => {
            change(next)
            setValue(next)
          }}
        />
      )
    }
    const { container } = render(
      <MantineProvider>
        <Control />
      </MantineProvider>,
    )
    expect(screen.queryByRole('button', { name: /^Configure \/ Thiết lập$/ })).toBeNull()
    for (const mode of ['Image', 'Video', 'Color']) {
      fireEvent.click(screen.getByRole('radio', { name: mode }))
      expect(change.mock.lastCall?.[0].pattern).toEqual(pattern)
      const overlay = container.querySelector<HTMLElement>('[data-background-pattern-overlay]')!
      expect(overlay.style.pointerEvents).toBe('none')
      expect(overlay.style.opacity).toBe('0.3')
      expect(overlay.style.backgroundSize).toBe('8px 8px')
      expect(overlay.style.backgroundImage).toContain('--zyvavu-theme-primary')
    }
    fireEvent.click(screen.getByLabelText('Background pattern', { selector: 'input' }))
    fireEvent.click(screen.getByRole('option', { name: 'None' }))
    expect(container.querySelector('[data-background-pattern-overlay]')).toBeNull()
  })

  it('selects inline video into the draft while retaining presentation settings', () => {
    const change = vi.fn()
    const value: BackgroundConfig = {
      mode: 'video',
      pattern: { preset: 'grid' },
      video: {
        loop: false,
        position: 'top left',
        overlay: { colorToken: 'text', opacity: 0.2 },
      },
    }
    render(
      <MantineProvider>
        <BackgroundStyleControl value={value} onChange={change} onOpenColorModal={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Use video fixture' }))
    expect(change).toHaveBeenCalledWith({
      ...value,
      video: {
        ...value.video,
        mediaId: 7,
        url: '/local.mp4',
        posterUrl: '/poster.webp',
        posterMediaId: 8,
      },
    })
  })

  it.each(['color', 'image', 'video'] as const)(
    'renders %s with the same non-interactive pattern above media and below content',
    (mode) => {
      const style = {
        background: {
          mode,
          colorToken: 'text',
          image: { url: '/image.webp' },
          video: { url: '/video.mp4', posterUrl: '/poster.webp' },
          pattern: { preset: 'dots' as const, opacity: 0.2, scale: 'sm' as const },
        },
      }
      const layers = resolveSectionLayerStyles(style)
      expect(Number(layers.patternStyle.zIndex)).toBeGreaterThan(Number(layers.mediaStyle.zIndex))
      expect(Number(layers.containerStyle.zIndex)).toBeGreaterThan(
        Number(layers.patternStyle.zIndex),
      )
      expect(layers.rootStyle.overflow).toBe('hidden')
      expect(layers.patternStyle.pointerEvents).toBe('none')
      const html = renderToStaticMarkup(
        <SectionFrontend style={style}>
          <button>Content action</button>
        </SectionFrontend>,
      )
      expect(html).toContain('zyvavu-section__pattern')
      expect(html).toContain('Content action')
      expect(
        renderToStaticMarkup(
          <SectionFrontend
            style={{ background: { ...style.background, pattern: { preset: 'none' } } }}
          />,
        ),
      ).not.toContain('zyvavu-section__pattern')
    },
  )
})

describe('two-token contrast resolution', () => {
  it('keeps a readable default even if the alternate would have higher contrast', () => {
    expect(resolveContrastForegroundToken('#ffffff', '#666666', '#000000')).toBe('text')
  })
  it('tries only the alternate token when the default fails', () => {
    expect(resolveContrastForegroundToken('#000000', '#000000', '#ffffff')).toBe('background')
    expect(resolveContrastForegroundToken('#ffffff', '#000000', '#ffffff')).toBe('text')
    expect(resolveContrastForegroundToken('#777777', '#777777', '#888888')).toBe('background')
    expect(resolveContrastForegroundToken('#777777', '#888888', '#777777')).toBe('text')
  })
  it('does not certify unknown or translucent colors', () => {
    expect(
      resolveContrastForegroundToken('var(--image-color)', '#000000', '#ffffff'),
    ).toBeUndefined()
    expect(resolveContrastForegroundToken('#00000080', '#000000', '#ffffff')).toBeUndefined()
  })
  it('regenerates semantic decisions with theme changes, without changing style data or explicit overrides', () => {
    const theme = getActiveThemeConfig()
    theme.tokens.colors = {
      ...theme.tokens.colors,
      text: '#000000',
      background: '#ffffff',
      primary: '#000000',
    }
    expect(generateThemeCss(theme)).toContain(
      '--zyvavu-theme-foreground-on-primary: var(--zyvavu-theme-color-background)',
    )
    theme.tokens.colors.primary = '#ffffff'
    expect(generateThemeCss(theme)).toContain(
      '--zyvavu-theme-foreground-on-primary: var(--zyvavu-theme-color-text)',
    )
    const style = {
      colorToken: 'text',
      background: { mode: 'color' as const, colorToken: 'text' },
      typography: { colorToken: 'accent' },
    }
    const saved = JSON.stringify(style)
    expect(resolveWidgetStyles(style).color).toContain('--zyvavu-theme-accent')
    expect(resolveSectionLayerStyles(style).rootStyle.color).toContain('--zyvavu-theme-accent')
    const html = renderToStaticMarkup(
      <SectionFrontend style={{ background: { mode: 'color', colorToken: 'text' } }}>
        <TextBlockFrontend title="Default" />
        <TextBlockFrontend title="Explicit" style={style} />
      </SectionFrontend>,
    )
    expect(html).toContain('--zyvavu-inherited-foreground')
    expect(html).toContain('--zyvavu-theme-accent')
    expect(JSON.stringify(style)).toBe(saved)
  })
})
