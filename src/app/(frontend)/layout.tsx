import React from 'react'
import { getPayload } from 'payload'

import { RegisterServiceWorker } from '@/components/frontend/RegisterServiceWorker'
import { SiteHeader } from '@/components/frontend/SiteHeader'
import config from '@/payload.config'

import './styles.css'

export const metadata = {
  description: 'zyvavu CMS',
  title: 'zyvavu',
  manifest: '/manifest.webmanifest',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true }).catch(() => null)
  const menus = await payload
    .find({
      collection: 'menus',
      where: { location: { equals: 'header' } },
      depth: 2,
      limit: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  return (
    <html lang={settings?.language || 'vi'}>
      <body>
        <RegisterServiceWorker />
        <SiteHeader siteName={settings?.siteName || 'zyvavu'} items={menus?.docs?.[0]?.items || []} />
        <main>{props.children}</main>
      </body>
    </html>
  )
}
