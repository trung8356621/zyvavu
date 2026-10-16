import { getPayload } from 'payload'
import React from 'react'

import { SitemapIndexView } from '@/components/frontend/sitemap/SitemapViews'
import { loadSitemapIndexView } from '@/lib/seo/sitemap-view'
import config from '@/payload.config'

export default async function SitemapViewPage() {
  const payload = await getPayload({ config })
  const rows = await loadSitemapIndexView(payload)
  return <SitemapIndexView rows={rows} />
}
