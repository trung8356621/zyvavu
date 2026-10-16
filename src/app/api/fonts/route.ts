import { NextResponse, type NextRequest } from 'next/server'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { isLanguageCode } from '@/lib/site/setup'
import { loadPublicSiteSettings } from '@/lib/site/settings'
import {
  getFontCatalogForLanguage,
  normalizeLanguageCode,
} from '@/lib/theme-engine/fonts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const settings = await loadPublicSiteSettings(payload)

    const primaryLang = normalizeLanguageCode(settings.language) || 'vi'
    const configuredLanguages = new Set<string>([primaryLang])

    if (settings.secondaryLanguage && settings.secondaryLanguage !== 'none') {
      const secondaryNorm = normalizeLanguageCode(settings.secondaryLanguage)
      if (secondaryNorm) {
        configuredLanguages.add(secondaryNorm)
      }
    }

    const { searchParams } = new URL(request.url)
    const rawLangParam = searchParams.get('lang')

    let targetLang = primaryLang

    if (rawLangParam !== null && rawLangParam.trim() !== '') {
      const trimmedLang = rawLangParam.trim()

      // Validate BCP 47 code format
      if (!isLanguageCode(trimmedLang)) {
        return NextResponse.json(
          {
            error: `Invalid language code format '${trimmedLang}'. Expected BCP 47 code (e.g. 'vi', 'en', 'vi-VN').`,
            code: 'INVALID_LANGUAGE_CODE',
          },
          { status: 400 },
        )
      }

      const normalizedParam = normalizeLanguageCode(trimmedLang)

      // Strict enforcement: Only accept configured site languages
      if (!configuredLanguages.has(normalizedParam)) {
        return NextResponse.json(
          {
            error: `Language '${trimmedLang}' is not configured on this site.`,
            code: 'UNCONFIGURED_LANGUAGE',
            configuredLanguages: Array.from(configuredLanguages),
          },
          { status: 400 },
        )
      }

      targetLang = normalizedParam
    }

    const catalog = await getFontCatalogForLanguage(targetLang)

    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
      },
    })
  } catch {
    // Graceful fallback if Payload or DB cannot be reached
    const fallbackCatalog = await getFontCatalogForLanguage('vi', { forceFallback: true })
    return NextResponse.json(fallbackCatalog, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
