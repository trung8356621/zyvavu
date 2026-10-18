export const dynamic = 'force-dynamic'

import { getInstalledPayload } from '@/lib/installation/payload'

import { buildSitemapIndex } from '@/lib/seo/sitemap'
import React from 'react'
import { SitemapIndexView } from '@/components/frontend/sitemap/SitemapViews'
import { loadSitemapIndexView } from '@/lib/seo/sitemap-view'
import { sitemapHeaders, sitemapHtmlResponse, wantsSitemapHtml } from '@/lib/seo/sitemap-response'

export async function GET(request: Request): Promise<Response> {
  const payload = await getInstalledPayload()
  if (wantsSitemapHtml(request)) {
    const rows = await loadSitemapIndexView(payload)
    return sitemapHtmlResponse(React.createElement(SitemapIndexView, { rows, xmlNavigation: true }))
  }
  const { xml } = await buildSitemapIndex(payload)
  return new Response(xml, {
    headers: sitemapHeaders(),
  })
}

export async function HEAD(request: Request): Promise<Response> {
  const response = await GET(new Request(request, { method: 'HEAD' }))
  return new Response(null, { status: response.status, headers: response.headers })
}
