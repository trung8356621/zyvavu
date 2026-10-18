import { readRecord } from './store'
import { connectDatabase, databaseInventory } from './database'

export type InstallationStatus = 'UNCONFIGURED' | 'INCOMPLETE' | 'INSTALLED' | 'DATABASE_UNAVAILABLE'
export async function installationStatus(): Promise<InstallationStatus> {
  const record = await readRecord()
  const configured = !!(process.env.DATABASE_URL && process.env.PAYLOAD_SECRET)
  // Durable completion survives missing env files and temporary database outages.
  if (record?.phase === 'installed') {
    if (!configured) return 'DATABASE_UNAVAILABLE'
  }
  if (!configured) return record ? 'INCOMPLETE' : 'UNCONFIGURED'
  try {
    const client = await connectDatabase(process.env.DATABASE_URL!)
    try {
      const inventory = await databaseInventory(client)
      if (inventory === 'installed') return 'INSTALLED'
      return record?.phase === 'installed' ? 'DATABASE_UNAVAILABLE' : 'INCOMPLETE'
    } finally { await client.end() }
  } catch { return 'DATABASE_UNAVAILABLE' }
}
