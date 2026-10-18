import { readRecord } from './store'
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
  let record
  try { record = await readRecord() } catch { return 'DATABASE_UNAVAILABLE' }
  const configured = hasUsableConfiguration()
  // Durable completion survives missing env files and temporary database outages.
  if (record?.phase === 'installed' || record?.phase === 'provisioning') {
    if (!configured) return 'DATABASE_UNAVAILABLE'
  }
  if (!configured) return record ? 'CONFIGURING' : 'UNCONFIGURED'
  try {
    // The initial installer must not even load the database driver or Payload.
    const { connectDatabase, databaseInventory } = await import('./database')
    const client = await connectDatabase(process.env.DATABASE_URL!)
    try {
      const inventory = await databaseInventory(client)
      if (inventory === 'installed') return 'INSTALLED'
      return record?.phase === 'installed' ? 'DATABASE_UNAVAILABLE' : 'CONFIGURED_NOT_INSTALLED'
    } finally { await client.end() }
  } catch { return record && record.phase !== 'installed' && record.phase !== 'provisioning' ? 'CONFIGURED_NOT_INSTALLED' : 'DATABASE_UNAVAILABLE' }
}
