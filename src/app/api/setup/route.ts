import type { NextRequest } from 'next/server'
import { assertNotInstalled, newInstallationRecord, readRecord, saveRecord, withInstallationLock } from '@/lib/installation/store'
import { databaseURL, SetupError, validateWebsite } from '@/lib/installation/validation'
import { requireFreshDatabase } from '@/lib/installation/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== request.headers.get('host') || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new SetupError('unauthorized', 403)
    assertNotInstalled(await readRecord())
    // Reject oversized/chunked payloads before JSON parsing without trusting Content-Length.
    const reader = request.body?.getReader()
    if (!reader) throw new SetupError('validation')
    let length = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 16384) { await reader.cancel(); throw new SetupError('validation', 413) }
      chunks.push(value)
    }
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new SetupError('validation') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SetupError('validation')
    return await withInstallationLock(async () => {
      const record = await readRecord()
      assertNotInstalled(record)
      const configuredUrl = process.env.DATABASE_URL
      if (body.action === 'database') {
        const url = body.useEnvironment === true && configuredUrl ? configuredUrl : databaseURL(body.database)
        // Once a database is verified, this installation stays bound to it across requests/refreshes.
        if ((configuredUrl && configuredUrl !== url) || (record?.databaseUrl && record.databaseUrl !== url)) throw new SetupError('configurationConflict', 409)
        await requireFreshDatabase(url)
        const next = record || newInstallationRecord()
        next.databaseUrl = url
        const existingSecret = process.env.PAYLOAD_SECRET?.trim()
        if (existingSecret && existingSecret !== 'CHANGE_ME') next.secret = process.env.PAYLOAD_SECRET!
        next.phase = 'database'
        await saveRecord(next)
        return response({ verified: true, website: next.website ? validateWebsite(next.website) : undefined })
      }
      if (!record?.databaseUrl) throw new SetupError('validation')
      if (configuredUrl && configuredUrl !== record.databaseUrl) throw new SetupError('configurationConflict', 409)
      // Recheck the actual database before every privileged continuation, not just the first screen.
      await requireFreshDatabase(record.databaseUrl)
      if (body.action === 'website') {
        record.website = validateWebsite(body.website)
        record.phase = 'website'
        await saveRecord(record)
        return response({ saved: true })
      }
      if (body.action === 'finish') {
        const { finishInstallation } = await import('@/lib/installation/install')
        return response(await finishInstallation(record, body.admin))
      }
      throw new SetupError('validation')
    })
  } catch (error) {
    return response({ error: error instanceof SetupError ? error.key : 'installationFailed' }, error instanceof SetupError ? error.status : 500)
  }
}
