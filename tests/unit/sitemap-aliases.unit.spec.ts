// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'
import nextConfig from '../../next.config'

const origin = 'https://zyvavu.test'
const route = (path: string) => unstable_getResponseFromNextConfig({ url: origin + path, nextConfig })

describe('sitemap alias routing', () => {
  it.each([
    '/sitemap', '/sitemap/', '/sitemap_index.xml', '/sitemap-index.xml',
    '/sitemapindex.xml', '/wp-sitemap.xml', '/site-map.xml', '/sitemap.xml/',
  ])('redirects %s directly to the canonical endpoint', async (path) => {
    const response = await route(path)
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(origin + '/sitemap.xml')
    expect((await route('/sitemap.xml')).headers.get('location')).toBeNull()
  })

  it.each([
    '/sitemap.xml', '/sitemap/posts/1.xml', '/sitemap/pages/1.xml',
    '/sitemap/categories/1.xml', '/sitemap/tags/1.xml', '/sitemap-view',
    '/sitemap-view/posts/1', '/robots.txt', '/feed', '/sitemap/unrelated', '/my-sitemap',
  ])('leaves %s to its existing handler', async (path) => {
    expect((await route(path)).headers.get('location')).toBeNull()
  })

  it('preserves query strings and ordinary trailing-slash normalization', async () => {
    expect((await route('/sitemap/?raw=1')).headers.get('location')).toBe(origin + '/sitemap.xml?raw=1')
    expect((await route('/ordinary/')).headers.get('location')).toBe(origin + '/ordinary')
  })
})
