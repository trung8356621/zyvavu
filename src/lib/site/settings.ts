import type { Payload } from 'payload'

import { canonicalPublicOrigin } from './origin'
import { assessSiteSetup, isLanguageCode, type SiteSetupAssessment } from './setup'

export type PublicSiteSettings = {
  siteName: string
  tagline: string
  siteUrl: string
  language: string
  pwaEnabled: boolean
  offlinePageLimit: number
  setup: SiteSetupAssessment
}

const fallback: PublicSiteSettings = {
  siteName: 'zyvavu',
  tagline: '',
  siteUrl: canonicalPublicOrigin(),
  language: 'vi',
  pwaEnabled: true,
  offlinePageLimit: 20,
  setup: { complete: false, missing: ['confirmation'] },
}

export async function loadPublicSiteSettings(payload: Payload): Promise<PublicSiteSettings> {
  try {
    const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    const language = isLanguageCode(settings.language) ? settings.language.trim() : fallback.language
    const limit = Number(settings.offlinePageLimit)
    return {
      siteName: settings.siteName?.trim() || fallback.siteName,
      tagline: settings.tagline?.trim() || '',
      siteUrl: canonicalPublicOrigin(settings.siteUrl),
      language,
      pwaEnabled: settings.pwaEnabled !== false,
      offlinePageLimit: Number.isInteger(limit) && limit >= 1 ? limit : fallback.offlinePageLimit,
      setup: assessSiteSetup(settings),
    }
  } catch {
    return fallback
  }
}
