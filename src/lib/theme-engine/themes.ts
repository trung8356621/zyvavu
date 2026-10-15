import type { TemplateContext, ThemeConfig, ThemeTemplateDocument } from './types'

// Corporate Clean Theme Imports
import corporateThemeJson from '@/themes/corporate/theme.json'
import corporateHomeJson from '@/themes/corporate/templates/home.json'
import corporateSingleJson from '@/themes/corporate/templates/single.json'
import corporatePageJson from '@/themes/corporate/templates/page.json'
import corporateCategoryJson from '@/themes/corporate/templates/category.json'
import corporateProductJson from '@/themes/corporate/templates/product.json'
import corporateHeaderJson from '@/themes/corporate/parts/header.json'
import corporateFooterJson from '@/themes/corporate/parts/footer.json'

// Industrial Bold Theme Imports
import industrialThemeJson from '@/themes/industrial/theme.json'
import industrialHomeJson from '@/themes/industrial/templates/home.json'
import industrialSingleJson from '@/themes/industrial/templates/single.json'
import industrialPageJson from '@/themes/industrial/templates/page.json'
import industrialCategoryJson from '@/themes/industrial/templates/category.json'
import industrialProductJson from '@/themes/industrial/templates/product.json'
import industrialHeaderJson from '@/themes/industrial/parts/header.json'
import industrialFooterJson from '@/themes/industrial/parts/footer.json'

// Editorial Modern Theme Imports
import editorialThemeJson from '@/themes/editorial/theme.json'
import editorialHomeJson from '@/themes/editorial/templates/home.json'
import editorialSingleJson from '@/themes/editorial/templates/single.json'
import editorialPageJson from '@/themes/editorial/templates/page.json'
import editorialCategoryJson from '@/themes/editorial/templates/category.json'
import editorialProductJson from '@/themes/editorial/templates/product.json'
import editorialHeaderJson from '@/themes/editorial/parts/header.json'
import editorialFooterJson from '@/themes/editorial/parts/footer.json'

export const DEFAULT_THEME_ID = 'corporate'

export type ThemePreviewTokens = {
  primary: string
  accent: string
  background: string
  surface: string
  text: string
  headerBackground: string
  headerText: string
  fontFamily: string
}

export type InstalledTheme = {
  id: string
  name: string
  label: string
  description: string
  version: number
  themeConfig: ThemeConfig
  templates: Record<TemplateContext, ThemeTemplateDocument>
  preview: ThemePreviewTokens
}

export const INSTALLED_THEMES: Record<string, InstalledTheme> = {
  corporate: {
    id: 'corporate',
    name: 'corporate',
    label: 'Corporate Clean',
    description: 'Modern clean B2B theme with light header, teal branding, and structured content sections.',
    version: 1,
    themeConfig: corporateThemeJson as unknown as ThemeConfig,
    templates: {
      home: corporateHomeJson as unknown as ThemeTemplateDocument,
      single: corporateSingleJson as unknown as ThemeTemplateDocument,
      page: corporatePageJson as unknown as ThemeTemplateDocument,
      category: corporateCategoryJson as unknown as ThemeTemplateDocument,
      product: corporateProductJson as unknown as ThemeTemplateDocument,
      header: corporateHeaderJson as unknown as ThemeTemplateDocument,
      footer: corporateFooterJson as unknown as ThemeTemplateDocument,
    },
    preview: {
      primary: '#0e6b66',
      accent: '#2b8a7f',
      background: '#ffffff',
      surface: '#f8faf9',
      text: '#17201f',
      headerBackground: '#ffffff',
      headerText: '#17201f',
      fontFamily: 'system-ui, sans-serif',
    },
  },
  industrial: {
    id: 'industrial',
    name: 'industrial',
    label: 'Industrial Bold',
    description: 'Manufacturing & garment industry theme with green/lime industrial palette, dark header, and high-impact layouts.',
    version: 1,
    themeConfig: industrialThemeJson as unknown as ThemeConfig,
    templates: {
      home: industrialHomeJson as unknown as ThemeTemplateDocument,
      single: industrialSingleJson as unknown as ThemeTemplateDocument,
      page: industrialPageJson as unknown as ThemeTemplateDocument,
      category: industrialCategoryJson as unknown as ThemeTemplateDocument,
      product: industrialProductJson as unknown as ThemeTemplateDocument,
      header: industrialHeaderJson as unknown as ThemeTemplateDocument,
      footer: industrialFooterJson as unknown as ThemeTemplateDocument,
    },
    preview: {
      primary: '#2f6a38',
      accent: '#84cc16',
      background: '#f4f6f4',
      surface: '#ffffff',
      text: '#142217',
      headerBackground: '#19271e',
      headerText: '#ffffff',
      fontFamily: 'Montserrat, sans-serif',
    },
  },
  editorial: {
    id: 'editorial',
    name: 'editorial',
    label: 'Editorial Modern',
    description: 'Publication & blog theme with warm cream/burgundy visual palette, refined typography, and literary reading layouts.',
    version: 1,
    themeConfig: editorialThemeJson as unknown as ThemeConfig,
    templates: {
      home: editorialHomeJson as unknown as ThemeTemplateDocument,
      single: editorialSingleJson as unknown as ThemeTemplateDocument,
      page: editorialPageJson as unknown as ThemeTemplateDocument,
      category: editorialCategoryJson as unknown as ThemeTemplateDocument,
      product: editorialProductJson as unknown as ThemeTemplateDocument,
      header: editorialHeaderJson as unknown as ThemeTemplateDocument,
      footer: editorialFooterJson as unknown as ThemeTemplateDocument,
    },
    preview: {
      primary: '#7c1d2e',
      accent: '#b45309',
      background: '#faf8f5',
      surface: '#f3efe8',
      text: '#261c1d',
      headerBackground: '#faf8f5',
      headerText: '#261c1d',
      fontFamily: 'Merriweather, serif',
    },
  },
}

export function isValidThemeId(id?: string): boolean {
  if (!id) return false
  const clean = id.trim().toLowerCase()
  return clean === 'default' || Boolean(INSTALLED_THEMES[clean])
}

export function normalizeThemeId(id?: string): string {
  if (!id) return DEFAULT_THEME_ID
  const clean = id.trim().toLowerCase()
  if (clean === 'default' || clean === 'corporate') return 'corporate'
  if (INSTALLED_THEMES[clean]) return clean
  return DEFAULT_THEME_ID
}

export function getInstalledTheme(id?: string): InstalledTheme {
  const norm = normalizeThemeId(id)
  return INSTALLED_THEMES[norm] || INSTALLED_THEMES[DEFAULT_THEME_ID]
}

export function getAllInstalledThemes(): InstalledTheme[] {
  return Object.values(INSTALLED_THEMES)
}

export function getBundledTemplateForTheme(
  themeId: string,
  context: TemplateContext,
): ThemeTemplateDocument {
  const theme = getInstalledTheme(themeId)
  const doc = theme.templates[context]
  if (!doc) {
    throw new Error(`Template "${context}" not found in theme "${theme.id}"`)
  }
  return JSON.parse(JSON.stringify(doc))
}
