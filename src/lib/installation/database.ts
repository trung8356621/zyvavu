import pg from 'pg'
import { databaseError, SetupError } from './validation'

let healthPool: { url: string; pool: pg.Pool } | undefined
let healthCheck: { url: string; expires: number; result: Promise<boolean> } | undefined
// Reuse connections and coalesce proxy/layout/API probes for one second. No inventory queries here.
export function databaseReachable(url: string): Promise<boolean> {
  if (healthCheck?.url === url && healthCheck.expires > Date.now()) return healthCheck.result
  if (healthPool?.url !== url) {
    void healthPool?.pool.end().catch(() => {})
    healthPool = { url, pool: new pg.Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 5000 }) }
    healthPool.pool.on('error', () => { healthCheck = undefined })
  }
  const result = healthPool.pool.query('SELECT 1').then(() => true, () => false)
  const entry = { url, expires: Infinity, result }
  healthCheck = entry
  void result.then(() => { if (healthCheck === entry) entry.expires = Date.now() + 1000 })
  return result
}

// Node-only driver, shared with Payload. No module-resolution tricks in the proxy bundle.
export async function connectDatabase(connectionString: string) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 8000, statement_timeout: 8000 })
  client.on('error', () => { /* Query/connect errors are mapped to safe translation keys. */ })
  try { await client.connect(); return client }
  catch (error) { await client.end().catch(() => {}); throw databaseError(error) }
}
export async function databaseInventory(client: InstanceType<typeof pg.Client>) {
  const result = await client.query<{ name: string; schema: string }>(`SELECT tablename AS name, schemaname AS schema FROM pg_tables WHERE schemaname !~ '^pg_' AND schemaname <> 'information_schema'`)
  if (result.rows.some(table => table.name === 'users' && table.schema === 'public')) {
    const users = await client.query<{ has_users: boolean; has_admin: boolean }>(`SELECT
      EXISTS (SELECT 1 FROM public.users) AS has_users,
      EXISTS (SELECT 1 FROM public.users u WHERE to_jsonb(u)->>'role' = 'system-admin') AS has_admin`)
    if (users.rows[0].has_users) {
      if (users.rows[0].has_admin && result.rows.some(table => table.name === 'settings' && table.schema === 'public')) {
        const completion = await client.query(`SELECT 1 FROM public.settings s WHERE to_jsonb(s)->>'setup_complete' = 'true' LIMIT 1`)
        if (completion.rowCount) return 'installed' as const
      }
      return 'initialized' as const
    }
  }
  // An arbitrary populated schema must never be claimed, even if there are no users.
  return result.rows.length ? 'existing' as const : 'empty' as const
}
export async function requireFreshDatabase(connectionString: string) {
  const client = await connectDatabase(connectionString)
  try {
    const inventory = await databaseInventory(client)
    if (inventory !== 'empty') throw new SetupError(inventory === 'installed' || inventory === 'initialized' ? 'installed' : 'existingDatabase', 409)
  } catch (error) { throw error instanceof SetupError ? error : databaseError(error) }
  finally { await client.end() }
}
