import { getPayload } from 'payload'
import config from '@payload-config'
import { resolveToolbar, TOOLBAR_HEADERS } from '@/lib/frontend-toolbar/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    const toolbar = await resolveToolbar(payload, request)
    return Response.json({ toolbar }, { headers: TOOLBAR_HEADERS })
  } catch {
    // Fail closed without exposing database errors or session details.
    return Response.json({ toolbar: null }, { status: 503, headers: TOOLBAR_HEADERS })
  }
}
