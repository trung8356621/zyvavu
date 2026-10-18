// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ payload: vi.fn() }))
vi.mock('@/lib/installation/payload', () => ({ getInstalledPayload: mocks.payload }))

import { GET as index, HEAD as indexHead } from '@/app/(frontend)/sitemap.xml/route'
import { GET as chunk, HEAD as chunkHead } from '@/app/(frontend)/sitemap/[group]/[page]/route'

const navigation = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Dest': 'document',
}
const context = { params: Promise.resolve({ group: 'posts', page: '1.xml' }) }
const request = (path: string, headers: HeadersInit = {}, method = 'GET') =>
  new Request(`https://zyvavu.test${path}`, { headers, method })

beforeEach(() => {
  // Legacy activation settings cannot restore the rejected HTML representation.
  vi.stubEnv('SITEMAP_HTML_NEGOTIATION', 'verified-enabled')
  mocks.payload.mockResolvedValue({
    findGlobal: async () => ({ siteName: 'Zyvavu', siteUrl: 'https://zyvavu.test', setupComplete: true }),
    find: async ({ collection, where }: { collection: string; where: Record<string, unknown> }) => {
      if (collection === 'url-registry') {
        const conditions = where.and as Array<{ resourceType?: { equals: string } }>
        const posts = conditions.some((item) => item.resourceType?.equals === 'post')
        return { docs: posts ? [{ id: 1, path: '/canonical.html', recordRole: 'canonical', resourceType: 'post', post: 1 }] : [], totalDocs: posts ? 1 : 0 }
      }
      return { docs: [{ id: 1, slug: 'canonical', _status: 'published', updatedAt: '2026-10-01T00:00:00.000Z' }] }
    },
  })
})
afterEach(() => vi.unstubAllEnvs())

describe.each([
  { path: '/sitemap.xml', get: (req: Request) => index(req), head: (req: Request) => indexHead(req), root: 'sitemapindex' },
  { path: '/sitemap/posts/1.xml', get: (req: Request) => chunk(req, context), head: (req: Request) => chunkHead(req, context), root: 'urlset' },
])('$path raw XML acceptance', ({ path, get, head, root }) => {
  it('serves plain XML even for genuine browser document navigation', async () => {
    const response = await get(request(path, navigation))
    const xml = await response.text()
    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8')
    expect(xml).not.toContain('xml-stylesheet')
    expect(xml).not.toContain('<html')
    expect(xml).not.toContain('<script')
    expect(xml).toBe(await (await get(request(path))).text())
    const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(xmlDoc.querySelector('parsererror')).toBeNull()
    expect(xmlDoc.documentElement.localName).toBe(root)
    expect(xmlDoc.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
    if (root === 'urlset') {
      expect(xmlDoc.querySelector('loc')?.textContent).toBe('https://zyvavu.test/canonical.html')
      expect(xmlDoc.querySelector('lastmod')?.textContent).toBe('2026-10-01T00:00:00.000Z')
    }
  })

  it('falls back to unchanged XML for raw, missing, ambiguous, crawler and conditional requests', async () => {
    const baseline = await (await get(request(path))).text()
    const cases = [request(path), request(path, { Accept: 'application/xml' }),
      request(path, { ...navigation, 'Sec-Fetch-User': '?1' }),
      request(path, { 'User-Agent': 'Googlebot', Accept: '*/*' }),
      request(`${path}?raw=1`, navigation), request(`${path}?format=xml`, navigation),
      request(path, { ...navigation, 'If-None-Match': '"old-html"' }),
      request(path, { ...navigation, 'If-Modified-Since': 'Thu, 01 Oct 2026 00:00:00 GMT' }),
      request(path, { ...navigation, Accept: 'text/html;q=0' }),
      request(path, { ...navigation, Accept: 'text/html,application/xml' }),
      request(path, { ...navigation, Accept: 'text/html;q=0.5,application/xml;q=0.9' }),
      request(path, { ...navigation, Accept: 'text/html,text/html;q=0' }),
      ...Object.keys(navigation).map((key) => {
        const headers = new Headers(navigation)
        headers.delete(key)
        return request(path, headers)
      }),
    ]
    for (const req of cases) {
      const response = await get(req)
      expect(response.headers.get('Content-Type')).toContain('application/xml')
      expect(await response.text()).toBe(baseline)
    }
    const response = await head(request(path, navigation, 'HEAD'))
    expect(response.headers.get('Content-Type')).toContain('application/xml')
    expect(await response.text()).toBe('')
  })

  it('always returns XML when browser and machine requests alternate', async () => {
    for (const html of [true, false, true, false]) {
      const response = await get(request(path, html ? navigation : {}))
      expect(response.headers.get('Content-Type')).toContain('application/xml')
      expect(response.headers.get('Cache-Control')).toContain('no-store')
      expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
      expect(await response.text()).toContain('<?xml version=')
    }
  })
})
