// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => {
  const payload = { init: vi.fn(), db: { beginTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(), sessions: { tx: { db: {} } } }, create: vi.fn(), updateGlobal: vi.fn(), destroy: vi.fn() }
  return { payload, query: vi.fn(), end: vi.fn(), inventory: vi.fn(), persist: vi.fn(), save: vi.fn(), up: vi.fn() }
})
vi.mock('payload', () => ({ BasePayload: class { constructor() { return mocks.payload } }, createLocalReq: vi.fn(async (options) => options.req) }))
vi.mock('@payloadcms/db-postgres', () => ({ postgresAdapter: vi.fn(() => ({})) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('@/migrations', () => ({ migrations: [{ name: 'project-migration', up: mocks.up }] }))
vi.mock('@/lib/installation/database', () => ({ connectDatabase: vi.fn(async () => ({ query: mocks.query, end: mocks.end })), databaseInventory: mocks.inventory }))
vi.mock('@/lib/installation/store', () => ({ persistEnvironment: mocks.persist, saveRecord: mocks.save }))
import { finishInstallation } from '@/lib/installation/install'
import type { InstallationRecord } from '@/lib/installation/store'
const makeRecord = (): InstallationRecord => ({ phase: 'website', secret: 'private', databaseUrl: 'private', website: { siteName: 'Demo', siteUrl: 'https://example.com', language: 'vi', timezone: 'UTC', activeThemeId: 'corporate' } })
const admin = { email: 'owner@example.com', password: 'long-private-password' }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('PAYLOAD_DROP_DATABASE', '')
  mocks.inventory.mockResolvedValue('empty')
  mocks.query.mockResolvedValue({ rows: [{ locked: true }] })
  mocks.payload.db.beginTransaction.mockResolvedValue('tx')
})
afterEach(() => vi.unstubAllEnvs())
it('commits migrations, native migration records, first privileged user, and settings together', async () => {
  const record = makeRecord()
  expect(await finishInstallation(record, admin)).toEqual({ completed: true, restart: true })
  expect(mocks.up).toHaveBeenCalledWith(expect.objectContaining({ db: mocks.payload.db.sessions.tx.db, req: { transactionID: 'tx' } }))
  expect(mocks.payload.create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'payload-migrations', req: { transactionID: 'tx' } }))
  expect(mocks.payload.create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'users', data: { ...admin, role: 'system-admin' }, req: { transactionID: 'tx' } }))
  expect(mocks.payload.updateGlobal).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ setupComplete: true }), req: { transactionID: 'tx' } }))
  expect(mocks.payload.db.commitTransaction).toHaveBeenCalledWith('tx')
  expect(record.phase).toBe('installed')
  expect(mocks.persist.mock.invocationCallOrder[0]).toBeLessThan(mocks.payload.db.commitTransaction.mock.invocationCallOrder[0])
  expect(mocks.payload.db.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(mocks.save.mock.invocationCallOrder.at(-1)!)
})
it('rolls back the entire transaction if a migration fails', async () => {
  mocks.up.mockRejectedValueOnce(new Error('migration rejected'))
  await expect(finishInstallation(makeRecord(), admin)).rejects.toThrow('migration rejected')
  expect(mocks.payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
  expect(mocks.payload.db.commitTransaction).not.toHaveBeenCalled()
  expect(mocks.payload.create).not.toHaveBeenCalled()
  expect(mocks.end).toHaveBeenCalled()
})
it('rolls back administrator creation if saving website settings fails', async () => {
  mocks.payload.updateGlobal.mockRejectedValueOnce(new Error('settings rejected'))
  await expect(finishInstallation(makeRecord(), admin)).rejects.toThrow('settings rejected')
  expect(mocks.payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
  expect(mocks.payload.db.commitTransaction).not.toHaveBeenCalled()
})
it('rejects initialized or nonempty databases before configuration or Payload writes', async () => {
  for (const inventory of ['installed', 'initialized', 'existing']) {
    mocks.inventory.mockResolvedValue(inventory)
    await expect(finishInstallation(makeRecord(), admin)).rejects.toThrow(inventory === 'existing' ? 'existingDatabase' : 'installed')
  }
  expect(mocks.persist).not.toHaveBeenCalled()
  expect(mocks.payload.init).not.toHaveBeenCalled()
})
it('blocks concurrent requests before writes', async () => {
  mocks.query.mockResolvedValueOnce({ rows: [{ locked: false }] })
  await expect(finishInstallation(makeRecord(), admin)).rejects.toThrow('busy')
  expect(mocks.persist).not.toHaveBeenCalled()
})
it('recovers the completion marker after a commit without creating a second user', async () => {
  mocks.inventory.mockResolvedValue('installed')
  mocks.query.mockResolvedValueOnce({ rows: [{ locked: true }] }).mockResolvedValueOnce({ rowCount: 1 })
  const record = { ...makeRecord(), phase: 'provisioning' as const }
  expect(await finishInstallation(record, admin)).toEqual({ completed: true, restart: true })
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ phase: 'installed' }))
  expect(mocks.payload.create).not.toHaveBeenCalled()
})
it('recovers after DB commit followed by a failed completion write, including a simulated worker restart', async () => {
  let disk: InstallationRecord | undefined
  mocks.save.mockImplementation(async (value: InstallationRecord) => {
    if (value.phase === 'installed') throw new Error('completion file unavailable')
    disk = structuredClone(value)
  })
  await expect(finishInstallation(makeRecord(), admin)).rejects.toThrow('completion file unavailable')
  expect(mocks.payload.db.commitTransaction).toHaveBeenCalledTimes(1)
  expect(disk?.phase).toBe('provisioning')
  const createsBeforeRestart = mocks.payload.create.mock.calls.length
  mocks.inventory.mockResolvedValue('installed')
  mocks.save.mockImplementation(async (value: InstallationRecord) => { disk = structuredClone(value) })
  expect(await finishInstallation(structuredClone(disk!), admin)).toEqual({ completed: true, restart: true })
  expect(disk?.phase).toBe('installed')
  expect(mocks.payload.create).toHaveBeenCalledTimes(createsBeforeRestart)
  expect(mocks.payload.init).toHaveBeenCalledTimes(1)
  expect(mocks.payload.db.commitTransaction).toHaveBeenCalledTimes(1)
})
