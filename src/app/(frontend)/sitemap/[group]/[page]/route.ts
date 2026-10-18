export const dynamic = 'force-dynamic'

import { getInstalledPayload } from '@/lib/installation/payload'

import { buildResourceSitemap, parseSitemapChunkParam } from '@/lib/seo/sitemap'
import React from 'react'
import { SitemapChunkView } from '@/components/frontend/sitemap/SitemapViews'
import { loadSitemapChunkView } from '@/lib/seo/sitemap-view'
import { sitemapHeaders, sitemapHtmlResponse, wantsSitemapHtml } from '@/lib/seo/sitemap-response'

export async function GET(
  request: Request,
  context: { params: Promise<{ group: string; page: string }> },
): Promise<Response> {
  const { group, page } = await context.params
  const parsed = parseSitemapChunkParam(group, page)
  if (!parsed) {
    return new Response(null, { status: 404, headers: sitemapHeaders() })
  }

  const payload = await getInstalledPayload()
  if (wantsSitemapHtml(request)) {
    const view = await loadSitemapChunkView(payload, parsed.group, parsed.page)
    if (!view) return new Response(null, { status: 404, headers: sitemapHeaders() })
    return sitemapHtmlResponse(React.createElement(SitemapChunkView, { view, xmlNavigation: true }))
  }
  const result = await buildResourceSitemap(payload, parsed.group, parsed.page)
  if (!result) {
    return new Response(null, { status: 404, headers: sitemapHeaders() })
  }

  return new Response(result.xml, {
    headers: sitemapHeaders(),
  })
}

export async function HEAD(request: Request, context: { params: Promise<{ group: string; page: string }> }): Promise<Response> {
  const response = await GET(new Request(request, { method: 'HEAD' }), context)
  return new Response(null, { status: response.status, headers: response.headers })
}
