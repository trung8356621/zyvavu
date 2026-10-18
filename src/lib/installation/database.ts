import pg from 'pg'
import { databaseError, SetupError } from './validation'

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
