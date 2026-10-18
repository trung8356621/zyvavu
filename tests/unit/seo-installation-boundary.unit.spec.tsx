// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ status: vi.fn(), getPayload: vi.fn() }))
vi.mock('@/lib/installation/status', () => ({ installationStatus: mocks.status }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`) },
  notFound: () => { throw new Error('not-found') },
}))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

import { GET as robots } from '@/app/(frontend)/robots.txt/route'
import { GET as index } from '@/app/(frontend)/sitemap.xml/route'
import { GET as chunk } from '@/app/(frontend)/sitemap/[group]/[page]/route'
import Viewer from '@/app/(sitemap)/sitemap-view/page'
import ChunkViewer from '@/app/(sitemap)/sitemap-view/[group]/[page]/page'

beforeEach(() => { vi.resetAllMocks() })

it.each([
  ['UNCONFIGURED', '/setup'],
  ['CONFIGURING', '/setup'],
  ['CONFIGURED_NOT_INSTALLED', '/setup'],
  ['DATABASE_UNAVAILABLE', '/maintenance'],
])('gates every recovered entry point in state %s', async (status, target) => {
  mocks.status.mockResolvedValue(status)
  const entries = [
    () => robots(),
    () => index(),
    () => chunk(new Request('http://localhost/sitemap/posts/1.xml'), { params: Promise.resolve({ group: 'posts', page: '1.xml' }) }),
    () => Viewer(),
    () => ChunkViewer({ params: Promise.resolve({ group: 'posts', page: '1' }) }),
  ]
  for (const enter of entries) await expect(enter()).rejects.toThrow(`redirect:${target}`)
  expect(mocks.getPayload).not.toHaveBeenCalled()
})

it('returns XML, plain text and HTML elements after installation', async () => {
  mocks.status.mockResolvedValue('INSTALLED')
  mocks.getPayload.mockResolvedValue({
    findGlobal: async () => ({ siteName: 'Zyvavu', siteUrl: 'https://zyvavu.test', language: 'vi' }),
    find: async () => ({ docs: [], totalDocs: 0 }),
  })
  const xml = await index()
  expect(xml.status).toBe(200)
  expect(xml.headers.get('content-type')).toContain('application/xml')
  expect(await xml.text()).toContain('<sitemapindex')
  const child = await chunk(new Request('http://localhost/sitemap/posts/1.xml'), { params: Promise.resolve({ group: 'posts', page: '1.xml' }) })
  expect(child.status).toBe(200)
  expect(await child.text()).toContain('<urlset')
  expect((await robots()).headers.get('content-type')).toContain('text/plain')
  expect(await Viewer()).toBeTruthy()
  expect(await ChunkViewer({ params: Promise.resolve({ group: 'posts', page: '1' }) })).toBeTruthy()
})
