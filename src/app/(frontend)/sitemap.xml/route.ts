import { getPayload } from 'payload'

import { buildSitemapIndex } from '@/lib/seo/sitemap'
import config from '@/payload.config'

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const { xml } = await buildSitemapIndex(payload)
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
