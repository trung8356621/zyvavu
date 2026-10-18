export const dynamic = 'force-dynamic'

import { getInstalledPayload } from '@/lib/installation/payload'

import { buildRobotsTxtResponse } from '@/lib/seo/robots'

export async function GET(): Promise<Response> {
  const payload = await getInstalledPayload()
  const body = await buildRobotsTxtResponse(payload)
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
