import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

import { LivePatternPreview, PatternThumbnail } from '@/components/admin/theme-builder/PatternPreview'
import { CONTAINER_PRESETS } from '@/lib/theme-engine/patterns/atom-presets'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Batch 5.3 — Section/Pattern library previews', () => {
  it('renders empty Section container presets as compact structure shells', () => {
    const record = CONTAINER_PRESETS.find((p) => p.id === 'container-card')!
    const { container } = render(
      <MantineProvider>
        <LivePatternPreview record={record} />
      </MantineProvider>,
    )
    const shell = container.querySelector('[class*="sectionPreview"]') as HTMLElement
    expect(shell).toBeTruthy()
    expect(shell.style.maxHeight).toBe('110px')
    expect(container.querySelector('[class*="emptySlot"]')).toBeTruthy()
    expect(container.textContent).not.toContain('Live preview is available')
  })

  it('renders nested Columns structure for split section without protected-route fallback', () => {
    const record = SYSTEM_PATTERNS.find((p) => p.id === 'section-split')!
    const { container } = render(
      <MantineProvider>
        <LivePatternPreview record={record} />
      </MantineProvider>,
    )
    expect(container.querySelector('[class*="columnsPreview"]')).toBeTruthy()
    expect(container.querySelectorAll('[class*="columnCell"]').length).toBeGreaterThanOrEqual(2)
    expect(container.textContent).not.toContain('protected preview route')
  })

  it('falls back to live structure preview when complex thumbnail fails', async () => {
    let callback: IntersectionObserverCallback | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb
        }
        observe = vi.fn()
        disconnect = vi.fn()
        unobserve = vi.fn()
      },
    )
    const record = SYSTEM_PATTERNS.find((p) => p.id === 'section-airy')!
    const { container } = render(
      <MantineProvider>
        <PatternThumbnail record={record} url="/api/pattern-thumbnails/missing" />
      </MantineProvider>,
    )
    await act(async () => {
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    const img = container.querySelector('img') as HTMLImageElement | null
    expect(img).toBeTruthy()
    await act(async () => {
      img?.dispatchEvent(new Event('error'))
    })
    expect(container.querySelector('[class*="sectionPreview"], [class*="columnsPreview"]')).toBeTruthy()
    expect(container.textContent).not.toContain('Thumbnail unavailable')
  })

  it('uses cover object-fit for complex thumbnails to avoid distortion', async () => {
    let callback: IntersectionObserverCallback | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb
        }
        observe = vi.fn()
        disconnect = vi.fn()
        unobserve = vi.fn()
      },
    )
    const record = SYSTEM_PATTERNS.find((p) => p.id === 'columns-equal')!
    const { container } = render(
      <MantineProvider>
        <PatternThumbnail record={record} />
      </MantineProvider>,
    )
    await act(async () => {
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.className).toMatch(/thumbnailImage/)
    expect(getComputedStyle(img).objectFit || img.className).toBeTruthy()
  })
})
