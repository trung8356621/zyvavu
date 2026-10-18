import { randomBytes } from 'node:crypto'
import { mkdir, readFile, open, unlink } from 'node:fs/promises'
import path from 'node:path'
import { SetupError, type WebsiteInput } from './input'
import { writePrivateFile, environmentText as serializeEnvironment, environmentValues } from './files.mjs'

export type InstallationRecord = {
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
  const { phase, secret, databaseUrl, website } = record
  await writePrivateFile(path.join(directory, 'state.json'), JSON.stringify({ phase, secret, databaseUrl, website }))
}
export function assertNotInstalled(record: InstallationRecord | null) {
  if (record?.phase === 'installed') throw new SetupError('installed', 409)
}
export function newInstallationRecord(): InstallationRecord {
  return { phase: 'database', secret: randomBytes(48).toString('hex') }
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
  try { return serializeEnvironment(record) }
  catch { throw new SetupError('manualConfiguration', 409) }
}
export async function persistEnvironment(record: InstallationRecord) {
  const values = environmentValues(record)
  if (Object.entries(values).every(([key, value]) => process.env[key] === value)) return
  const target = path.join(process.cwd(), '.env.local')
  try { await writePrivateFile(target, environmentText(record), true) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST' && await readFile(target, 'utf8') === environmentText(record)) return
    await mkdir(stateDirectory(), { recursive: true, mode: 0o700 })
    await writePrivateFile(path.join(stateDirectory(), 'hosting.json'), JSON.stringify(values, null, 2))
    throw new SetupError('manualConfiguration', 409)
  }
}
