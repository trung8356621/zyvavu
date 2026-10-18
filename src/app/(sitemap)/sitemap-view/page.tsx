import { getInstalledPayload } from '@/lib/installation/payload'
import React from 'react'

import { SitemapIndexView } from '@/components/frontend/sitemap/SitemapViews'
import { loadSitemapIndexView } from '@/lib/seo/sitemap-view'

export default async function SitemapViewPage() {
  const payload = await getInstalledPayload()
  const rows = await loadSitemapIndexView(payload)
  return <SitemapIndexView rows={rows} />
}
