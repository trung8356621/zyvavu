/**
 * Google Fonts & Font Discovery Engine
 *
 * Supports dynamic discovery, cached catalog, and safe CSS URL building.
 * Ensures font-display: swap, safe fallbacks, and zero client footprint on public pages.
 */

export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting' | 'other'

export type FontItem = {
  family: string
  category: FontCategory
  weights: number[]
  fallback: string
}

export type CatalogFontItem = {
  family: string
  category: FontCategory
  weights: number[]
  subsets: string[]
  variable: boolean
  isSystem?: boolean
  fallback?: string
  isCustom?: boolean
}

export type FontCatalogResult = {
  language: string
  subset: string | null
  total: number
  fonts: CatalogFontItem[]
  source: 'fontsource' | 'fallback'
  fallbackApplied?: boolean
  message?: string
}

// Built-in curated popular Google Fonts catalog with system fallbacks
export const CURATED_FONTS: FontItem[] = [
  // Sans-serif
  {
    family: 'Inter',
    category: 'sans-serif',
    weights: [400, 500, 600, 700, 800],
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    family: 'Roboto',
    category: 'sans-serif',
    weights: [400, 500, 700],
    fallback: 'Arial, sans-serif',
  },
  {
    family: 'Open Sans',
    category: 'sans-serif',
    weights: [400, 600, 700],
    fallback: 'Helvetica, Arial, sans-serif',
  },
  {
    family: 'Lato',
    category: 'sans-serif',
    weights: [400, 700],
    fallback: 'sans-serif',
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    weights: [400, 600, 700, 800],
    fallback: 'sans-serif',
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    weights: [400, 600, 700, 800],
    fallback: 'system-ui, sans-serif',
  },
  {
    family: 'Outfit',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    fallback: 'sans-serif',
  },
  {
    family: 'DM Sans',
    category: 'sans-serif',
    weights: [400, 500, 700],
    fallback: 'sans-serif',
  },
  {
    family: 'Manrope',
    category: 'sans-serif',
    weights: [400, 600, 700, 800],
    fallback: 'sans-serif',
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    fallback: 'sans-serif',
  },

  // Serif
  {
    family: 'Playfair Display',
    category: 'serif',
    weights: [400, 600, 700],
    fallback: 'Georgia, serif',
  },
  {
    family: 'Lora',
    category: 'serif',
    weights: [400, 500, 600, 700],
    fallback: 'Georgia, Times, serif',
  },
  {
    family: 'Merriweather',
    category: 'serif',
    weights: [400, 700],
    fallback: 'Georgia, serif',
  },
  {
    family: 'Cormorant Garamond',
    category: 'serif',
    weights: [400, 600, 700],
    fallback: 'Garamond, serif',
  },
  {
    family: 'Cinzel',
    category: 'serif',
    weights: [400, 700],
    fallback: 'Times New Roman, serif',
  },

  // Monospace & Display
  {
    family: 'Fira Code',
    category: 'monospace',
    weights: [400, 600],
    fallback: 'ui-monospace, monospace',
  },
  {
    family: 'Space Grotesk',
    category: 'display',
    weights: [400, 600, 700],
    fallback: 'sans-serif',
  },
  {
    family: 'Oswald',
    category: 'display',
    weights: [400, 600, 700],
    fallback: 'sans-serif',
  },
]

