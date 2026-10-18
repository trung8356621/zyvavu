import { config as loadEnvironment } from 'dotenv'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { BasePayload, createLocalReq } from 'payload'
import { seedStarterContent } from '../src/lib/installation/starter-content'
import { databaseInventory } from '../src/lib/installation/database'

let stage = 'environment'
const root = new URL('../', import.meta.url)
// Setup V3 persists .env.local. Shell values retain precedence; .env is fallback only.
loadEnvironment({ path: fileURLToPath(new URL('.env.local', root)) })
loadEnvironment({ path: fileURLToPath(new URL('.env', root)) })

const diagnosticHints: Record<string, string> = {
  ECONNREFUSED: 'PostgreSQL is not accepting connections at the configured host/port.',
  ENOTFOUND: 'The configured database hostname cannot be resolved.',
  EACCES: 'The environment blocked database network access; allow this dry-run connection outside the sandbox.',
  '28P01': 'PostgreSQL rejected the configured credentials.',
  '28000': 'PostgreSQL authentication is not permitted for this connection.',
  '3D000': 'The configured database does not exist.',
  '42501': 'The configured database role lacks permission for this operation.',
  '42P01': 'A required table is missing; confirm this is the installed database.',
}

function safeDiagnostic(error: unknown): string {
  const codes: string[] = []
  const seen = new Set<unknown>()
  let current = error
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const { code, cause } = current as { code?: unknown; cause?: unknown }
    if (typeof code === 'string' && /^[A-Z0-9_]{2,40}$/.test(code)) codes.push(code)
    current = cause
  }
  const known = codes.find(code => diagnosticHints[code])
  // Never print arbitrary driver messages, SQL, config objects, stacks or connection URLs.
  return `${codes.length ? ` [${codes.join(', ')}]` : ''} ${known ? diagnosticHints[known] : 'Check the configuration and permissions for the reported stage.'}`
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Usage: pnpm seed:starter [--apply | --dry-run]')
  }
  if (process.env.PAYLOAD_DROP_DATABASE === 'true') throw new Error('Unsafe database environment')
  const configured = { DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()), PAYLOAD_SECRET: Boolean(process.env.PAYLOAD_SECRET?.trim() && process.env.PAYLOAD_SECRET !== 'CHANGE_ME') }
  console.log('Environment (.env.local, then .env; shell takes precedence):', configured)
  if (!configured.DATABASE_URL || !configured.PAYLOAD_SECRET) {
    stage = 'environment: missing DATABASE_URL or usable PAYLOAD_SECRET; check the Setup V3 .env.local in the project root'
    throw new Error('Missing configuration')
  }
  stage = 'database connectivity'
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, query_timeout: 8000, statement_timeout: 8000 })
  client.on('error', () => {})
  let payload: BasePayload | undefined
  try {
    await client.connect()
    console.log('Database connectivity: OK')
    stage = 'installation advisory lock (another setup/seed may be running)'
    const lock = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(8313072026) AS locked')
    if (!lock.rows[0].locked) throw new Error('Installation or starter seed is busy')
    stage = 'installation status and database read permissions'
    const inventory = await databaseInventory(client)
    console.log('Installation status:', inventory)
    if (inventory !== 'installed') throw new Error('Starter command requires a completed installation')
    stage = 'Payload configuration import'
    const base = await (await import('../src/payload.config')).default
    payload = new BasePayload()
    stage = 'Payload initialization'
    // Disable migration-on-init, schema push and application onInit even for dry runs.
    await payload.init({ config: { ...base, db: {
      ...postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL }, push: false, disableCreateDatabase: true, extensions: [] }),
      allowIDOnCreate: false, defaultIDType: 'number', name: 'postgres',
    } }, disableOnInit: true })
    console.log('Payload initialization: OK (schema push, migrations and onInit disabled)')
    const apply = args.includes('--apply')
    const transactionID = apply ? await payload.db.beginTransaction() : undefined
    if (apply && !transactionID) throw new Error('Transactions unavailable')
    try {
      const req = await createLocalReq({ req: { transactionID: transactionID ?? undefined } }, payload)
      stage = 'Site Settings read'
      const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
      stage = 'starter collection reads (and writes only when --apply is explicit)'
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

// CLI owns its lifetime. Exit only after main's awaited Payload/client cleanup completes;
// imported application libraries may retain background handles beyond that cleanup.
main().then(() => process.exit(0), error => {
  console.error(`Starter seed failed at ${stage}.${safeDiagnostic(error)}`)
  process.exit(1)
})
