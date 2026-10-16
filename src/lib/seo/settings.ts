export const HOME_TITLE_MAX = 180
export const HOME_DESCRIPTION_MAX = 320
export const PUBLISHER_NAME_MAX = 180
export const SAME_AS_MAX = 10

export type PublisherType = 'Organization' | 'Person'

export type PublicSeoSettings = {
  homeTitle: string
  homeDescription: string
  publisherType: PublisherType
  publisherName: string
  sameAs: string[]
}

export const emptyPublicSeoSettings: PublicSeoSettings = {
  homeTitle: '',
  homeDescription: '',
  publisherType: 'Organization',
  publisherName: '',
  sameAs: [],
}

export function validatePublicHttpUrl(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) return 'Enter an absolute http or https URL.'
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return 'Enter an absolute http or https URL.'
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Enter an absolute http or https URL.'
  if (url.username || url.password) return 'Remove credentials from the URL.'
  return true
}

function boundedText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function normalizeSameAs(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const urls: string[] = []
  for (const row of value) {
    const raw =
      typeof row === 'string'
        ? row
        : row && typeof row === 'object' && 'url' in row
          ? (row as { url?: unknown }).url
          : undefined
    if (typeof raw !== 'string' || validatePublicHttpUrl(raw) !== true) continue
    const url = raw.trim()
    if (!urls.includes(url)) urls.push(url)
    if (urls.length >= SAME_AS_MAX) break
  }
  return urls
}

export function normalizePublisherType(value: unknown): PublisherType {
  return value === 'Person' ? 'Person' : 'Organization'
}

export function normalizePublicSeoSettings(raw: unknown): PublicSeoSettings {
  const doc = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    homeTitle: boundedText(doc.homeTitle, HOME_TITLE_MAX),
    homeDescription: boundedText(doc.homeDescription, HOME_DESCRIPTION_MAX),
    publisherType: normalizePublisherType(doc.publisherType),
    publisherName: boundedText(doc.publisherName, PUBLISHER_NAME_MAX),
    sameAs: normalizeSameAs(doc.sameAs),
  }
}

export function validateSeoSettingsInput(input: PublicSeoSettings): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.homeTitle.length > HOME_TITLE_MAX) errors.homeTitle = `Use at most ${HOME_TITLE_MAX} characters.`
  if (input.homeDescription.length > HOME_DESCRIPTION_MAX) {
    errors.homeDescription = `Use at most ${HOME_DESCRIPTION_MAX} characters.`
  }
  if (input.publisherName.length > PUBLISHER_NAME_MAX) {
    errors.publisherName = `Use at most ${PUBLISHER_NAME_MAX} characters.`
  }
  if (input.publisherType !== 'Organization' && input.publisherType !== 'Person') {
    errors.publisherType = 'Choose Organization or Person.'
  }
  if (input.sameAs.length > SAME_AS_MAX) errors.sameAs = `Add at most ${SAME_AS_MAX} profile URLs.`
  input.sameAs.forEach((url, index) => {
    const result = validatePublicHttpUrl(url)
    if (result !== true) errors[`sameAs.${index}`] = result
  })
  return errors
}

export function resolveHomeCopy(
  site: { homeTitle?: string | null; homeDescription?: string | null },
  fallback: { title: string; description: string; documentTitle: string },
): {
  title: string
  description: string
  documentTitle: string
  homeFallbackTitle: string
  homeFallbackDescription: string
} {
  const titleOverride = typeof site.homeTitle === 'string' ? site.homeTitle.trim() : ''
  const descriptionOverride = typeof site.homeDescription === 'string' ? site.homeDescription.trim() : ''
  return {
    title: titleOverride || fallback.title,
    description: descriptionOverride || fallback.description,
    documentTitle: titleOverride || fallback.documentTitle,
    homeFallbackTitle: fallback.title,
    homeFallbackDescription: fallback.description,
  }
}

export function publisherDisplayName(site: { siteName: string; publisherName?: string | null }): string {
  const name = typeof site.publisherName === 'string' ? site.publisherName.trim() : ''
  return name || site.siteName
}
