import { getPayload } from 'payload'

import { handleRssFeedRequest } from '@/lib/seo/feed'
import config from '@/payload.config'

export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  return handleRssFeedRequest(request, payload)
}

export async function HEAD(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  return handleRssFeedRequest(request, payload)
}
