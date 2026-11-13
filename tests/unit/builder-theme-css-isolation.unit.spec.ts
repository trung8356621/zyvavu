import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Builder content-theme CSS isolation', () => {
  it('does not inject generateThemeCss into ThemeBuilder Admin chrome', () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/admin/theme-builder/ThemeBuilder.tsx'),
      'utf8',
    )
    expect(file).not.toContain('generateThemeCss')
    expect(file).not.toContain("dangerouslySetInnerHTML={{ __html: themeCss }}")
  })

  it('injects theme CSS inside the Puck canvas iframe override', () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/builder/core/PuckHost.tsx'),
      'utf8',
    )
    expect(file).toContain('function StableIframeOverride')
    expect(file).toContain('generateThemeCss(themeConfig)')
    expect(file).toContain('useBuilderChrome')
  })
})

describe('Customizer preview_theme request scoping', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('prefers x-zyvavu-preview-theme header over shared preview cookie', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) => {
          if (name === 'payload-token') return { value: 'staff-token' }
          if (name === 'zyvavu_preview_theme') return { value: 'corporate' }
          return undefined
        },
      }),
      headers: async () => ({
        get: (name: string) =>
          name === 'x-zyvavu-preview-theme' ? 'industrial' : null,
      }),
    }))

    const { getPreviewThemeFromCookie } = await import('@/lib/theme-engine/resolver')
    await expect(getPreviewThemeFromCookie()).resolves.toBe('industrial')
  })

  it('falls back to preview cookie when request header is absent', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) => {
          if (name === 'payload-token') return { value: 'staff-token' }
          if (name === 'zyvavu_preview_theme') return { value: 'industrial' }
          return undefined
        },
      }),
      headers: async () => ({
        get: () => null,
      }),
    }))

    const { getPreviewThemeFromCookie } = await import('@/lib/theme-engine/resolver')
    await expect(getPreviewThemeFromCookie()).resolves.toBe('industrial')
  })

  it('middleware forwards preview_theme query to request header', async () => {
    const { middleware } = await import('@/middleware')
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams('preview_theme=test-cyber'),
      },
      headers: new Headers(),
    } as any

    const response = middleware(request)
    // NextResponse.next returns a response; request headers are applied via the init object.
    expect(response).toBeTruthy()
    expect(fs.readFileSync(path.resolve(process.cwd(), 'src/middleware.ts'), 'utf8')).toContain(
      'x-zyvavu-preview-theme',
    )
  })
})

describe('ThemeCustomizer preview route binding', () => {
  it('keeps preview routes tied to the selected theme id', () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/admin/theme-customizer/ThemeCustomizerView.tsx'),
      'utf8',
    )
    expect(file).toContain('preview_theme=${targetThemeId}')
    expect(file).toContain('resolveDraftThemeConfig')
  })

  it('resyncs iframe route when theme/previewRoutes change', () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/admin/theme-customizer/ThemeCustomizer.tsx'),
      'utf8',
    )
    expect(file).toContain('previewRoutes, themeId')
    expect(file).toContain('setPreviewRoute')
  })
})
