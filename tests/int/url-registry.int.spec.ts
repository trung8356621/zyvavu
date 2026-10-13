import crypto from 'node:crypto'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildOfflineManifest } from '@/lib/offline/manifest'
import { isReservedPath, normalizePath } from '@/lib/url/normalize'
import { detectRedirectLoop, resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'

let payload: Payload
const suffix = crypto.randomBytes(4).toString('hex')
const createdPages: number[] = []
const createdPosts: number[] = []
const createdMenus: number[] = []

describe('url registry foundation', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    for (const id of createdMenus) {
      await payload.delete({ collection: 'menus', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdPages) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdPosts) {
      await payload.delete({ collection: 'posts', id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('rejects a redirect loop in the path graph', () => {
    const edges = new Map([
      ['/b', '/c'],
      ['/c', '/a'],
    ])
    expect(detectRedirectLoop('/a', '/b', edges)).toBe(true)
    expect(detectRedirectLoop('/a', '/fresh', new Map([['/old', '/a']]))).toBe(false)
  })

  it('keeps the existing public page URL and gives an unlisted page its own route', async () => {
    const existing = await resolvePublicPath(payload, '/gioi-thieu')
    expect(existing).toMatchObject({ kind: 'canonical', resourceType: 'page', id: 7 })

    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Unlisted',
        slug: `unlisted-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    const resolved = await resolvePublicPath(payload, `/unlisted-${suffix}`)
    expect(resolved).toMatchObject({ kind: 'canonical', resourceType: 'page', id: page.id })
  })

  it('keeps a page URL after its menu is deleted', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Menu page',
        slug: `menu-page-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    const menu = await payload.create({
      collection: 'menus',
      overrideAccess: true,
      data: {
        name: `menu-url-${suffix}`,
        location: 'footer',
        items: [{ label: 'Page', link: { type: 'page', page: page.id } }],
      },
    })
    await payload.delete({ collection: 'menus', id: menu.id, overrideAccess: true })
    const resolved = await resolvePublicPath(payload, `/menu-page-${suffix}`)
    expect(resolved).toMatchObject({ kind: 'canonical', id: page.id })
  })

  it('stores a redirect when a published slug changes', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Rename',
        slug: `from-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { slug: `to-${suffix}` },
    })
    expect(await resolvePublicPath(payload, `/from-${suffix}`)).toMatchObject({
      kind: 'redirect',
      target: `/to-${suffix}`,
    })
    expect(await resolvePublicPath(payload, `/to-${suffix}`)).toMatchObject({
      kind: 'canonical',
      id: page.id,
    })
  })

  it('rejects a page and a post that claim the same public path', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Clash page',
        slug: `clash-page-${suffix}`,
        publicPath: `/clash-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    await expect(
      payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: 'Clash post',
          slug: `clash-post-${suffix}`,
          publicPath: `/clash-${suffix}`,
          _status: 'published',
        },
      }),
    ).rejects.toThrow(/already in use/i)
  })

  it('allows only one canonical row when two publishes race', async () => {
    const path = `/race-${suffix}`
    const results = await Promise.allSettled([
      payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: 'Race A',
          slug: `race-a-${suffix}`,
          publicPath: path,
          visibility: 'public',
          presentation: 'shared',
          _status: 'published',
        },
      }),
      payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: 'Race B',
          slug: `race-b-${suffix}`,
          publicPath: path,
          visibility: 'public',
          presentation: 'shared',
          _status: 'published',
        },
      }),
    ])
    for (const result of results) {
      if (result.status === 'fulfilled') createdPages.push(result.value.id)
    }
    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    expect(fulfilled).toHaveLength(1)
    const routes = await payload.find({
      collection: 'url-registry',
      where: { path: { equals: path } },
      overrideAccess: true,
    })
    expect(routes.docs).toHaveLength(1)
  })

  it('does not publish drafts or private pages', async () => {
    const draft = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Draft',
        slug: `draft-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'draft',
      },
    })
    createdPages.push(draft.id)
    const hidden = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Private',
        slug: `private-${suffix}`,
        visibility: 'private',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(hidden.id)
    expect(await resolvePublicPath(payload, `/draft-${suffix}`)).toBeNull()
    expect(await resolvePublicPath(payload, `/private-${suffix}`)).toBeNull()

    await payload.update({
      collection: 'pages',
      id: draft.id,
      overrideAccess: true,
      data: { _status: 'published' },
    })
    expect(await resolvePublicPath(payload, `/draft-${suffix}`)).toMatchObject({ kind: 'canonical' })
    await payload.update({
      collection: 'pages',
      id: draft.id,
      overrideAccess: true,
      data: { _status: 'draft' },
    })
    expect(await resolvePublicPath(payload, `/draft-${suffix}`)).toBeNull()
  })

  it('rejects a reserved path', async () => {
    await expect(
      payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: 'Reserved',
          slug: `reserved-${suffix}`,
          publicPath: '/admin',
          visibility: 'public',
          presentation: 'shared',
          _status: 'published',
        },
      }),
    ).rejects.toThrow(/reserved/i)
  })

  it('keeps offline eligibility on menu membership and does not list posts', async () => {
    const linked = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Offline linked',
        slug: `offline-linked-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(linked.id)
    const loose = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Offline loose',
        slug: `offline-loose-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(loose.id)
    const post = await payload.create({
      collection: 'posts',
      overrideAccess: true,
      data: {
        title: 'Offline post',
        slug: `offline-post-${suffix}`,
        _status: 'published',
      },
    })
    createdPosts.push(post.id)
    const menu = await payload.create({
      collection: 'menus',
      overrideAccess: true,
      data: {
        name: `offline-menu-${suffix}`,
        location: 'footer',
        items: [
          { label: 'Linked', link: { type: 'page', page: linked.id } },
          { label: 'Post', link: { type: 'post', post: post.id } },
        ],
      },
    })
    createdMenus.push(menu.id)

    const manifest = await buildOfflineManifest(payload)
    const paths = manifest.pages.map((page) => page.path)
    expect(paths).toContain(`/offline-linked-${suffix}`)
    expect(paths).not.toContain(`/offline-loose-${suffix}`)
    expect(paths.some((entry) => entry.startsWith('/posts/'))).toBe(false)
    expect(await resolvePublicPath(payload, `/offline-loose-${suffix}`)).toMatchObject({
      kind: 'canonical',
      id: loose.id,
    })
    expect(await resolvePublicPath(payload, `/posts/offline-post-${suffix}`)).toMatchObject({
      kind: 'canonical',
      resourceType: 'post',
      id: post.id,
    })
  })

  it('normalizes case, trailing slash and encoding without fuzzy matching', () => {
    expect(normalizePath('/Gioi-Thieu/')).toBe('/gioi-thieu')
    expect(normalizePath('/Hello%2DWorld/')).toBe('/hello-world')
    expect(normalizePath('/ADMIN')).toBe('/admin')
    expect(isReservedPath(normalizePath('/ADMIN'))).toBe(true)
    expect(normalizePath('/gioi-thieu-x')).not.toBe('/gioi-thieu')
  })

  it('keeps a WordPress-style path canonical across equivalent requests', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Legacy',
        slug: `legacy-slug-${suffix}`,
        publicPath: `/Legacy%2D${suffix}/`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    const canonical = `/legacy-${suffix}`
    expect(await resolvePublicPath(payload, canonical)).toMatchObject({ kind: 'canonical', id: page.id })
    expect(await resolvePublicPath(payload, `/LEGACY-${suffix}/`)).toMatchObject({ kind: 'canonical', id: page.id })
    expect(await resolvePublicPath(payload, `/Legacy%2D${suffix}`)).toMatchObject({ kind: 'canonical', id: page.id })
    expect(await resolvePublicPath(payload, `${canonical}-other`)).toBeNull()
  })

  it('points every historical URL directly at the latest path and can reclaim an old slug', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'History',
        slug: `hist-${suffix}-0`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)

    for (let step = 1; step <= 10; step += 1) {
      await payload.update({
        collection: 'pages',
        id: page.id,
        overrideAccess: true,
        data: { slug: `hist-${suffix}-${step}` },
      })
    }

    const latest = `/hist-${suffix}-10`
    const routes = await payload.find({
      collection: 'url-registry',
      where: { page: { equals: page.id } },
      depth: 0,
      limit: 20,
      overrideAccess: true,
      pagination: false,
    })
    const redirects = routes.docs.filter((route) => route.recordRole === 'redirect')
    expect(redirects).toHaveLength(10)
    expect(redirects.every((route) => route.targetPath === latest)).toBe(true)
    for (let step = 0; step < 10; step += 1) {
      expect(await resolvePublicPath(payload, `/hist-${suffix}-${step}`)).toEqual({
        kind: 'redirect',
        target: latest,
      })
    }

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { slug: `hist-${suffix}-0` },
    })
    expect(await resolvePublicPath(payload, `/hist-${suffix}-0`)).toMatchObject({
      kind: 'canonical',
      id: page.id,
    })
    const reclaimed = await payload.find({
      collection: 'url-registry',
      where: { page: { equals: page.id } },
      depth: 0,
      limit: 20,
      overrideAccess: true,
      pagination: false,
    })
    expect(reclaimed.docs.filter((route) => route.recordRole === 'redirect').every((route) => route.targetPath === `/hist-${suffix}-0`)).toBe(true)
    expect(await resolvePublicPath(payload, latest)).toEqual({
      kind: 'redirect',
      target: `/hist-${suffix}-0`,
    })
  })

  it('keeps the live route while a draft is edited, and rolls a URL collision back', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Lifecycle',
        slug: `life-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    const other = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Other',
        slug: `other-${suffix}`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(other.id)

    await payload.update({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
      data: { title: 'Draft title', slug: `life-draft-${suffix}` },
    })
    const whileDraft = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(whileDraft.slug).toBe(`life-${suffix}`)
    expect(whileDraft._status).toBe('published')
    expect(await resolvePublicPath(payload, `/life-${suffix}`)).toMatchObject({ kind: 'canonical', id: page.id })
    expect(await resolvePublicPath(payload, `/life-draft-${suffix}`)).toBeNull()

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { slug: `life-next-${suffix}`, _status: 'published' },
    })
    expect(await resolvePublicPath(payload, `/life-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/life-next-${suffix}`,
    })

    await expect(
      payload.update({
        collection: 'pages',
        id: page.id,
        overrideAccess: true,
        data: { publicPath: `/other-${suffix}`, _status: 'published' },
      }),
    ).rejects.toThrow(/already in use/i)
    const afterCollision = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(afterCollision.slug).toBe(`life-next-${suffix}`)
    expect(afterCollision.publicPath ?? null).toBeNull()
    expect(await resolvePublicPath(payload, `/other-${suffix}`)).toMatchObject({ kind: 'canonical', id: other.id })
    expect(await resolvePublicPath(payload, `/life-next-${suffix}`)).toMatchObject({ kind: 'canonical', id: page.id })

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { visibility: 'private' },
    })
    expect(await resolvePublicPath(payload, `/life-next-${suffix}`)).toBeNull()
    expect(await resolvePublicPath(payload, `/life-${suffix}`)).toBeNull()

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { visibility: 'public' },
    })
    expect(await resolvePublicPath(payload, `/life-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/life-next-${suffix}`,
    })

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { _status: 'draft' },
    })
    expect(await resolvePublicPath(payload, `/life-next-${suffix}`)).toBeNull()
    const hiddenHistory = await payload.find({
      collection: 'url-registry',
      where: { and: [{ page: { equals: page.id } }, { recordRole: { equals: 'redirect' } }] },
      depth: 0,
      overrideAccess: true,
    })
    expect(hiddenHistory.docs.length).toBeGreaterThan(0)

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { _status: 'published' },
    })
    expect(await resolvePublicPath(payload, `/life-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/life-next-${suffix}`,
    })

    await payload.delete({ collection: 'pages', id: page.id, overrideAccess: true })
    createdPages.splice(createdPages.indexOf(page.id), 1)
    expect(await resolvePublicPath(payload, `/life-next-${suffix}`)).toBeNull()
    expect(await resolvePublicPath(payload, `/life-${suffix}`)).toBeNull()
  })
})
