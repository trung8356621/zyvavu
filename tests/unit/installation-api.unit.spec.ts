// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ readRecord: vi.fn(), save: vi.fn(), fresh: vi.fn(), finish: vi.fn() }))
vi.mock('@/lib/installation/store', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/installation/store')>(),
  readRecord: mocks.readRecord, saveRecord: mocks.save,
  withInstallationLock: async (work: () => Promise<unknown>) => work(),
}))
vi.mock('@/lib/installation/database', () => ({ requireFreshDatabase: mocks.fresh }))
vi.mock('@/lib/installation/install', () => ({ finishInstallation: mocks.finish }))
import { POST } from '@/app/api/setup/route'
import { SetupError, databaseURL } from '@/lib/installation/validation'
const database = { host: 'db.example.com', port: '5432', database: 'unit', username: 'unit', password: 'fixture', ssl: 'verify-full' }
const makeRecord = () => ({ phase: 'database', secret: 'unit-private-secret', databaseUrl: databaseURL(database) })
const request = (body: string, headers: Record<string, string> = {}) => new NextRequest('http://localhost:3107/api/setup', { method: 'POST', headers: { host: 'localhost:3107', origin: 'http://localhost:3107', 'content-type': 'application/json', ...headers }, body })
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('DATABASE_URL', ''); vi.stubEnv('PAYLOAD_SECRET', ''); mocks.readRecord.mockResolvedValue(null) })
afterEach(() => vi.unstubAllEnvs())
it('starts directly on a verified fresh database without activation and returns no secrets', async () => {
  const response = await POST(request(JSON.stringify({ action: 'database', database })))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ verified: true })
  const saved = mocks.save.mock.calls[0][0]
  expect(saved.secret).toMatch(/^[a-f0-9]{96}$/)
  expect(saved.databaseUrl).toBe(databaseURL(database))
})
it('blocks cross-origin requests before testing a database', async () => {
  expect((await POST(request('{}', { origin: 'https://elsewhere.invalid' }))).status).toBe(403)
  expect(mocks.fresh).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
})
it('rejects malformed and oversized JSON safely', async () => {
  expect((await POST(request('{'))).status).toBe(400)
  expect((await POST(request('null'))).status).toBe(400)
  expect((await POST(request(JSON.stringify({ padding: 'x'.repeat(17000) })))).status).toBe(413)
})
it('reports failed connectivity without creating progress or secrets', async () => {
  mocks.fresh.mockRejectedValueOnce(new SetupError('connection'))
  const response = await POST(request(JSON.stringify({ action: 'database', database })))
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'connection' })
  expect(mocks.save).not.toHaveBeenCalled()
})
it('blocks completed installations even when runtime configuration disappears', async () => {
  mocks.readRecord.mockResolvedValue({ ...makeRecord(), phase: 'installed' })
  expect((await POST(request(JSON.stringify({ action: 'database', database })))).status).toBe(409)
  expect(mocks.fresh).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
})
it('rechecks installed state after acquiring the installation lock', async () => {
  mocks.readRecord.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...makeRecord(), phase: 'installed' })
  expect((await POST(request(JSON.stringify({ action: 'database', database })))).status).toBe(409)
  expect(mocks.save).not.toHaveBeenCalled()
})
it('never claims an installed database when its local completion marker is absent', async () => {
  vi.stubEnv('DATABASE_URL', databaseURL(database))
  mocks.fresh.mockRejectedValueOnce(new SetupError('installed', 409))
  const response = await POST(request(JSON.stringify({ action: 'database', useEnvironment: true })))
  expect(response.status).toBe(409)
  expect(mocks.save).not.toHaveBeenCalled()
})
it('reverifies the database before every website or administrator-finalization action', async () => {
  mocks.readRecord.mockResolvedValue(makeRecord())
  for (const action of ['website', 'finish']) {
    mocks.fresh.mockRejectedValueOnce(new SetupError('existingDatabase', 409))
    expect((await POST(request(JSON.stringify({ action })))).status).toBe(409)
  }
  expect(mocks.fresh).toHaveBeenCalledTimes(2)
  expect(mocks.save).not.toHaveBeenCalled()
  expect(mocks.finish).not.toHaveBeenCalled()
})
it('pins the verified database against conflicting concurrent clients', async () => {
  mocks.readRecord.mockResolvedValue(makeRecord())
  const response = await POST(request(JSON.stringify({ action: 'database', database: { ...database, database: 'different' } })))
  expect(response.status).toBe(409)
  expect(mocks.save).not.toHaveBeenCalled()
})
it('restores only nonsecret website settings after fresh-database verification', async () => {
  const website = { siteName: 'Demo', siteUrl: 'https://example.com', language: 'vi', timezone: 'UTC', activeThemeId: 'corporate' }
  mocks.readRecord.mockResolvedValue({ ...makeRecord(), website })
  const response = await POST(request(JSON.stringify({ action: 'database', database })))
  expect(await response.json()).toEqual({ verified: true, website })
  expect(mocks.fresh).toHaveBeenCalledWith(databaseURL(database))
})