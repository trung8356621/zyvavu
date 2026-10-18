// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ readRecord: vi.fn(), connect: vi.fn(), inventory: vi.fn(), end: vi.fn() }))
vi.mock('@/lib/installation/store', () => ({ readRecord: mocks.readRecord }))
vi.mock('@/lib/installation/database', () => ({ connectDatabase: mocks.connect, databaseInventory: mocks.inventory }))
import { installationStatus } from '@/lib/installation/status'

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', '')
  vi.stubEnv('PAYLOAD_SECRET', '')
  mocks.readRecord.mockResolvedValue(null)
  mocks.connect.mockResolvedValue({ end: mocks.end })
  mocks.inventory.mockResolvedValue('empty')
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })
it('renders unconfigured setup without a database connection', async () => {
  expect(await installationStatus()).toBe('UNCONFIGURED')
  expect(mocks.connect).not.toHaveBeenCalled()
})
it('resumes incomplete configuration without connecting', async () => {
  mocks.readRecord.mockResolvedValue({ phase: 'website' })
  expect(await installationStatus()).toBe('INCOMPLETE')
  expect(mocks.connect).not.toHaveBeenCalled()
})
it('does not equate available environment variables with successful installation', async () => {
  vi.stubEnv('DATABASE_URL', 'private')
  vi.stubEnv('PAYLOAD_SECRET', 'private')
  expect(await installationStatus()).toBe('INCOMPLETE')
})
it('recognizes existing users and prevents installation state from claiming their website', async () => {
  vi.stubEnv('DATABASE_URL', 'private')
  vi.stubEnv('PAYLOAD_SECRET', 'private')
  mocks.readRecord.mockResolvedValue({ phase: 'started' })
  mocks.inventory.mockResolvedValue('installed')
  expect(await installationStatus()).toBe('INSTALLED')
})
it('keeps a durable installed instance out of setup when its env file disappears', async () => {
  mocks.readRecord.mockResolvedValue({ phase: 'installed' })
  expect(await installationStatus()).toBe('DATABASE_UNAVAILABLE')
})
it('maps database outages to maintenance rather than setup', async () => {
  vi.stubEnv('DATABASE_URL', 'private')
  vi.stubEnv('PAYLOAD_SECRET', 'private')
  mocks.connect.mockRejectedValueOnce(new Error('unreachable'))
  expect(await installationStatus()).toBe('DATABASE_UNAVAILABLE')
})
