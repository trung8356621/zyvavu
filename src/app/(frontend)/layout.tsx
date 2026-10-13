import React from 'react'
import { getPayload } from 'payload'

import { RegisterServiceWorker } from '@/components/frontend/RegisterServiceWorker'
import { SiteHeader } from '@/components/frontend/SiteHeader'
import { loadPublicSiteSettings } from '@/lib/site/settings'
import { linksForMenu } from '@/lib/url/menu-links'
import config from '@/payload.config'

import './styles.css'

export async function generateMetadata() {
  const payload = await getPayload({ config })
  const settings = await loadPublicSiteSettings(payload)
  return {
    description: settings.tagline || settings.siteName,
    title: settings.siteName,
    metadataBase: new URL(settings.siteUrl),
    manifest: settings.pwaEnabled ? '/manifest.webmanifest' : undefined,
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const settings = await loadPublicSiteSettings(payload)
  const menus = await payload
    .find({
      collection: 'menus',
      where: { location: { equals: 'header' } },
      depth: 2,
      limit: 1,
      overrideAccess: true,
    })
    .catch(() => null)
  const items = await linksForMenu(payload, menus?.docs?.[0]?.items || [])

  return (
    <html lang={settings.language}>
      <body>
        <RegisterServiceWorker enabled={settings.pwaEnabled} />
        <SiteHeader siteName={settings.siteName} tagline={settings.tagline} items={items} />
        <main>{props.children}</main>
      </body>
    </html>
  )
}
