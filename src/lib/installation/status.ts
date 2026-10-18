import { createHash } from 'node:crypto'
import { hasPersistedConfiguration, persistEnvironment, readRecord, saveRecord, withInstallationLock } from './store'
let verification: { key: string; expires: number; result: Promise<InstallationStatus> } | undefined
export type InstallationStatus = 'UNCONFIGURED' | 'CONFIGURING' | 'CONFIGURED_NOT_INSTALLED' | 'INSTALLED' | 'DATABASE_UNAVAILABLE'
export function hasUsableConfiguration(): boolean {
  const secret = process.env.PAYLOAD_SECRET?.trim()
  if (!secret || secret === 'CHANGE_ME') return false
  try {
    const url = new URL(process.env.DATABASE_URL || '')
    return ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname && url.pathname.length > 1)
  } catch { return false }
}
export async function installationStatus(): Promise<InstallationStatus> {
  const configured = hasUsableConfiguration()
  let record
  try { record = await readRecord() }
  catch { if (!configured) return 'DATABASE_UNAVAILABLE' }
  // Durable completion survives missing env files and temporary database outages.
  if (record?.phase === 'installed' || record?.phase === 'provisioning') {
    if (!configured) return 'DATABASE_UNAVAILABLE'
  }
  if (!configured) {
    try { if (await hasPersistedConfiguration()) return 'DATABASE_UNAVAILABLE' }
    catch { return 'DATABASE_UNAVAILABLE' }
    return record ? 'CONFIGURING' : 'UNCONFIGURED'
  }
  const key = createHash('sha256').update(JSON.stringify([process.env.DATABASE_URL, process.env.PAYLOAD_SECRET, process.env.NEXT_PUBLIC_SERVER_URL, record])).digest('hex')
  const { connectDatabase, databaseInventory, databaseReachable } = await import('./database')
  if (verification?.key === key && verification.expires > Date.now()) {
    const status = await verification.result
    return status === 'INSTALLED' && !(await databaseReachable(process.env.DATABASE_URL!)) ? 'DATABASE_UNAVAILABLE' : status
  }
  const result = (async (): Promise<InstallationStatus> => {
  try {
    const client = await connectDatabase(process.env.DATABASE_URL!)
    try {
      const inventory = await databaseInventory(client)
      if (inventory === 'installed') {
        // A committed transaction may outlive the worker that was persisting its completion marker.
        if (record && ['provisioning', 'installed'].includes(record.phase) && record.databaseUrl === process.env.DATABASE_URL && record.secret === process.env.PAYLOAD_SECRET) {
          try {
            await withInstallationLock(async () => {
              const current = await readRecord()
              if (current && ['provisioning', 'installed'].includes(current.phase) && current.databaseUrl === record.databaseUrl && current.secret === record.secret) {
                await persistEnvironment(current)
                if (current.phase !== 'installed') await saveRecord({ ...current, phase: 'installed' })
              }
            })
          } catch { console.warn('[setup] Completion marker recovery unavailable; database remains installed.') }
        }
        return 'INSTALLED'
      }
      return record?.phase === 'installed' ? 'DATABASE_UNAVAILABLE' : 'CONFIGURED_NOT_INSTALLED'
    } finally { await client.end() }
  } catch { return 'DATABASE_UNAVAILABLE' }
  })()
  const entry = { key, expires: Date.now() + 30000, result }
  verification = entry
  const status = await result
  // Never cache incomplete/error results as installed. Config/state changes also invalidate the key.
  if (status !== 'INSTALLED' && verification === entry) verification = undefined
  return status
}
