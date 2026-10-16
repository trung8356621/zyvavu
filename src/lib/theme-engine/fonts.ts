/**
 * Google Fonts & Font Discovery Engine
 *
 * Supports dynamic discovery, cached catalog, and safe CSS URL building.
 * Ensures font-display: swap, safe fallbacks, and zero client footprint on public pages.
 */

export type FontItem = {
  family: string
  category: 'sans-serif' | 'serif' | 'display' | 'monospace'
  weights: number[]
  fallback: string
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

export function hasVietnameseSupport(fontFamily: string): boolean {
  if (!fontFamily) return false
  const primary = extractPrimaryFontFamily(fontFamily)
  return VIETNAMESE_SUPPORTED_FONTS.has(primary)
}

let cachedFontCatalog: FontItem[] = [...SYSTEM_FONTS, ...CURATED_FONTS]

/**
 * Discovers and returns available fonts.
 * If GOOGLE_FONTS_API_KEY is configured in env, can optionally query the Developer API and cache.
 * When no API key is provided, seamlessly uses the curated catalog.
 */
export async function getAvailableFonts(): Promise<FontItem[]> {
  const apiKey = process.env.GOOGLE_FONTS_API_KEY
  if (!apiKey || cachedFontCatalog.length > 25) {
    return cachedFontCatalog
  }

  try {
    const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`, {
      next: { revalidate: 86400 },
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.items)) {
        const remoteItems: FontItem[] = data.items.slice(0, 100).map((item: any) => ({
          family: item.family,
          category: item.category || 'sans-serif',
          weights: [400, 600, 700],
          fallback: item.category === 'serif' ? 'Georgia, serif' : 'sans-serif',
        }))
        cachedFontCatalog = [...SYSTEM_FONTS, ...remoteItems]
      }
    }
  } catch {
    // Graceful fallback to curated
  }

  return cachedFontCatalog
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
export function getGoogleFontUrl(fontFamilies: (string | undefined)[]): string | null {
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

  const familyParams = Array.from(uniqueFamilies).map((family) => {
    const encoded = encodeURIComponent(family)
    return `family=${encoded}:wght@400;500;600;700;800`
  })

  return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=swap`
}
