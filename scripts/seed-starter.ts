import 'dotenv/config'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { BasePayload, createLocalReq } from 'payload'
import { seedStarterContent } from '../src/lib/installation/starter-content'
import { connectDatabase, databaseInventory } from '../src/lib/installation/database'

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Usage: pnpm seed:starter [--apply | --dry-run]')
  }
  if (process.env.PAYLOAD_DROP_DATABASE === 'true') throw new Error('Unsafe database environment')
  const client = await connectDatabase(process.env.DATABASE_URL || '')
  let payload: BasePayload | undefined
  try {
    const lock = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(8313072026) AS locked')
    if (!lock.rows[0].locked) throw new Error('Installation or starter seed is busy')
    if (await databaseInventory(client) !== 'installed') throw new Error('Starter command requires a completed installation')
    const base = await (await import('../src/payload.config')).default
    payload = new BasePayload()
    // Disable migration-on-init, schema push and application onInit even for dry runs.
    await payload.init({ config: { ...base, db: {
      ...postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL }, push: false, disableCreateDatabase: true, extensions: [] }),
      allowIDOnCreate: false, defaultIDType: 'number', name: 'postgres',
    } }, disableOnInit: true })
    const apply = args.includes('--apply')
    const transactionID = apply ? await payload.db.beginTransaction() : undefined
    if (apply && !transactionID) throw new Error('Transactions unavailable')
    try {
      const req = await createLocalReq({ req: { transactionID: transactionID ?? undefined } }, payload)
      const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
      const results = await seedStarterContent(payload, req, settings.language || 'vi', apply)
      if (transactionID) await payload.db.commitTransaction(transactionID)
      console.log(apply ? 'Starter content committed.' : 'DRY RUN: no content writes. URL collisions are checked by collection hooks only during --apply.')
      console.table(results)
    } catch (error) {
      if (transactionID) await payload.db.rollbackTransaction(transactionID)
      throw error
    }
  } finally {
    try { if (payload) await payload.destroy() } finally { await client.end() }
  }
}

main().catch(() => { console.error('Starter seed failed; no content transaction was committed. Check configuration, slug/URL conflicts and database availability.'); process.exitCode = 1 })
