import { getPayload } from 'payload'

import { buildRobotsTxtResponse } from '@/lib/seo/robots'
import config from '@/payload.config'

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const body = await buildRobotsTxtResponse(payload)
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