// System font choices that don't need external requests
export const SYSTEM_FONTS: FontItem[] = [
  {
    family: 'System UI',
    category: 'sans-serif',
    weights: [400, 600, 700],
    fallback: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    family: 'Georgia (System Serif)',
    category: 'serif',
    weights: [400, 700],
    fallback: 'Georgia, Cambria, serif',
  },
  {
    family: 'Monospace (System Mono)',
    category: 'monospace',
    weights: [400, 700],
    fallback: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
]

// Fonts verified to have full Vietnamese character and diacritic support
export const VIETNAMESE_SUPPORTED_FONTS = new Set<string>([
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Plus Jakarta Sans',
  'Lora',
  'Merriweather',
  'Oswald',
  'Fira Code',
  'Manrope',
  'System UI',
  'Georgia (System Serif)',
])

export const LOCALE_SUBSET_MAP: Record<string, string> = {
  vi: 'vietnamese',
  en: 'latin',
  es: 'latin',
  fr: 'latin',
  de: 'latin',
  it: 'latin',
  pt: 'latin',
  nl: 'latin',
  pl: 'latin-ext',
  tr: 'latin-ext',
  cs: 'latin-ext',
  ro: 'latin-ext',
  hu: 'latin-ext',
  ru: 'cyrillic',
  uk: 'cyrillic',
  bg: 'cyrillic',
  el: 'greek',
  ar: 'arabic',
  he: 'hebrew',
  hi: 'devanagari',
  th: 'thai',
  ko: 'korean',
  ja: 'japanese',
  zh: 'chinese-simplified',
}

export function normalizeLanguageCode(code?: string): string {
  if (!code || typeof code !== 'string') return ''
  return code.trim().toLowerCase().split(/[-_]/)[0]
}

export function languageToFontSubset(langCode?: string): string | null {
  const norm = normalizeLanguageCode(langCode)
  return LOCALE_SUBSET_MAP[norm] || null
}

export function hasVietnameseSupport(
  fontFamily: string,
  fontItem?: Partial<CatalogFontItem>,
): boolean {
  if (!fontFamily) return false
  const primary = extractPrimaryFontFamily(fontFamily)
  if (isSystemOrGenericFont(primary)) return true
  if (VIETNAMESE_SUPPORTED_FONTS.has(primary)) return true
  if (fontItem?.subsets && fontItem.subsets.includes('vietnamese')) return true
  return false
}

export function getCuratedCatalogFallback(): CatalogFontItem[] {
  const systemItems: CatalogFontItem[] = SYSTEM_FONTS.map((sf) => ({
    family: sf.family,
    category: sf.category,
    weights: sf.weights,
    subsets: ['vietnamese', 'latin', 'latin-ext'],
    variable: false,
    isSystem: true,
    fallback: sf.fallback,
  }))

  const curatedItems: CatalogFontItem[] = CURATED_FONTS.map((cf) => ({
    family: cf.family,
    category: cf.category,
    weights: cf.weights,
    subsets: VIETNAMESE_SUPPORTED_FONTS.has(cf.family)
      ? ['vietnamese', 'latin', 'latin-ext']
      : ['latin', 'latin-ext'],
    variable: false,
    isSystem: false,
    fallback: cf.fallback,
  }))

  return [...systemItems, ...curatedItems]
}

const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

let memoryCatalogCache: {
  timestamp: number
  data: CatalogFontItem[]
} | null = null

export function clearFontCatalogCache(): void {
  memoryCatalogCache = null
}

/**
 * Validates and normalizes raw item from Fontsource API.
 */
function normalizeFontsourceItem(item: any): CatalogFontItem | null {
  if (!item || typeof item !== 'object') return null
  if (typeof item.family !== 'string' || !item.family.trim()) return null

  // Ensure family contains only safe alphanumeric, spaces, and hyphens
  const family = item.family.trim()
  if (!/^[a-zA-Z0-9\s-]+$/.test(family)) return null

  // Only Google Fonts can be loaded via Google Fonts CDN
  if (item.type !== 'google') return null

  const allowedCategories: FontCategory[] = ['sans-serif', 'serif', 'display', 'monospace', 'handwriting']
  const category: FontCategory = allowedCategories.includes(item.category) ? item.category : 'sans-serif'

  const weights = Array.isArray(item.weights)
    ? item.weights.filter((w: any) => typeof w === 'number' && w >= 100 && w <= 900)
    : [400]

  const subsets = Array.isArray(item.subsets)
    ? item.subsets.filter((s: any) => typeof s === 'string' && s.length > 0)
    : []

  return {
    family,
    category,
    weights: weights.length > 0 ? weights : [400, 600, 700],
    subsets,
    variable: Boolean(item.variable),
    isSystem: false,
  }
}

/**
 * Fetches Fontsource catalog with 24-hour cache and deduplication.
 */
export async function fetchFontsourceCatalog(options?: {
  bypassCache?: boolean
  forceFallback?: boolean
}): Promise<{ data: CatalogFontItem[]; source: 'fontsource' | 'fallback' }> {
  if (options?.forceFallback) {
    return { data: getCuratedCatalogFallback(), source: 'fallback' }
  }

  const now = Date.now()
  if (!options?.bypassCache && memoryCatalogCache && now - memoryCatalogCache.timestamp < CATALOG_CACHE_TTL_MS) {
    return { data: memoryCatalogCache.data, source: 'fontsource' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch('https://api.fontsource.org/v1/fonts', {
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const rawList = await res.json()
      if (Array.isArray(rawList)) {
        const fontMap = new Map<string, CatalogFontItem>()

        for (const raw of rawList) {
          const item = normalizeFontsourceItem(raw)
          if (item && !fontMap.has(item.family.toLowerCase())) {
            fontMap.set(item.family.toLowerCase(), item)
          }
        }

        const validItems = Array.from(fontMap.values())
        if (validItems.length > 0) {
          memoryCatalogCache = {
            timestamp: now,
            data: validItems,
          }
          return { data: validItems, source: 'fontsource' }
        }
      }
    }
  } catch {
    // Graceful fallback to cached or curated catalog
  }

  if (memoryCatalogCache && memoryCatalogCache.data.length > 0) {
    return { data: memoryCatalogCache.data, source: 'fontsource' }
  }

  return { data: getCuratedCatalogFallback(), source: 'fallback' }
}

/**
 * Returns language-filtered font catalog with system fonts,
 * deduplication, and normalized metadata.
 */
export async function getFontCatalogForLanguage(
  lang: string,
  options?: {
    forceFallback?: boolean
    bypassCache?: boolean
  },
): Promise<FontCatalogResult> {
  const normLang = normalizeLanguageCode(lang) || 'vi'
  const targetSubset = languageToFontSubset(normLang)

  const { data: rawFonts, source } = await fetchFontsourceCatalog(options)

  const systemItems: CatalogFontItem[] = SYSTEM_FONTS.map((sf) => ({
    family: sf.family,
    category: sf.category,
    weights: sf.weights,
    subsets: ['vietnamese', 'latin', 'latin-ext'],
    variable: false,
    isSystem: true,
    fallback: sf.fallback,
  }))

  let filteredGoogleFonts: CatalogFontItem[] = []
  let fallbackApplied = false
  let message: string | undefined

  if (targetSubset) {
    // Strictly filter by target subset (e.g. 'vietnamese' for vi)
    filteredGoogleFonts = rawFonts.filter((f) => !f.isSystem && f.subsets.includes(targetSubset))
  } else {
    // Unsupported language: do not claim compatibility; provide explicit fallback
    fallbackApplied = true
    message = `No dedicated font subset mapping for locale '${lang}'. Showing standard fallback catalog.`
    filteredGoogleFonts = rawFonts.filter((f) => !f.isSystem && f.subsets.includes('latin'))
  }

  // Deduplicate and combine: system fonts first, then alphabetical Google fonts
  const fontMap = new Map<string, CatalogFontItem>()
  for (const sf of systemItems) {
    fontMap.set(sf.family.toLowerCase(), sf)
  }
  for (const gf of filteredGoogleFonts) {
    if (!fontMap.has(gf.family.toLowerCase())) {
      fontMap.set(gf.family.toLowerCase(), gf)
    }
  }

  const finalFonts = Array.from(fontMap.values())

  return {
    language: normLang,
    subset: targetSubset,
    total: finalFonts.length,
    fonts: finalFonts,
    source,
    ...(fallbackApplied ? { fallbackApplied, message } : {}),
  }
}

/**
 * Discovers and returns available fonts.
 * Preserved for backwards compatibility with existing consumers.
 */
export async function getAvailableFonts(): Promise<FontItem[]> {
  const catalog = await getFontCatalogForLanguage('vi')
  return catalog.fonts.map((f) => ({
    family: f.family,
    category: f.category,
    weights: f.weights,
    fallback: f.fallback || (f.category === 'serif' ? 'Georgia, serif' : 'sans-serif'),
  }))
}

/**
 * Extracts pure font family name from a CSS font-family string.
 * e.g. "'Playfair Display', Georgia, serif" -> "Playfair Display"
 */
export function extractPrimaryFontFamily(fontFamilyStr?: string): string {
  if (!fontFamilyStr) return ''
  const first = fontFamilyStr.split(',')[0].trim()
  return first.replace(/['"]/g, '').trim()
}

/**
 * Determines whether a font family is a known system font or generic keyword.
 */
export function isSystemOrGenericFont(family: string): boolean {
  const lower = family.toLowerCase()
  return (
    lower.includes('system-ui') ||
    lower.includes('system ui') ||
    lower.includes('-apple-system') ||
    lower.includes('blinkmacsystemfont') ||
    lower.includes('sans-serif') ||
    lower.includes('serif') ||
    lower.includes('monospace') ||
    lower.includes('inherit') ||
    lower === 'arial' ||
    lower === 'helvetica' ||
    lower === 'georgia' ||
    lower === 'times new roman' ||
    lower === 'courier new'
  )
}

/**
 * Generates a safe Google Fonts CSS URL for the specified font families.
 * Uses font-display: swap.
 * Returns null if all families are system fonts or empty.
 */
export function getGoogleFontUrl(
  fontFamilies: (string | undefined)[],
  weights: number[] = [400, 500, 600, 700, 800],
): string | null {
  const uniqueFamilies = new Set<string>()

  for (const raw of fontFamilies) {
    if (!raw) continue
    const primary = extractPrimaryFontFamily(raw)
    if (!primary || isSystemOrGenericFont(primary)) continue

    // Validate family contains only letters, spaces, numbers, hyphens
    if (/^[a-zA-Z0-9\s-]+$/.test(primary)) {
      uniqueFamilies.add(primary)
    }
  }

  if (uniqueFamilies.size === 0) {
    return null
  }

  const weightStr = weights.sort((a, b) => a - b).join(';')
  const familyParams = Array.from(uniqueFamilies).map((family) => {
    const encoded = encodeURIComponent(family)
    return `family=${encoded}:wght@${weightStr}`
  })

  return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=swap`
}

// Module-level set tracking injected Google Font stylesheets
const loadedFontFamilies = new Set<string>()

/**
 * Lazily loads Google Fonts CSS for candidate families.
 * Batches requests (max 15 families per link) and prevents duplicate stylesheet injections.
 */
export function loadGoogleFontStyles(
  families: (string | undefined)[],
  weights: number[] = [400, 600],
): void {
  if (typeof document === 'undefined') return

  const toLoad = families
    .map((f) => (f ? extractPrimaryFontFamily(f) : ''))
    .filter((fam) => fam && !isSystemOrGenericFont(fam) && !loadedFontFamilies.has(fam))

  if (toLoad.length === 0) return

  const batchSize = 15
  for (let i = 0; i < toLoad.length; i += batchSize) {
    const batch = toLoad.slice(i, i + batchSize)
    const url = getGoogleFontUrl(batch, weights)
    if (!url) continue

    for (const fam of batch) {
      loadedFontFamilies.add(fam)
    }

    const existingLink = document.querySelector(`link[href="${url}"]`)
    if (!existingLink) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      document.head.appendChild(link)
    }
  }
}

export const VIETNAMESE_SAMPLE_TEXT = {
  heading: 'Khám phá typography tiếng Việt & giao diện sắc nét',
  body: 'Văn bản mẫu tiếng Việt: Hà Nội, Huế, Sài Gòn — đất nước phồn vinh và phát triển bền vững với đầy đủ thanh điệu: sắc, huyền, hỏi, ngã, nặng (ă, â, đ, ê, ô, ơ, ư).',
}
