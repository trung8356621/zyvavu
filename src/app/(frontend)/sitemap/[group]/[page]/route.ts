import { getPayload } from 'payload'

import { buildResourceSitemap, parseSitemapChunkParam } from '@/lib/seo/sitemap'
import config from '@/payload.config'

export async function GET(
  _request: Request,
  context: { params: Promise<{ group: string; page: string }> },
): Promise<Response> {
  const { group, page } = await context.params
  const parsed = parseSitemapChunkParam(group, page)
  if (!parsed) {
    return new Response('Not found', { status: 404 })
  }

  const payload = await getPayload({ config })
  const result = await buildResourceSitemap(payload, parsed.group, parsed.page)
  if (!result) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(result.xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
