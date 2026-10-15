import type { CSSProperties } from 'react'
import React from 'react'
import { getPayload } from 'payload'

import { RegisterServiceWorker } from '@/components/frontend/RegisterServiceWorker'
import { SiteHeader } from '@/components/frontend/SiteHeader'
import { loadPublicSiteSettings } from '@/lib/site/settings'
import { linksForMenu } from '@/lib/url/menu-links'
import config from '@/payload.config'
import { themeVariables } from '@/theme/cssVariables'
import {
  ThemeRenderer,
  generateThemeCss,
  resolveThemeTemplate,
  resolveActiveThemeConfig,
  getGoogleFontUrl,
} from '@/lib/theme-engine'
import { ThemeLivePreviewBridge } from '@/components/frontend/ThemeLivePreviewBridge'

import './styles.css'

export async function generateMetadata() {
  const payload = await getPayload({ config })
  const settings = await loadPublicSiteSettings(payload)
  return {
    description: settings.tagline || settings.siteName,
    title: settings.siteName,
    metadataBase: new URL(settings.siteUrl),
    manifest: settings.pwaEnabled ? '/manifest.webmanifest' : undefined,
    icons: {
      icon: settings.faviconUrl || '/icon.png',
    },
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

  const footerDoc = await resolveThemeTemplate(payload, 'footer').catch(() => null)
  const activeThemeConfig = await resolveActiveThemeConfig(payload).catch(() => undefined)
  const fontFamilies = [
    activeThemeConfig?.tokens?.typography?.fontFamily,
    activeThemeConfig?.tokens?.typography?.fontFamilyHeading,
  ]
  const fontUrl = getGoogleFontUrl(fontFamilies)

  return (
    <html lang={settings.language}>
      <head>
        {fontUrl && <link id="zyvavu-theme-font-link" rel="stylesheet" href={fontUrl} />}
        <style
          id="zyvavu-theme-styles"
          dangerouslySetInnerHTML={{ __html: generateThemeCss(activeThemeConfig) }}
        />
      </head>
      <body style={themeVariables('public') as CSSProperties}>
        <ThemeLivePreviewBridge />
        <RegisterServiceWorker enabled={settings.pwaEnabled} />
        <SiteHeader
          items={items}
          logoAlt={settings.logoAlt}
          logoUrl={settings.logoUrl}
          siteName={settings.siteName}
          tagline={settings.tagline}
        />
        <main>{props.children}</main>
        {footerDoc && (
          <ThemeRenderer
            document={footerDoc}
            dataContext={{
              type: 'footer',
              site: {
                siteName: settings.siteName,
                tagline: settings.tagline,
              },
            }}
          />
        )}
      </body>
    </html>
  )
}
