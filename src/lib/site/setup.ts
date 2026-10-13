import { normalizeSiteUrl } from './origin'

const languagePattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

export type SetupGap = 'siteName' | 'siteUrl' | 'language' | 'confirmation'

export type SiteSetupInput = {
  siteName?: string | null
  siteUrl?: string | null
  language?: string | null
  setupComplete?: boolean | null
}

export type SiteSetupAssessment = {
  complete: boolean
  missing: SetupGap[]
}

export function isLanguageCode(value: unknown): value is string {
  return typeof value === 'string' && languagePattern.test(value.trim())
}

export function assessSiteSetup(settings: SiteSetupInput): SiteSetupAssessment {
  const missing: SetupGap[] = []
  if (typeof settings.siteName !== 'string' || !settings.siteName.trim()) missing.push('siteName')
  if (!normalizeSiteUrl(settings.siteUrl)) missing.push('siteUrl')
  if (!isLanguageCode(settings.language)) missing.push('language')
  if (settings.setupComplete !== true) missing.push('confirmation')
  return { complete: missing.length === 0, missing }
}
