import type { CSSProperties } from 'react'
import React from 'react'
import { getPayload } from 'payload'
import { cookies, headers } from 'next/headers'

import { RegisterServiceWorker } from '@/components/frontend/RegisterServiceWorker'
import { SiteHeader } from '@/components/frontend/SiteHeader'
import { buildRootLayoutMetadata } from '@/lib/seo'
import { loadPublicSiteSettings } from '@/lib/site/settings'
import { linksForMenu, resolveMenuHierarchy } from '@/lib/url/menu-links'
import config from '@/payload.config'
import { themeVariables } from '@/theme/cssVariables'
import { isSiteStaff } from '@/access/roles'
import {
  ThemeRenderer,
  generateThemeCss,
  resolveThemeTemplate,
  resolveActiveThemeConfig,
  resolveActiveThemeId,
  isValidThemeId,
  normalizeThemeId,
  getGoogleFontUrl,
} from '@/lib/theme-engine'
import { ThemeLivePreviewBridge } from '@/components/frontend/ThemeLivePreviewBridge'

import './styles.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const payload = await getPayload({ config })
  const settings = await loadPublicSiteSettings(payload)
  return buildRootLayoutMetadata(settings)
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const settings = await loadPublicSiteSettings(payload)

  // Verify staff status for preview override
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  let isStaff = false

  if (token) {
    try {
      const userRes = await payload.auth({ headers: new Headers({ cookie: `payload-token=${token}` }) })
      if (userRes?.user && isSiteStaff(userRes.user)) {
        isStaff = true
      }
    } catch {
      // safe ignore
    }
  }

  // Check preview theme override only if staff
  let previewTheme: string | undefined
  if (isStaff) {
    const cookiePreview = cookieStore.get('zyvavu_preview_theme')?.value
    if (cookiePreview && isValidThemeId(cookiePreview)) {
      previewTheme = normalizeThemeId(cookiePreview)
    } else {
      const headerList = await headers()
      const referer = headerList.get('referer') || ''
      try {
        const url = new URL(referer)
        const qp = url.searchParams.get('preview_theme')
        if (qp && isValidThemeId(qp)) previewTheme = normalizeThemeId(qp)
      } catch {
        // ignore
      }
    }
  }

  const activeThemeId = previewTheme || (await resolveActiveThemeId(payload))

  const menus = await payload
    .find({
      collection: 'menus',
      where: { location: { equals: 'header' } },
      depth: 2,
      limit: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  const menuDoc = menus?.docs?.[0]
  const items = await linksForMenu(payload, menuDoc?.items || [])
  const menuTree = await resolveMenuHierarchy(payload, menuDoc)

  const headerDoc = await resolveThemeTemplate(payload, 'header', activeThemeId).catch(() => null)
  const footerDoc = await resolveThemeTemplate(payload, 'footer', activeThemeId).catch(() => null)
  const activeThemeConfig = await resolveActiveThemeConfig(payload, activeThemeId).catch(() => undefined)
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
        {headerDoc ? (
          <ThemeRenderer
            document={headerDoc}
            dataContext={{
              type: 'header',
              site: {
                siteName: settings.siteName,
                tagline: settings.tagline,
                logoUrl: settings.logoUrl,
                logoAlt: settings.logoAlt,
                menuItems: items,
                menuTree,
                menuDoc,
              },
            }}
          />
        ) : (
          <SiteHeader
            items={items}
            logoAlt={settings.logoAlt}
            logoUrl={settings.logoUrl}
            siteName={settings.siteName}
            tagline={settings.tagline}
          />
        )}
        <main>{props.children}</main>
        {footerDoc && (
          <ThemeRenderer
            document={footerDoc}
            dataContext={{
              type: 'footer',
              site: {
                siteName: settings.siteName,
                tagline: settings.tagline,
                logoUrl: settings.logoUrl,
                logoAlt: settings.logoAlt,
                menuItems: items,
                menuTree,
                menuDoc,
              },
            }}
          />
        )}
      </body>
    </html>
  )
}
