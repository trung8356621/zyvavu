import type { Payload } from 'payload'

import { emptyPublicSeoSettings, normalizePublicSeoSettings, type PublicSeoSettings } from './settings'

export async function loadPublicSeoSettings(payload: Payload): Promise<PublicSeoSettings> {
  try {
    const doc = await payload.findGlobal({
      slug: 'seo-settings',
      depth: 0,
      overrideAccess: true,
    })
    return normalizePublicSeoSettings(doc)
  } catch {
    return emptyPublicSeoSettings
  }
}
