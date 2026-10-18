import { notFound } from 'next/navigation'
import { getInstalledPayload } from '@/lib/installation/payload'
import React from 'react'

import { SitemapChunkView } from '@/components/frontend/sitemap/SitemapViews'
import { loadSitemapChunkView } from '@/lib/seo/sitemap-view'

export default async function SitemapGroupViewPage({
  params,
}: {
  params: Promise<{ group: string; page: string }>
}) {
  const { group, page } = await params
  const pageNumber = Number(page)
  if (!Number.isInteger(pageNumber) || pageNumber < 1) notFound()

  const payload = await getInstalledPayload()
  const view = await loadSitemapChunkView(payload, group, pageNumber)
  if (!view) notFound()
  return <SitemapChunkView view={view} />
}
