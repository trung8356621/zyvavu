import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import { loadPublicSiteSettings } from '@/lib/site/settings'
import config from '@/payload.config'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const payload = await getPayload({ config })
  const settings = await loadPublicSiteSettings(payload)
  return {
    name: settings.siteName,
    short_name: settings.siteName,
    description: settings.tagline || settings.siteName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f1419',
    theme_color: '#0f1419',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
