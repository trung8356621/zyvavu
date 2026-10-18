import { postgresAdapter, type PostgresAdapter } from '@payloadcms/db-postgres'
import { BasePayload, createLocalReq } from 'payload'
import type { Setting } from '@/payload-types'
import { migrations } from '@/migrations'
import { connectDatabase, databaseInventory } from './database'
import { persistEnvironment, saveRecord, type InstallationRecord } from './store'
import { SetupError, validateAdmin, validateWebsite } from './validation'
import { seedStarterContent } from './starter-content'

export async function finishInstallation(record: InstallationRecord, adminInput: { email: string; password: string }) {
  const admin = validateAdmin(adminInput)
  if (!record.databaseUrl || !record.website) throw new SetupError('validation')
  record.website = validateWebsite(record.website)
  if (process.env.PAYLOAD_DROP_DATABASE === 'true') throw new SetupError('unsafeEnvironment', 409)
  const client = await connectDatabase(record.databaseUrl)
  let payload: BasePayload | undefined
  try {
    const lock = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(8313072026) AS locked')
    if (!lock.rows[0].locked) throw new SetupError('busy', 409)
    const inventory = await databaseInventory(client)
    if (inventory === 'installed') {
      if (record.phase === 'provisioning') {
        await persistEnvironment(record)
        record.phase = 'installed'
        await saveRecord(record)
        return { completed: true, restart: true }
      }
      throw new SetupError('installed', 409)
    }
    if (inventory === 'initialized') throw new SetupError('installed', 409)
    if (inventory !== 'empty') throw new SetupError('existingDatabase', 409)
    await persistEnvironment(record)
    // All schema/data changes below share one transaction: crash recovery sees empty or fully installed DB.
    record.phase = 'provisioning'
    await saveRecord(record)
    const base = await (await import('@/payload.config')).default
    payload = new BasePayload()
    await payload.init({
      config: {
        ...base,
        secret: record.secret,
        serverURL: record.website.siteUrl,
        db: {
          ...postgresAdapter({ pool: { connectionString: record.databaseUrl, connectionTimeoutMillis: 5000 }, push: false, disableCreateDatabase: true, extensions: [] }),
          allowIDOnCreate: false,
          defaultIDType: 'number',
          name: 'postgres',
        },
      },
      disableOnInit: true,
    })
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new SetupError('installationFailed', 500)
    try {
      const req = await createLocalReq({ context: { trustedRole: true }, req: { transactionID } }, payload)
      const adapter = payload.db as unknown as PostgresAdapter
      // CLI migrate() exits the process on errors. Use its checked-in up functions and native
      // migration records in the adapter transaction, allowing HTTP failures to roll back safely.
      for (const migration of migrations) {
        await migration.up({ db: adapter.sessions[transactionID].db, payload, req })
        await payload.create({ collection: 'payload-migrations', data: { name: migration.name, batch: 1 }, req })
      }
      await payload.create({ collection: 'users', data: { ...admin, role: 'system-admin' }, overrideAccess: true, req })
      await payload.updateGlobal({ slug: 'settings', data: { ...record.website, timezone: record.website.timezone as Setting['timezone'], setupComplete: true }, overrideAccess: true, req })
      await seedStarterContent(payload, req, record.website.language, true)
      await payload.db.commitTransaction(transactionID)
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    record.phase = 'installed'
    // DB completion is authoritative even if the filesystem becomes unavailable here.
    await saveRecord(record)
    return { completed: true, restart: true }
  } finally {
    try { if (payload) await payload.destroy() }
    finally { await client.end() }
  }
}
