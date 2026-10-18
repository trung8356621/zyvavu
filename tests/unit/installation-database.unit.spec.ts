// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ connect: vi.fn(), end: vi.fn(), query: vi.fn(), options: vi.fn() }))
vi.mock('pg', () => ({ default: { Client: class {
  connect = mocks.connect; end = mocks.end; query = mocks.query; on = vi.fn()
  constructor(options: unknown) { mocks.options(options) }
} } }))
import { connectDatabase, databaseInventory, requireFreshDatabase } from '@/lib/installation/database'
beforeEach(() => { vi.resetAllMocks() })
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
