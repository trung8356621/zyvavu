import fs from 'node:fs'
import vm from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import type { SeoPageContext } from '@/lib/seo/types'
import { designTemplate, resourceTarget, suppressToolbar } from '@/lib/frontend-toolbar/model'
import { logoutToolbarSession } from '@/lib/frontend-toolbar/client'
import { resolveToolbar } from '@/lib/frontend-toolbar/server'
import { GET } from '@/app/api/frontend-admin-toolbar/route'
import { getPayload } from 'payload'
import { resolveSeoPageContext } from '@/lib/seo/context'
import { extractJWT } from '../../node_modules/payload/dist/auth/extractJWT.js'

vi.mock('payload', () => ({
  createLocalReq: vi.fn(async ({ user }) => ({ user })),
  getPayload: vi.fn(),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('@/lib/seo/context', () => ({ resolveSeoPageContext: vi.fn() }))

const context = (resourceType: SeoPageContext['resourceType'] = 'post', id: unknown = 42): SeoPageContext => ({
  status: 'ok', resourceType, document: { id }, requestedPath: '/article',
  isIndexable: true, site: {} as SeoPageContext['site'], title: 'Article',
  documentTitle: 'Article', description: '', breadcrumbs: [],
})

function setup() {
  const update = vi.fn(async () => true)
  const auth = vi.fn(async (_options?: { headers: Headers }) => ({
    user: { id: 1, role: 'site-admin', collection: 'users', email: 'private@example.test', sessions: ['private-session'] },
    permissions: {
      canAccessAdmin: true,
      collections: { posts: { create: true, update: true }, pages: { create: true, update: true }, categories: { update: true }, tags: { update: true } },
      globals: { settings: { update: true } },
    },
  }))
  const payload = {
    config: { cookiePrefix: 'payload', routes: { admin: '/admin', api: '/api' }, admin: { user: 'users' } },
    auth,
    collections: Object.fromEntries(['posts', 'pages', 'categories', 'tags'].map((slug) => [slug, { config: { access: { update } } }])),
  } as unknown as Payload
  vi.mocked(getPayload).mockResolvedValue(payload)
  vi.mocked(resolveSeoPageContext).mockResolvedValue(context())
  return { payload, auth, update }
}
const request = (cookie = 'payload-token=valid-session', path = '/article') => new Request(
  `http://localhost/api/frontend-admin-toolbar?path=${encodeURIComponent(path)}`, { headers: { cookie } },
)

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('server authorization and navigation', () => {
  it.each([
    { 'sec-fetch-site': 'same-origin' },
    { origin: 'https://zyvavu.test' },
  ])('preserves cookie auth context for Payload CSRF validation: %j', async (browserHeaders) => {
    const { payload, auth } = setup()
    payload.config.csrf = ['https://zyvavu.test']
    payload.config.auth = { jwtOrder: ['cookie'] } as typeof payload.config.auth
    const authorized = await auth()
    auth.mockClear()
    auth.mockImplementation(async (options) => (
      extractJWT({ headers: options!.headers, payload }) === 'valid-session'
        ? authorized
        : { user: null, permissions: {} } as never
    ))
    const req = request()
    for (const [name, value] of Object.entries(browserHeaders)) req.headers.set(name, value!)
    req.headers.set('DisableAutologin', 'false')
    expect((await resolveToolbar(payload, req))?.edit?.href).toBe('/admin/collections/posts/42')
    expect(auth.mock.calls[0][0]?.headers.get('DisableAutologin')).toBe('true')

    // Cookie alone and untrusted origins must still fail closed.
    expect(await resolveToolbar(payload, request())).toBeNull()
    req.headers.set('Origin', 'https://untrusted.test')
    expect(await resolveToolbar(payload, req)).toBeNull()
  })

  it('omits anonymous visitors without invoking development autoLogin', async () => {
    const { payload, auth } = setup()
    expect(await resolveToolbar(payload, request(''))).toBeNull()
    expect(auth).not.toHaveBeenCalled()
  })
  it('forces DisableAutologin and exposes no user/session fields', async () => {
    const { payload, auth } = setup()
    const data = await resolveToolbar(payload, request())
    expect(auth.mock.calls[0][0]?.headers.get('DisableAutologin')).toBe('true')
    expect(data?.edit?.href).toBe('/admin/collections/posts/42')
    expect(data?.design?.href).toBe('/admin/theme-builder?template=single')
    expect(data?.profile).toBe('/admin/account')
    expect(JSON.stringify(data)).not.toMatch(/private@example|private-session|valid-session/)
  })
  it('rejects invalid/expired sessions and unprivileged users', async () => {
    const { payload, auth } = setup()
    auth.mockResolvedValueOnce({ user: null, permissions: {} } as never)
    expect(await resolveToolbar(payload, request('payload-token=expired'))).toBeNull()
    auth.mockResolvedValueOnce({ user: { role: 'reader' }, permissions: { canAccessAdmin: true } } as never)
    expect(await resolveToolbar(payload, request())).toBeNull()
    auth.mockResolvedValueOnce({ user: { role: 'site-admin' }, permissions: { canAccessAdmin: false } } as never)
    expect(await resolveToolbar(payload, request())).toBeNull()
  })
  it('honors action permissions and does not guess conditional document grants', async () => {
    const { payload, auth, update } = setup()
    const result = await auth()
    result.permissions.collections.posts.create = false as never
    result.permissions.globals.settings.update = false as never
    auth.mockResolvedValue(result)
    update.mockResolvedValueOnce({ owner: { equals: 2 } } as never)
    const data = await resolveToolbar(payload, request())
    expect(data?.edit).toBeUndefined()
    expect(data?.design).toBeUndefined()
    expect(data?.create).toEqual([{ label: 'Page', href: '/admin/collections/pages/create' }])
  })
  it.each(['page', 'category', 'tag'] as const)('routes a resolved %s to its exact document', async (type) => {
    const { payload } = setup()
    vi.mocked(resolveSeoPageContext).mockResolvedValue(context(type, 71))
    const data = await resolveToolbar(payload, request())
    const slug = type === 'category' ? 'categories' : `${type}s`
    expect(data?.edit?.href).toBe(`/admin/collections/${slug}/71`)
    expect(data?.design?.href).toContain(`template=${type === 'page' ? 'page' : 'category'}`)
  })
  it('omits edit content for home without a mapped resource; uses the home template', async () => {
    const { payload } = setup()
    vi.mocked(resolveSeoPageContext).mockResolvedValue(context('home', undefined))
    const data = await resolveToolbar(payload, request('payload-token=valid', '/'))
    expect(data?.edit).toBeUndefined()
    expect(data?.design?.href).toBe('/admin/theme-builder?template=home')
  })
  it('uses generic Theme Builder for unsupported resources and rejects external/reserved paths', async () => {
    const { payload } = setup()
    vi.mocked(resolveSeoPageContext).mockResolvedValue({ status: 'not_found' } as SeoPageContext)
    expect((await resolveToolbar(payload, request()))?.design?.href).toBe('/admin/theme-builder')
    for (const path of ['//external.test', '/admin', '/api/private', '/a?preview=1']) {
      expect(await resolveToolbar(payload, request('payload-token=valid', path))).toBeNull()
    }
  })
  it('marks successful, anonymous and failed endpoint responses private and non-cacheable', async () => {
    setup()
    for (const req of [request(), request('')]) {
      const response = await GET(req)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(response.headers.get('vary')).toBe('Cookie')
    }
    vi.mocked(getPayload).mockRejectedValueOnce(new Error('private database detail'))
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({ toolbar: null })
  })
})

describe('resource and preview safeguards', () => {
  it('maps static homepage to Page without inventing an ID', () => {
    const home = { ...context('home', 9), page: { id: 9 } } as SeoPageContext
    expect(resourceTarget(home)).toEqual({ collection: 'pages', id: 9 })
    expect(designTemplate(home)).toBe('page')
    expect(resourceTarget(context('post', 'bad-id'))).toBeUndefined()
    expect(resourceTarget({ ...context(), status: 'redirect' })).toBeUndefined()
  })
  it('suppresses Admin, captures, embedded views and explicit previews', () => {
    expect(suppressToolbar('/article')).toBe(false)
    for (const path of ['/admin', '/admin/theme-builder', '/pattern-preview/a']) expect(suppressToolbar(path)).toBe(true)
    for (const query of ['preview=1', 'draft=true', 'preview_theme=corporate']) expect(suppressToolbar('/', query)).toBe(true)
    expect(suppressToolbar('/', '', true)).toBe(true)
  })
  it('is completely bypassed by the existing service worker, including logout', () => {
    const handlers: Record<string, (event: unknown) => void> = {}
    const fetch = vi.fn()
    vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
      self: { location: { origin: 'https://zyvavu.test' }, addEventListener: (name: string, fn: typeof handlers[string]) => { handlers[name] = fn } },
      URL, fetch,
    })
    for (const [path, method] of [['/api/frontend-admin-toolbar?path=%2F', 'GET'], ['/api/users/logout', 'POST']]) {
      const respondWith = vi.fn()
      handlers.fetch({ request: { url: `https://zyvavu.test${path}`, method, mode: 'navigate' }, respondWith })
      expect(respondWith).not.toHaveBeenCalled()
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('uses the native logout endpoint and does not accept failed invalidation', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false })
    vi.stubGlobal('fetch', fetch)
    await logoutToolbarSession('/api/users/logout')
    expect(fetch).toHaveBeenCalledWith('/api/users/logout', expect.objectContaining({ method: 'POST', credentials: 'same-origin', headers: { DisableAutologin: 'true' } }))
    await expect(logoutToolbarSession('/api/users/logout')).rejects.toThrow('Logout failed')
  })
})
