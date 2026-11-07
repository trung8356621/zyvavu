import { getPayload } from 'payload'
import config from '@/payload.config'
import { isSiteStaff } from '@/access/roles'
import {
  deleteUserPattern,
  getUserPattern,
  renameUserPattern,
  saveUserPattern,
} from '@/lib/theme-engine/patterns/file-store'
import { validatePatternJSON, type PatternJSON } from '@/lib/theme-engine/patterns/json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authedOwner(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!isSiteStaff(user) || !user?.id) return null
  return String(user.id)
}

function isNotFound(error: unknown) {
  const code = (error as NodeJS.ErrnoException).code
  const message = (error as Error).message
  return code === 'ENOENT' || message === 'Pattern not found'
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await authedOwner(request)
  if (!ownerId) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const { id } = await params
  try {
    const doc = await getUserPattern(ownerId, id)
    return Response.json({ doc })
  } catch (error) {
    if (isNotFound(error)) return Response.json({ message: 'Not found' }, { status: 404 })
    return Response.json({ message: (error as Error).message }, { status: 400 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await authedOwner(request)
  if (!ownerId) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const { id } = await params
  try {
    const body = (await request.json()) as {
      record?: PatternJSON
      name?: string
      description?: string
      category?: string
    }
    if (body.record) {
      const record: PatternJSON = {
        ...body.record,
        id,
        name: body.name ?? body.record.name,
        description: body.description ?? body.record.description,
        category: body.category ?? body.record.category,
        source: 'user',
      }
      validatePatternJSON(record)
      const doc = await saveUserPattern(ownerId, record, { id })
      return Response.json({ doc })
    }
    const doc = await renameUserPattern(ownerId, id, {
      name: body.name,
      description: body.description,
      category: body.category,
    })
    return Response.json({ doc })
  } catch (error) {
    if (isNotFound(error)) return Response.json({ message: 'Not found' }, { status: 404 })
    return Response.json({ message: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await authedOwner(request)
  if (!ownerId) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const { id } = await params
  try {
    await deleteUserPattern(ownerId, id)
    return Response.json({ ok: true })
  } catch (error) {
    if (isNotFound(error)) return Response.json({ message: 'Not found' }, { status: 404 })
    return Response.json({ message: (error as Error).message }, { status: 400 })
  }
}
