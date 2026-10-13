import crypto from 'node:crypto'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ROLE_SITE_ADMIN, ROLE_SYSTEM_ADMIN } from '@/access/roles'
import { buildOfflineManifest, selectEligiblePages } from '@/lib/offline/manifest'
import config from '@/payload.config'

let payload: Payload
const suffix = crypto.randomBytes(4).toString('hex')
const password = crypto.randomBytes(18).toString('base64url')

describe('foundation access and offline eligibility', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'users',
      where: { email: { like: `foundation-${suffix}` } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'menus',
      where: { name: { equals: `menu-${suffix}` } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'pages',
      where: { slug: { like: `offline-${suffix}` } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'posts',
      where: { slug: { like: `offline-${suffix}` } },
      overrideAccess: true,
    })
  })

  it('selects only published public pages that are linked from a menu', () => {
    const pages = selectEligiblePages(
      [
        { id: 1, updatedAt: '1', visibility: 'public', _status: 'published' },
        { id: 2, updatedAt: '1', visibility: 'private', _status: 'published' },
        { id: 3, updatedAt: '1', visibility: 'public', _status: 'draft' },
        { id: 4, updatedAt: '1', visibility: 'public', _status: 'published' },
      ],
      new Set(['1', '2', '3']),
      new Map([
        ['1', '/about'],
        ['2', '/secret'],
        ['3', '/draft'],
        ['4', '/unlinked'],
      ]),
      20,
    )
    expect(pages.map((page) => page.path)).toEqual(['/about'])
  })

  it('does not let a site-admin escalate to system-admin', async () => {
    const systemUser = await payload.create({
      collection: 'users',
      data: {
        email: `foundation-${suffix}-system@zyvavu.test`,
        password,
        role: ROLE_SYSTEM_ADMIN,
      },
      overrideAccess: true,
      context: { trustedRole: true },
    })
    const siteUser = await payload.create({
      collection: 'users',
      data: {
        email: `foundation-${suffix}-site@zyvavu.test`,
        password,
        role: ROLE_SITE_ADMIN,
      },
      overrideAccess: true,
      context: { trustedRole: true },
    })

    await payload
      .update({
        collection: 'users',
        id: siteUser.id,
        data: { role: ROLE_SYSTEM_ADMIN },
        overrideAccess: false,
        user: siteUser,
      })
      .catch((error: Error) => {
        expect(error.message).toMatch(/system-admin/i)
      })

    const fresh = await payload.findByID({
      collection: 'users',
      id: siteUser.id,
      overrideAccess: true,
    })
    expect(fresh.role).toBe(ROLE_SITE_ADMIN)
    expect(systemUser.role).toBe(ROLE_SYSTEM_ADMIN)
  }, 20000)

  it('builds an offline manifest without prefetching posts', async () => {
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Offline page',
        slug: `offline-${suffix}-page`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
      overrideAccess: true,
    })
    const extra = await payload.create({
      collection: 'pages',
      data: {
        title: 'Not linked',
        slug: `offline-${suffix}-extra`,
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
      overrideAccess: true,
    })
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Offline post',
        slug: `offline-${suffix}-post`,
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'menus',
      data: {
        name: `menu-${suffix}`,
        location: 'footer',
        items: [
          { label: 'Page', link: { type: 'page', page: page.id } },
          { label: 'Post', link: { type: 'post', post: post.id } },
        ],
      },
      overrideAccess: true,
    })

    const manifest = await buildOfflineManifest(payload)
    const paths = manifest.pages.map((entry) => entry.path)
    expect(paths).toContain(`/offline-${suffix}-page`)
    expect(paths).not.toContain(`/offline-${suffix}-extra`)
    expect(paths.some((entry) => entry.startsWith('/posts/'))).toBe(false)
    expect(extra.id).toBeTruthy()
  })
})
