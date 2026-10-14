import type { Payload } from 'payload'

import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIMEZONE,
  DEFAULT_WEEK_STARTS_ON,
} from '@/lib/dateTime'
import {
  DEFAULT_POST_PERMALINK_STRUCTURE,
  normalizePermalinkPattern,
} from '@/lib/permalinks'
import { canonicalPublicOrigin } from './origin'
import { assessSiteSetup, isLanguageCode, type SiteSetupAssessment } from './setup'

export type PublicSiteSettings = {
  siteName: string
  tagline: string
  siteUrl: string
  language: string
  secondaryLanguage?: string
  pwaEnabled: boolean
  offlinePageLimit: number
  setup: SiteSetupAssessment
  logoUrl?: string
  logoAlt?: string
  faviconUrl?: string
  timezone: string
  dateFormat: string
  timeFormat: string
  weekStartsOn: string
  postPermalinkStructure: string
}

const fallback: PublicSiteSettings = {
  siteName: 'zyvavu',
  tagline: '',
  siteUrl: canonicalPublicOrigin(),
  language: 'vi',
  secondaryLanguage: 'en',
  pwaEnabled: true,
  offlinePageLimit: 20,
  setup: { complete: false, missing: ['confirmation'] },
  timezone: DEFAULT_TIMEZONE,
  dateFormat: DEFAULT_DATE_FORMAT,
  timeFormat: DEFAULT_TIME_FORMAT,
  weekStartsOn: DEFAULT_WEEK_STARTS_ON,
  postPermalinkStructure: DEFAULT_POST_PERMALINK_STRUCTURE,
}

export async function loadPublicSiteSettings(payload: Payload): Promise<PublicSiteSettings> {
  try {
    const settings = await payload.findGlobal({ slug: 'settings', depth: 1, overrideAccess: true })
    const language = isLanguageCode(settings.language) ? settings.language.trim() : fallback.language
    const limit = Number(settings.offlinePageLimit)

    let logoUrl: string | undefined
    let logoAlt: string | undefined
    if (settings.logo && typeof settings.logo === 'object' && 'url' in settings.logo) {
      logoUrl = (settings.logo as { url?: string }).url || undefined
      logoAlt = (settings.logo as { alt?: string }).alt || undefined
    }

    let faviconUrl: string | undefined
    if (settings.favicon && typeof settings.favicon === 'object' && 'url' in settings.favicon) {
      faviconUrl = (settings.favicon as { url?: string }).url || undefined
    }

    return {
      siteName: settings.siteName?.trim() || fallback.siteName,
      tagline: settings.tagline?.trim() || '',
      siteUrl: canonicalPublicOrigin(settings.siteUrl),
      language,
      secondaryLanguage: (settings.secondaryLanguage as string) || fallback.secondaryLanguage,
      pwaEnabled: settings.pwaEnabled !== false,
      offlinePageLimit: Number.isInteger(limit) && limit >= 1 ? limit : fallback.offlinePageLimit,
      setup: assessSiteSetup(settings),
      logoUrl,
      logoAlt,
      faviconUrl,
      timezone: (settings.timezone as string) || fallback.timezone,
      dateFormat: (settings.dateFormat as string) || fallback.dateFormat,
      timeFormat: (settings.timeFormat as string) || fallback.timeFormat,
      weekStartsOn: (settings.weekStartsOn as string) || fallback.weekStartsOn,
      postPermalinkStructure: normalizePermalinkPattern(settings.postPermalinkStructure as string),
    }
  } catch {
    return fallback
  }
}
