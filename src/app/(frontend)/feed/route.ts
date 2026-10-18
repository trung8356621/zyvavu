import { getInstalledPayload } from '@/lib/installation/payload'

import { handleRssFeedRequest } from '@/lib/seo/feed'

export async function GET(request: Request): Promise<Response> {
  const payload = await getInstalledPayload()
  return handleRssFeedRequest(request, payload)
}

export async function HEAD(request: Request): Promise<Response> {
  const payload = await getInstalledPayload()
  return handleRssFeedRequest(request, payload)
}
