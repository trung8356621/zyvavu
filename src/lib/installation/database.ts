import { createRequire } from 'node:module'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { databaseError, SetupError } from './validation'

// Reuse the exact pg driver already shipped with the Payload PostgreSQL adapter.
const require = createRequire(import.meta.url)
const pg = createRequire(require.resolve('@payloadcms/db-postgres'))('pg') as PostgresAdapter['pg']
export async function connectDatabase(connectionString: string) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 8000, statement_timeout: 8000 })
  client.on('error', () => { /* Query/connect errors are mapped to safe translation keys. */ })
  try { await client.connect(); return client }
  catch (error) { await client.end().catch(() => {}); throw databaseError(error) }
}
export async function databaseInventory(client: InstanceType<typeof pg.Client>) {
  const result = await client.query<{ name: string; schema: string }>(`SELECT tablename AS name, schemaname AS schema FROM pg_tables WHERE schemaname !~ '^pg_' AND schemaname <> 'information_schema'`)
  if (result.rows.some(table => table.name === 'users' && table.schema === 'public')) {
    const users = await client.query('SELECT 1 FROM public.users LIMIT 1')
    if (users.rowCount) return 'installed' as const
  }
  // An arbitrary populated schema must never be claimed, even if there are no users.
  return result.rows.length ? 'existing' as const : 'empty' as const
}
export async function requireFreshDatabase(connectionString: string) {
  const client = await connectDatabase(connectionString)
  try {
    const inventory = await databaseInventory(client)
    if (inventory !== 'empty') throw new SetupError(inventory === 'installed' ? 'installed' : 'existingDatabase', 409)
  } finally { await client.end() }
}
