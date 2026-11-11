import { describe, expect, it } from 'vitest'
import {
  getBuiltInCatalog,
  getIconCatalogVersion,
  searchBuiltInIcons,
  sanitizeSvgMarkup,
  isCustomIconName,
} from '@/lib/icons'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { getFrontendWidget } from '@/lib/theme-engine/widget-registry-frontend'

describe('icon catalog + registry', () => {
  it('loads a version-matched generated Lucide catalog without hardcoding names', () => {
    const catalog = getBuiltInCatalog()
    expect(catalog.length).toBeGreaterThan(1000)
    expect(getIconCatalogVersion()).toMatch(/^\d+\.\d+\.\d+/)
    expect(isCustomIconName('zalo')).toBe(true)
    expect(searchBuiltInIcons('zalo', 'custom').some((i) => i.name === 'zalo')).toBe(true)
    expect(searchBuiltInIcons('home').length).toBeGreaterThan(0)
  })

  it('sanitizes unsafe SVG markup', () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg" onclick="alert(1)">
      <script>alert(1)</script>
      <a href="javascript:alert(1)"><path d="M0 0"/></a>
      <use href="https://evil.example/x.svg#a"/>
    </svg>`
    const clean = sanitizeSvgMarkup(dirty)
    expect(clean).toBeTruthy()
    expect(clean!).not.toMatch(/script/i)
    expect(clean!).not.toMatch(/onclick/i)
    expect(clean!).not.toMatch(/javascript:/i)
    expect(clean!).not.toMatch(/https:\/\/evil/i)
  })

  it('registers Icon and CategoryList widgets', () => {
    expect(getWidgetManifest('Icon')?.id).toBe('Icon')
    expect(getWidgetManifest('CategoryList')?.id).toBe('CategoryList')
    expect(getFrontendWidget('Icon')?.component).toBeTruthy()
    expect(getFrontendWidget('CategoryList')?.component).toBeTruthy()
  })
})
