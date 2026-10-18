export const dynamic = 'force-dynamic'

import { getInstalledPayload } from '@/lib/installation/payload'

import { buildResourceSitemap, parseSitemapChunkParam } from '@/lib/seo/sitemap'

export async function GET(
  _request: Request,
  context: { params: Promise<{ group: string; page: string }> },
): Promise<Response> {
  const { group, page } = await context.params
  const parsed = parseSitemapChunkParam(group, page)
  if (!parsed) {
    return new Response('Not found', { status: 404 })
  }

  const payload = await getInstalledPayload()
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
