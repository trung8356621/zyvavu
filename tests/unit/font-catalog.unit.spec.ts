import { describe, expect, it, beforeEach } from 'vitest'
import {
  CURATED_FONTS,
  SYSTEM_FONTS,
  clearFontCatalogCache,
  extractPrimaryFontFamily,
  fetchFontsourceCatalog,
  getCuratedCatalogFallback,
  getFontCatalogForLanguage,
  getGoogleFontUrl,
  hasVietnameseSupport,
  isSystemOrGenericFont,
  languageToFontSubset,
  loadGoogleFontStyles,
  normalizeLanguageCode,
  VIETNAMESE_SAMPLE_TEXT,
  VIETNAMESE_SUPPORTED_FONTS,
} from '@/lib/theme-engine/fonts'
import { GET as getFontsRoute } from '@/app/api/fonts/route'
import { NextRequest } from 'next/server'

describe('Language-Aware Font Catalog & API — Section 8 Validation', () => {
  beforeEach(() => {
    clearFontCatalogCache()
  })

  it('1. Vietnamese primary language returns compatible font options with vietnamese subset', async () => {
    const catalog = await getFontCatalogForLanguage('vi')

    expect(catalog.language).toBe('vi')
    expect(catalog.subset).toBe('vietnamese')
    expect(catalog.total).toBeGreaterThan(0)
    expect(catalog.fonts.length).toBe(catalog.total)

    // System fonts must be included
    const hasSystemUI = catalog.fonts.some((f) => f.family === 'System UI' && f.isSystem)
    expect(hasSystemUI).toBe(true)

    // Every returned Google font MUST support Vietnamese
    for (const font of catalog.fonts) {
      if (!font.isSystem) {
        expect(font.subsets).toContain('vietnamese')
      }
      expect(hasVietnameseSupport(font.family, font)).toBe(true)
    }
  })

  it('2. English primary language returns the appropriate catalog with latin subset', async () => {
    const catalog = await getFontCatalogForLanguage('en')

    expect(catalog.language).toBe('en')
    expect(catalog.subset).toBe('latin')
    expect(catalog.total).toBeGreaterThan(0)

    // Latin catalog should have significantly more fonts than Vietnamese-only subset
    const vnCatalog = await getFontCatalogForLanguage('vi')
    expect(catalog.total).toBeGreaterThanOrEqual(vnCatalog.total)

    for (const font of catalog.fonts) {
      if (!font.isSystem) {
        expect(font.subsets).toContain('latin')
      }
    }
  })

  it('3. Switching language changes the available fonts and respects cache', async () => {
    const viCatalog = await getFontCatalogForLanguage('vi')
    const enCatalog = await getFontCatalogForLanguage('en')

    // Different languages map to different subsets
    expect(viCatalog.subset).toBe('vietnamese')
    expect(enCatalog.subset).toBe('latin')

    // Second call for Vietnamese should hit cached fontsource data
    const viCatalogCached = await getFontCatalogForLanguage('vi')
    expect(viCatalogCached.total).toBe(viCatalog.total)
  })

  it('4. Invalid or unconfigured lang is rejected or safely handled by /api/fonts', async () => {
    // 4a. Invalid format (e.g. invalid symbols)
    const invalidReq = new NextRequest('http://localhost:3000/api/fonts?lang=invalid__123')
    const invalidRes = await getFontsRoute(invalidReq)
    expect(invalidRes.status).toBe(400)
    const invalidJson = await invalidRes.json()
    expect(invalidJson.code).toBe('INVALID_LANGUAGE_CODE')

    // 4b. Unconfigured language (e.g. 'de' when site only configures 'vi' and 'en')
    const unconfiguredReq = new NextRequest('http://localhost:3000/api/fonts?lang=de')
    const unconfiguredRes = await getFontsRoute(unconfiguredReq)
    expect(unconfiguredRes.status).toBe(400)
    const unconfiguredJson = await unconfiguredRes.json()
    expect(unconfiguredJson.code).toBe('UNCONFIGURED_LANGUAGE')

    // 4c. Without lang parameter, uses primary site language (default 'vi')
    const defaultReq = new NextRequest('http://localhost:3000/api/fonts')
    const defaultRes = await getFontsRoute(defaultReq)
    expect(defaultRes.status).toBe(200)
    const defaultJson = await defaultRes.json()
    expect(defaultJson.language).toBe('vi')
    expect(defaultJson.subset).toBe('vietnamese')
    expect(defaultJson.fonts.length).toBeGreaterThan(0)

    // 4d. Configured secondary language (e.g. 'en') succeeds
    const enReq = new NextRequest('http://localhost:3000/api/fonts?lang=en')
    const enRes = await getFontsRoute(enReq)
    expect(enRes.status).toBe(200)
    const enJson = await enRes.json()
    expect(enJson.language).toBe('en')
    expect(enJson.subset).toBe('latin')
  })

  it('5. Fontsource unavailable -> local curated fallback works gracefully', async () => {
    const catalog = await getFontCatalogForLanguage('vi', { forceFallback: true })

    expect(catalog.source).toBe('fallback')
    expect(catalog.fonts.length).toBeGreaterThan(0)

    // System fonts and curated fonts are present
    expect(catalog.fonts.some((f) => f.family === 'System UI')).toBe(true)
    expect(catalog.fonts.some((f) => f.family === 'Inter')).toBe(true)

    // Curated catalog fallback helper returns complete structure
    const fallbackList = getCuratedCatalogFallback()
    expect(fallbackList.length).toBe(SYSTEM_FONTS.length + CURATED_FONTS.length)
  })

  it('6. Normalizes locale codes and maps BCP 47 locales accurately', () => {
    expect(normalizeLanguageCode('vi-VN')).toBe('vi')
    expect(normalizeLanguageCode('EN-US')).toBe('en')
    expect(normalizeLanguageCode('fr_FR')).toBe('fr')

    expect(languageToFontSubset('vi')).toBe('vietnamese')
    expect(languageToFontSubset('vi-VN')).toBe('vietnamese')
    expect(languageToFontSubset('en')).toBe('latin')
    expect(languageToFontSubset('ru')).toBe('cyrillic')
    expect(languageToFontSubset('unknown-locale')).toBeNull()
  })

  it('7. Unsupported language fallback provides explicit fallbackApplied notification', async () => {
    // When an unsupported language has no subset mapping
    const catalog = await getFontCatalogForLanguage('xyz')
    expect(catalog.subset).toBeNull()
    expect(catalog.fallbackApplied).toBe(true)
    expect(catalog.message).toContain('No dedicated font subset mapping')
    expect(catalog.fonts.length).toBeGreaterThan(0)
  })

  it('8. Sanitizes and validates external font data, omitting provider internals', async () => {
    const result = await fetchFontsourceCatalog()
    expect(result.data.length).toBeGreaterThan(0)

    for (const font of result.data.slice(0, 50)) {
      // Required normalized properties
      expect(typeof font.family).toBe('string')
      expect(font.family.length).toBeGreaterThan(0)
      expect(['sans-serif', 'serif', 'display', 'monospace', 'handwriting', 'other']).toContain(
        font.category,
      )
      expect(Array.isArray(font.weights)).toBe(true)
      expect(Array.isArray(font.subsets)).toBe(true)
      expect(typeof font.variable).toBe('boolean')

      // Must NOT leak provider-internal metadata
      expect((font as any).id).toBeUndefined()
      expect((font as any).defSubset).toBeUndefined()
      expect((font as any).lastModified).toBeUndefined()
      expect((font as any).license).toBeUndefined()
      expect((font as any).type).toBeUndefined()
    }
  })

  it('9. Google Fonts URL generator avoids duplicate requests and respects display=swap', () => {
    const url = getGoogleFontUrl(['Inter', 'Inter', 'Roboto'], [400, 600])
    expect(url).toBeDefined()
    expect(url).toContain('https://fonts.googleapis.com/css2?')
    expect(url).toContain('family=Inter:wght@400;600')
    expect(url).toContain('family=Roboto:wght@400;600')
    expect(url).toContain('display=swap')

    // System fonts should not be requested
    expect(getGoogleFontUrl(['System UI', 'Georgia (System Serif)'])).toBeNull()
  })

  it('10. Lazy font CSS loading helper safely handles SSR and browser environments', () => {
    // In node/vitest, document may be mock or undefined; must not throw
    expect(() => loadGoogleFontStyles(['Inter', 'Roboto'])).not.toThrow()
    expect(() => loadGoogleFontStyles(['System UI', 'Monospace (System Mono)'])).not.toThrow()
  })

  it('11. Provides rich Vietnamese sample text covering all tones and diacritics', () => {
    expect(VIETNAMESE_SAMPLE_TEXT.heading).toBeTruthy()
    expect(VIETNAMESE_SAMPLE_TEXT.body).toBeTruthy()

    // Must contain diacritics
    const diacritics = ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư']
    for (const char of diacritics) {
      expect(VIETNAMESE_SAMPLE_TEXT.body.toLowerCase()).toContain(char)
    }
  })

  it('12. Existing themes and previously saved fonts remain compatible', () => {
    // extractPrimaryFontFamily handles complex CSS stacks
    expect(extractPrimaryFontFamily("'Plus Jakarta Sans', system-ui, sans-serif")).toBe(
      'Plus Jakarta Sans',
    )
    expect(isSystemOrGenericFont('sans-serif')).toBe(true)
    expect(isSystemOrGenericFont('Georgia (System Serif)')).toBe(true)
    expect(isSystemOrGenericFont('Inter')).toBe(false)
  })
})
