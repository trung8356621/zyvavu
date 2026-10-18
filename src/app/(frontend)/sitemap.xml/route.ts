export const dynamic = 'force-dynamic'

import { getInstalledPayload } from '@/lib/installation/payload'

import { buildSitemapIndex } from '@/lib/seo/sitemap'
import { sitemapHeaders } from '@/lib/seo/sitemap-response'

export async function GET(_request: Request): Promise<Response> {
  const payload = await getInstalledPayload()
  const { xml } = await buildSitemapIndex(payload)
  return new Response(xml, {
    headers: sitemapHeaders(),
  })
}

export async function HEAD(request: Request): Promise<Response> {
  const response = await GET(new Request(request, { method: 'HEAD' }))
  return new Response(null, { status: response.status, headers: response.headers })
}
