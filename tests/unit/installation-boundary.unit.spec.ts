// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ status: vi.fn(), getPayload: vi.fn() }))
vi.mock('@/lib/installation/status', () => ({ installationStatus: mocks.status }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`) } }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
import { getInstalledPayload } from '@/lib/installation/payload'
beforeEach(() => { vi.resetAllMocks() })
it('blocks Payload for every unfinished setup state, including concurrent metadata/layout calls', async () => {
  for (const status of ['UNCONFIGURED', 'CONFIGURING', 'CONFIGURED_NOT_INSTALLED']) {
    mocks.status.mockResolvedValue(status)
    const results = await Promise.allSettled([getInstalledPayload(), getInstalledPayload()])
    expect(results.every(result => result.status === 'rejected' && result.reason.message === 'redirect:/setup')).toBe(true)
  }
  expect(mocks.getPayload).not.toHaveBeenCalled()
})
it('uses maintenance for an installed database outage without initializing Payload', async () => {
  mocks.status.mockResolvedValue('DATABASE_UNAVAILABLE')
  await expect(getInstalledPayload()).rejects.toThrow('redirect:/maintenance')
  expect(mocks.getPayload).not.toHaveBeenCalled()
})
it('initializes Payload only after installation has been verified', async () => {
  mocks.status.mockResolvedValue('INSTALLED')
  mocks.getPayload.mockResolvedValue({ initialized: true })
  expect(await getInstalledPayload()).toEqual({ initialized: true })
})
it('handles a connection race while keeping unrelated failures visible', async () => {
  mocks.status.mockResolvedValue('INSTALLED')
  mocks.getPayload.mockRejectedValueOnce(new Error('Error: cannot connect to Postgres: unavailable'))
  await expect(getInstalledPayload()).rejects.toThrow('redirect:/maintenance')
  mocks.getPayload.mockRejectedValueOnce(new Error('unrelated application failure'))
  await expect(getInstalledPayload()).rejects.toThrow('unrelated application failure')
})
