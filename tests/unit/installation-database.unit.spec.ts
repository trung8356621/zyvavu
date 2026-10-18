// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ connect: vi.fn(), end: vi.fn(), query: vi.fn(), options: vi.fn(), poolQuery: vi.fn(), poolOptions: vi.fn(), poolEnd: vi.fn() }))
vi.mock('pg', () => ({ default: { Client: class {
  connect = mocks.connect; end = mocks.end; query = mocks.query; on = vi.fn()
  constructor(options: unknown) { mocks.options(options) }
}, Pool: class {
  query = mocks.poolQuery; end = mocks.poolEnd; on = vi.fn()
  constructor(options: unknown) { mocks.poolOptions(options) }
} } }))
let database: typeof import('@/lib/installation/database')
beforeEach(async () => { vi.resetAllMocks(); vi.resetModules(); database = await import('@/lib/installation/database') })
afterEach(() => vi.useRealTimers())
const connectDatabase = (url: string) => database.connectDatabase(url)
const databaseInventory: typeof import('@/lib/installation/database').databaseInventory = (...args) => database.databaseInventory(...args)
const requireFreshDatabase = (url: string) => database.requireFreshDatabase(url)
it('uses bounded server connections and releases failed clients with localized error keys', async () => {
  mocks.connect.mockRejectedValueOnce({ code: '28P01', message: 'sensitive diagnostic' })
  mocks.end.mockResolvedValue(undefined)
  await expect(connectDatabase('fixture')).rejects.toThrow('authentication')
  expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ connectionTimeoutMillis: 5000, query_timeout: 8000 }))
  expect(mocks.end).toHaveBeenCalled()
})
it('recognizes a database with no application tables', async () => {
  const client = await connectDatabase('fixture')
  mocks.query.mockResolvedValueOnce({ rows: [] })
  expect(await databaseInventory(client)).toBe('empty')
})
it('requires both a system administrator and completion flag for INSTALLED', async () => {
  const client = await connectDatabase('fixture')
  for (const [admin, complete, expected] of [[false, true, 'initialized'], [true, false, 'initialized'], [true, true, 'installed']] as const) {
    mocks.query.mockResolvedValueOnce({ rows: [{ schema: 'public', name: 'users' }, { schema: 'public', name: 'settings' }] })
    mocks.query.mockResolvedValueOnce({ rows: [{ has_users: true, has_admin: admin }] })
    if (admin) mocks.query.mockResolvedValueOnce({ rowCount: complete ? 1 : 0 })
    expect(await databaseInventory(client)).toBe(expected)
  }
})
it('refuses nonempty databases in other schemas without mutating them', async () => {
  mocks.query.mockResolvedValueOnce({ rows: [{ schema: 'another_app', name: 'content' }] })
  await expect(requireFreshDatabase('fixture')).rejects.toThrow('existingDatabase')
  expect(mocks.query).toHaveBeenCalledTimes(1)
  expect(mocks.end).toHaveBeenCalled()
})
it('coalesces 101 health probes into one pooled SELECT and recovers after an outage', async () => {
  vi.useFakeTimers()
  mocks.poolQuery.mockResolvedValue({ rows: [] })
  mocks.poolEnd.mockResolvedValue(undefined)
  expect((await Promise.all(Array.from({ length: 101 }, () => database.databaseReachable('fixture')))).every(Boolean)).toBe(true)
  expect(mocks.poolQuery).toHaveBeenCalledTimes(1)
  expect(mocks.poolQuery).toHaveBeenCalledWith('SELECT 1')
  expect(mocks.poolOptions).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(1001)
  mocks.poolQuery.mockRejectedValueOnce(new Error('outage'))
  expect(await database.databaseReachable('fixture')).toBe(false)
  vi.advanceTimersByTime(1001)
  expect(await database.databaseReachable('fixture')).toBe(true)
  expect(await database.databaseReachable('changed')).toBe(true)
  expect(mocks.poolEnd).toHaveBeenCalledTimes(1)
  expect(mocks.poolOptions).toHaveBeenCalledTimes(2)
})
it('shares a pending health probe even when connecting takes longer than the health TTL', async () => {
  vi.useFakeTimers()
  let finish: (value: unknown) => void = () => {}
  mocks.poolQuery.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const first = database.databaseReachable('fixture')
  vi.advanceTimersByTime(2000)
  const second = database.databaseReachable('fixture')
  expect(second).toBe(first)
  expect(mocks.poolQuery).toHaveBeenCalledTimes(1)
  finish({ rows: [] })
  expect(await first).toBe(true)
  expect(await second).toBe(true)
})
