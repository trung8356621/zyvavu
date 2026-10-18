export const dynamic = 'force-dynamic'

import { getInstalledPayload } from '@/lib/installation/payload'

import { buildSitemapIndex } from '@/lib/seo/sitemap'

export async function GET(): Promise<Response> {
  const payload = await getInstalledPayload()
  const { xml } = await buildSitemapIndex(payload)
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
