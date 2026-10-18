import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises'
import path from 'node:path'
import type { WebsiteInput } from './validation'
import { SetupError } from './validation'

export type InstallationRecord = {
  tokenHash: string
  phase: 'started' | 'database' | 'website' | 'provisioning' | 'installed'
  secret: string
  databaseUrl?: string
  website?: WebsiteInput
}
export const stateDirectory = () => path.resolve(process.env.SETUP_STATE_DIR || path.join(process.cwd(), '.setup'))
export async function readRecord(): Promise<InstallationRecord | null> {
  try { return JSON.parse(await readFile(path.join(stateDirectory(), 'state.json'), 'utf8')) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
export async function saveRecord(record: InstallationRecord) {
  const directory = stateDirectory()
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const temporary = path.join(directory, `${randomBytes(12).toString('hex')}.tmp`)
  await writeFile(temporary, JSON.stringify(record), { mode: 0o600, flag: 'wx' })
  await rename(temporary, path.join(directory, 'state.json'))
}
export function authorize(record: InstallationRecord | null, token: string | null) {
  if (!record || !token || token.length > 256) throw new SetupError('unauthorized', 403)
  const actual = createHash('sha256').update(token).digest()
  const expected = Buffer.from(record.tokenHash, 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) throw new SetupError('unauthorized', 403)
  if (record.phase === 'installed') throw new SetupError('installed', 409)
}
// Exclusive lock across Node workers. A crashed worker requires explicit operator recovery.
export async function withInstallationLock<T>(work: () => Promise<T>): Promise<T> {
  await mkdir(stateDirectory(), { recursive: true, mode: 0o700 })
  const file = path.join(stateDirectory(), 'lock')
  let handle
  try { handle = await open(file, 'wx', 0o600) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new SetupError('busy', 409); throw error }
  try { return await work() }
  finally { await handle.close(); await unlink(file) }
}
export function environmentText(record: InstallationRecord) {
  if (!record.databaseUrl || !record.website) throw new SetupError('validation')
  // URL encoding prevents quotes/newlines in credentials from escaping dotenv values.
  return `DATABASE_URL=${record.databaseUrl}\nPAYLOAD_SECRET=${record.secret}\nNEXT_PUBLIC_SERVER_URL=${record.website.siteUrl}\n`
}
export async function persistEnvironment(record: InstallationRecord) {
  const values = { DATABASE_URL: record.databaseUrl, PAYLOAD_SECRET: record.secret, NEXT_PUBLIC_SERVER_URL: record.website?.siteUrl }
  if (Object.entries(values).every(([key, value]) => process.env[key] === value)) return
  const target = path.join(process.cwd(), '.env.local')
  const contents = environmentText(record)
  try { await writeFile(target, contents, { flag: 'wx', mode: 0o600 }) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST' && await readFile(target, 'utf8') === contents) return
    throw new SetupError('manualConfiguration', 409)
  }
}
