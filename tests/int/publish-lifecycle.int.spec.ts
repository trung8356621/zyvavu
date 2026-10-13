/**
 * @vitest-environment node
 */
import crypto from 'node:crypto'

import { getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { resolvePublicPath } from '@/lib/url/registry'

let payload: Payload
const suffix = crypto.randomBytes(4).toString('hex')
const createdPages: number[] = []
const createdPosts: number[] = []
const createdUsers: number[] = []

describe('publish lifecycle write contract', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    for (const id of createdPages) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdPosts) {
      await payload.delete({ collection: 'posts', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdUsers) {
      await payload.delete({ collection: 'users', id, overrideAccess: true }).catch(() => undefined)
    }
  })

  it('updates a published page without copying or unpublishing its draft', async () => {
    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'Published title',
        slug: `contract-${suffix}`,
        excerpt: 'published excerpt',
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)

    await payload.update({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
      data: {
        title: 'Draft title',
        slug: `contract-draft-${suffix}`,
        excerpt: 'draft excerpt',
        publicPath: `/contract-draft-path-${suffix}`,
      },
    })

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { slug: `contract-next-${suffix}`, publicPath: `/contract-path-${suffix}` },
    })

    const live = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(live._status).toBe('published')
    expect(live.title).toBe('Published title')
    expect(live.excerpt).toBe('published excerpt')
    expect(live.slug).toBe(`contract-next-${suffix}`)
    expect(live.publicPath).toBe(`/contract-path-${suffix}`)
    expect(await resolvePublicPath(payload, `/contract-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/contract-path-${suffix}`,
    })
    expect(await resolvePublicPath(payload, `/contract-path-${suffix}`)).toMatchObject({
      kind: 'canonical',
      id: page.id,
    })
    expect(await resolvePublicPath(payload, `/contract-draft-path-${suffix}`)).toBeNull()

    const versions = await payload.findVersions({
      collection: 'pages',
      where: { parent: { equals: page.id } },
      sort: '-updatedAt',
      depth: 0,
      limit: 10,
      overrideAccess: true,
    })
    expect(versions.docs[0]?.version._status).toBe('published')
    expect(versions.docs.some((version) => version.version.title === 'Draft title')).toBe(true)

    await payload.update({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
      data: { title: 'Still a draft' },
    })
    const afterDraft = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(afterDraft._status).toBe('published')
    expect(afterDraft.title).toBe('Published title')
    expect(await resolvePublicPath(payload, `/contract-path-${suffix}`)).toMatchObject({ kind: 'canonical', id: page.id })

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { visibility: 'private' },
    })
    expect(await resolvePublicPath(payload, `/contract-path-${suffix}`)).toBeNull()
    const privateDoc = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(privateDoc._status).toBe('published')
    expect(privateDoc.visibility).toBe('private')

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { visibility: 'public', _status: 'draft' },
    })
    const unpublished = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(unpublished._status).toBe('draft')
    expect(await resolvePublicPath(payload, `/contract-path-${suffix}`)).toBeNull()

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { title: 'Edited while unpublished' },
    })
    const stillDraft = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(stillDraft._status).toBe('draft')
    expect(stillDraft.title).toBe('Edited while unpublished')

    await payload.update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      data: { _status: 'published' },
    })
    const republished = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(republished._status).toBe('published')
    expect(republished.title).toBe('Edited while unpublished')
    expect(await resolvePublicPath(payload, `/contract-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/contract-path-${suffix}`,
    })
  })

  it('updates a published post without unpublishing its draft', async () => {
    const post = await payload.create({
      collection: 'posts',
      overrideAccess: true,
      data: {
        title: 'Published post',
        slug: `contract-post-${suffix}`,
        excerpt: 'published post',
        _status: 'published',
      },
    })
    createdPosts.push(post.id)
    await payload.update({
      collection: 'posts',
      id: post.id,
      draft: true,
      overrideAccess: true,
      data: { title: 'Draft post', slug: `contract-post-draft-${suffix}` },
    })
    await payload.update({
      collection: 'posts',
      id: post.id,
      overrideAccess: true,
      data: { publicPath: `/posts/contract-post-path-${suffix}` },
    })
    const live = await payload.findByID({
      collection: 'posts',
      id: post.id,
      draft: false,
      overrideAccess: true,
    })
    expect(live._status).toBe('published')
    expect(live.title).toBe('Published post')
    expect(live.slug).toBe(`contract-post-${suffix}`)
    expect(live.publicPath).toBe(`/posts/contract-post-path-${suffix}`)
    expect(await resolvePublicPath(payload, `/posts/contract-post-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/posts/contract-post-path-${suffix}`,
    })
    expect(await resolvePublicPath(payload, `/posts/contract-post-draft-${suffix}`)).toBeNull()
  })

  it('applies the same partial update through the REST API', async () => {
    const password = crypto.randomBytes(18).toString('hex')
    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `contract-${suffix}@zyvavu.test`,
        password,
        role: 'site-admin',
      },
    })
    createdUsers.push(user.id)
    const session = await payload.login({
      collection: 'users',
      data: { email: user.email, password },
    })

    const page = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: 'REST published',
        slug: `contract-rest-${suffix}`,
        excerpt: 'rest published',
        visibility: 'public',
        presentation: 'shared',
        _status: 'published',
      },
    })
    createdPages.push(page.id)
    await payload.update({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
      data: { title: 'REST draft', slug: `contract-rest-draft-${suffix}`, excerpt: 'rest draft' },
    })

    const response = await handleEndpoints({
      config,
      request: new Request(`http://zyvavu.test/api/pages/${page.id}`, {
        method: 'PATCH',
        headers: {
          authorization: `JWT ${session.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ slug: `contract-rest-next-${suffix}` }),
      }),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { doc: { _status: string; title: string; slug: string; excerpt: string } }
    expect(body.doc._status).toBe('published')
    expect(body.doc.title).toBe('REST published')
    expect(body.doc.excerpt).toBe('rest published')
    expect(body.doc.slug).toBe(`contract-rest-next-${suffix}`)

    const live = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
    })
    expect(live._status).toBe('published')
    expect(live.title).toBe('REST published')
    expect(await resolvePublicPath(payload, `/contract-rest-${suffix}`)).toEqual({
      kind: 'redirect',
      target: `/contract-rest-next-${suffix}`,
    })
    expect(await resolvePublicPath(payload, `/contract-rest-next-${suffix}`)).toMatchObject({
      kind: 'canonical',
      id: page.id,
    })
  })
})
