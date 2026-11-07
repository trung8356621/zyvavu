import { getPayload } from 'payload'
import config from '@/payload.config'
import { isSiteStaff } from '@/access/roles'
import { listUserPatterns, saveUserPattern } from '@/lib/theme-engine/patterns/file-store'
import { validatePatternJSON, type PatternJSON } from '@/lib/theme-engine/patterns/json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authedOwner(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!isSiteStaff(user) || !user?.id) return null
  return String(user.id)
}

export async function GET(request: Request) {
  const ownerId = await authedOwner(request)
  if (!ownerId) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const search = new URL(request.url).searchParams.get('search') || ''
  const docs = await listUserPatterns(ownerId, { search })
  return Response.json({ docs, page: 1, totalPages: 1, totalDocs: docs.length })
}

export async function POST(request: Request) {
  const ownerId = await authedOwner(request)
  if (!ownerId) return Response.json({ message: 'Forbidden' }, { status: 403 })
  try {
    const body = (await request.json()) as { record?: PatternJSON; name?: string; description?: string; category?: string }
    if (!body.record) return Response.json({ message: 'Pattern record required' }, { status: 400 })
    const record: PatternJSON = {
      ...body.record,
      name: body.name ?? body.record.name,
      description: body.description ?? body.record.description,
      category: body.category ?? body.record.category,
      source: 'user',
    }
    validatePatternJSON(record)
    const doc = await saveUserPattern(ownerId, record)
    return Response.json({ doc }, { status: 201 })
  } catch (error) {
    return Response.json({ message: (error as Error).message }, { status: 400 })
  }
}
