import type { NextRequest } from 'next/server'
import { authorize, readRecord, saveRecord, withInstallationLock } from '@/lib/installation/store'
import { databaseURL, SetupError, validateWebsite } from '@/lib/installation/validation'
import { requireFreshDatabase } from '@/lib/installation/database'
import { finishInstallation } from '@/lib/installation/install'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== request.headers.get('host') || request.headers.get('content-type') !== 'application/json') throw new SetupError('unauthorized', 403)
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
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    authorize(await readRecord(), request.headers.get('x-setup-token'))
    return await withInstallationLock(async () => {
      const record = await readRecord()
      authorize(record, request.headers.get('x-setup-token'))
      if (!record) throw new SetupError('unauthorized', 403)
      if (body.action === 'resume') return response({ phase: record.phase, website: record.website, environmentAvailable: Boolean(process.env.DATABASE_URL) })
      if (body.action === 'database') {
        if (record.phase === 'provisioning') throw new SetupError('resumeProvisioning', 409)
        const url = body.useEnvironment === true && process.env.DATABASE_URL ? process.env.DATABASE_URL : databaseURL(body.database)
        if (process.env.DATABASE_URL && process.env.DATABASE_URL !== url) throw new SetupError('configurationConflict', 409)
        await requireFreshDatabase(url)
        record.databaseUrl = url
        record.secret = process.env.PAYLOAD_SECRET || record.secret
        record.phase = 'database'
        await saveRecord(record)
        return response({ verified: true })
      }
      if (body.action === 'website') {
        if (!record.databaseUrl || record.phase === 'provisioning') throw new SetupError('validation')
        record.website = validateWebsite(body.website)
        record.phase = 'website'
        await saveRecord(record)
        return response({ saved: true })
      }
      if (body.action === 'finish') return response(await finishInstallation(record, body.admin))
      throw new SetupError('validation')
    })
  } catch (error) {
    return response({ error: error instanceof SetupError ? error.key : 'installationFailed' }, error instanceof SetupError ? error.status : 500)
  }
}
