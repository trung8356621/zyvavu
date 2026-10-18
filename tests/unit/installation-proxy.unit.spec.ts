// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ status: vi.fn() }))
vi.mock('@/lib/installation/status', () => ({ installationStatus: mocks.status }))
import { proxy } from '@/proxy'
const request = (path: string) => new NextRequest(`http://localhost:3107${path}`)
beforeEach(() => { vi.resetAllMocks() })
it('keeps setup and maintenance accessible without checking PostgreSQL', async () => {
  for (const path of ['/setup', '/api/setup', '/maintenance']) expect((await proxy(request(path))).headers.get('x-middleware-next')).toBe('1')
  expect(mocks.status).not.toHaveBeenCalled()
})
it('redirects unfinished public requests to setup', async () => {
  mocks.status.mockResolvedValue('UNCONFIGURED')
  const response = await proxy(request('/posts/example'))
  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('http://localhost:3107/setup')
})
it('blocks ordinary APIs while installation is incomplete', async () => {
  mocks.status.mockResolvedValue('CONFIGURED_NOT_INSTALLED')
  const response = await proxy(request('/api/users'))
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'setup.required' })
})
it('allows normal operation only for verified installed websites', async () => {
  mocks.status.mockResolvedValue('INSTALLED')
  expect((await proxy(request('/'))).headers.get('x-middleware-next')).toBe('1')
})
it('returns a 503 maintenance rewrite rather than reopening setup after an outage', async () => {
  mocks.status.mockResolvedValue('DATABASE_UNAVAILABLE')
  const response = await proxy(request('/'))
  expect(response.status).toBe(503)
  expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost:3107/maintenance')
  expect(response.headers.get('retry-after')).toBe('60')
  expect(response.headers.has('location')).toBe(false)
})
