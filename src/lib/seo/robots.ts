import type { Payload } from 'payload'

import { canonicalPublicOrigin } from '@/lib/site/origin'
import { loadPublicSiteSettings } from '@/lib/site/settings'

export function buildRobotsTxt(siteOrigin: string, environment: string = process.env.NODE_ENV || 'development'): string {
  const origin = canonicalPublicOrigin(siteOrigin)
  const lines = ['User-agent: *']
  if (environment === 'production') {
    lines.push('Allow: /')
  } else {
    lines.push('Disallow: /')
  }
  lines.push('', `Sitemap: ${origin}/sitemap.xml`, '')
  return lines.join('\n')
}

export async function buildRobotsTxtResponse(payload: Payload, environment?: string): Promise<string> {
  const settings = await loadPublicSiteSettings(payload)
  return buildRobotsTxt(settings.siteUrl, environment)
}
