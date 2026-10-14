/**
 * @vitest-environment node
 */
import crypto from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  DEFAULT_POST_PERMALINK_STRUCTURE,
  normalizePermalinkPattern,
  resolveEstablishedOrPattern,
  resolvePostPath,
  validatePermalinkPattern,
} from '@/lib/permalinks'
import { resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'

let payload: Payload
const suffix = crypto.randomBytes(4).toString('hex')
const createdPages: number[] = []
const createdPosts: number[] = []

describe('permalinks & URL routing contract', () => {
  let originalStructure = DEFAULT_POST_PERMALINK_STRUCTURE

  beforeAll(async () => {
    payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    if (settings?.postPermalinkStructure) {
      originalStructure = settings.postPermalinkStructure as string
    }
  })

  afterAll(async () => {
    // Clean up created resources
    for (const id of createdPosts) {
      await payload.delete({ collection: 'posts', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdPages) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => undefined)
    }

    // Restore original settings
    await payload.updateGlobal({
      slug: 'settings',
      overrideAccess: true,
      data: {
        postPermalinkStructure: originalStructure,
      },
    }).catch(() => undefined)
  })

  describe('pure pattern validation & resolution', () => {
    it('validates supported patterns and rejects missing tokens', () => {
      expect(validatePermalinkPattern('/%postname%.html')).toBeNull()
      expect(validatePermalinkPattern('/posts/%postname%')).toBeNull()
      expect(validatePermalinkPattern('/tin-tuc/%postname%.html')).toBeNull()
      expect(validatePermalinkPattern('/%postname%')).toBeNull()

      expect(validatePermalinkPattern('/posts/sample')).toContain('must include the %postname% token')
      expect(validatePermalinkPattern('')).toContain('required')
    })

    it('rejects unsupported dynamic tokens with clear explanation', () => {
      expect(validatePermalinkPattern('/%category%/%postname%')).toContain("The token '%category%' is not supported")
      expect(validatePermalinkPattern('/%year%/%monthnum%/%postname%')).toContain("The token '%year%' is not supported")
      expect(validatePermalinkPattern('/%post_id%/%postname%')).toContain("The token '%post_id%' is not supported")
      expect(validatePermalinkPattern('/archives/%post_id%')).toContain("The token '%post_id%' is not supported")
      expect(validatePermalinkPattern('/%author%/%postname%')).toContain("The token '%author%' is not supported")
    })

    it('rejects malformed patterns and duplicate separators', () => {
      expect(validatePermalinkPattern('//posts/%postname%')).toContain('duplicate slashes')
      expect(validatePermalinkPattern('/posts//%postname%.html')).toContain('duplicate slashes')
      expect(validatePermalinkPattern('/%postname')).toContain('unmatched % token separator')
      expect(validatePermalinkPattern('/%postname%?ref=test')).toContain('invalid characters')
      expect(validatePermalinkPattern('/../%postname%')).toContain('relative path navigation')
    })

    it('rejects reserved system path patterns', () => {
      expect(validatePermalinkPattern('/admin/%postname%')).toContain('reserved system path')
      expect(validatePermalinkPattern('/api/%postname%')).toContain('reserved system path')
      expect(validatePermalinkPattern('/_next/%postname%')).toContain('reserved system path')
    })

    it('resolves post paths correctly', () => {
      expect(resolvePostPath('/%postname%.html', 'sample-post')).toBe('/sample-post.html')
      expect(resolvePostPath('/posts/%postname%', 'sample-post')).toBe('/posts/sample-post')
      expect(resolvePostPath('/tin-tuc/%postname%.html', 'sample-post')).toBe('/tin-tuc/sample-post.html')
      expect(resolvePostPath('/%postname%', 'sample-post')).toBe('/sample-post')
    })

    it('preserves established pattern when renaming slug', () => {
      // From /posts/old -> /posts/new
      expect(resolveEstablishedOrPattern('/posts/old-slug', 'old-slug', 'new-slug', '/%postname%.html')).toBe('/posts/new-slug')
      // From /old.html -> /new.html
      expect(resolveEstablishedOrPattern('/old-slug.html', 'old-slug', 'new-slug', '/posts/%postname%')).toBe('/new-slug.html')
      // From /tin-tuc/old.html -> /tin-tuc/new.html
      expect(resolveEstablishedOrPattern('/tin-tuc/old-slug.html', 'old-slug', 'new-slug', '/%postname%.html')).toBe('/tin-tuc/new-slug.html')
    })
  })

  describe('database & lifecycle integration', () => {
    it('creates new Post with .html extension under default structure', async () => {
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: { postPermalinkStructure: '/%postname%.html' },
      })

      const post = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Post HTML ${suffix}`,
          slug: `post-html-${suffix}`,
          _status: 'published',
        },
      })
      createdPosts.push(post.id)

      const resolved = await resolvePublicPath(payload, `/post-html-${suffix}.html`)
      expect(resolved).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })

      // The unextended path should NOT resolve
      const unextended = await resolvePublicPath(payload, `/post-html-${suffix}`)
      expect(unextended).toBeNull()
    })

    it('creates new Page without extension (Pages must not inherit .html)', async () => {
      const page = await payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: `Page Flat ${suffix}`,
          slug: `page-flat-${suffix}`,
          visibility: 'public',
          presentation: 'shared',
          _status: 'published',
        },
      })
      createdPages.push(page.id)

      const resolved = await resolvePublicPath(payload, `/page-flat-${suffix}`)
      expect(resolved).toEqual({
        kind: 'canonical',
        resourceType: 'page',
        id: page.id,
      })

      // Pages must NOT resolve with .html extension
      const withExt = await resolvePublicPath(payload, `/page-flat-${suffix}.html`)
      expect(withExt).toBeNull()
    })

    it('creates Post with custom fixed-prefix pattern', async () => {
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: { postPermalinkStructure: '/tin-tuc/%postname%.html' },
      })

      const post = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Prefix Post ${suffix}`,
          slug: `prefix-post-${suffix}`,
          _status: 'published',
        },
      })
      createdPosts.push(post.id)

      const resolved = await resolvePublicPath(payload, `/tin-tuc/prefix-post-${suffix}.html`)
      expect(resolved).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })
    })

    it('preserves existing /posts/old-slug canonical URL during normal edits and republishing', async () => {
      // 1. Create a post with explicit /posts/ URL
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: { postPermalinkStructure: '/posts/%postname%' },
      })

      const post = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Legacy Post ${suffix}`,
          slug: `legacy-post-${suffix}`,
          _status: 'published',
        },
      })
      createdPosts.push(post.id)

      const initialPath = `/posts/legacy-post-${suffix}`
      expect(await resolvePublicPath(payload, initialPath)).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })

      // 2. Perform an ordinary edit (change title, save and republish)
      await payload.update({
        collection: 'posts',
        id: post.id,
        overrideAccess: true,
        data: {
          title: `Legacy Post Updated ${suffix}`,
          _status: 'published',
        },
      })

      // Canonical URL MUST remain unchanged
      expect(await resolvePublicPath(payload, initialPath)).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })
    })

    it('preserves existing Post canonical URL even when site default changes', async () => {
      // A post exists at /posts/keep-post-...
      const post = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Keep Post ${suffix}`,
          slug: `keep-post-${suffix}`,
          publicPath: `/posts/keep-post-${suffix}`,
          _status: 'published',
        },
      })
      createdPosts.push(post.id)

      // Change site default to .html
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: { postPermalinkStructure: '/%postname%.html' },
      })

      // Edit post content without changing slug
      await payload.update({
        collection: 'posts',
        id: post.id,
        overrideAccess: true,
        data: {
          excerpt: 'Updated excerpt',
          _status: 'published',
        },
      })

      // Existing URL MUST remain /posts/keep-post-... and NOT be migrated to .html
      expect(await resolvePublicPath(payload, `/posts/keep-post-${suffix}`)).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })
      expect(await resolvePublicPath(payload, `/keep-post-${suffix}.html`)).toBeNull()
    })

    it('handles explicit slug rename and generates safe redirect preserving pattern', async () => {
      // Create post at /posts/original-...
      const post = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Original Slug Post ${suffix}`,
          slug: `orig-slug-${suffix}`,
          publicPath: `/posts/orig-slug-${suffix}`,
          _status: 'published',
        },
      })
      createdPosts.push(post.id)

      // Rename slug to renamed-slug-...
      await payload.update({
        collection: 'posts',
        id: post.id,
        overrideAccess: true,
        data: {
          slug: `renamed-slug-${suffix}`,
          publicPath: null, // clear publicPath so it derives from established pattern
          _status: 'published',
        },
      })

      // Canonical URL should follow established /posts/ prefix
      const newPath = `/posts/renamed-slug-${suffix}`
      expect(await resolvePublicPath(payload, newPath)).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })

      // Old URL should redirect to the new canonical URL
      const oldPath = `/posts/orig-slug-${suffix}`
      expect(await resolvePublicPath(payload, oldPath)).toEqual({
        kind: 'redirect',
        target: newPath,
      })
    })

    it('rejects URL collision with an existing Page', async () => {
      const page = await payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: `Collision Target ${suffix}`,
          slug: `clash-${suffix}`,
          visibility: 'public',
          presentation: 'shared',
          _status: 'published',
        },
      })
      createdPages.push(page.id)

      // Attempt to publish a post whose path collides with /clash-${suffix}
      await expect(
        payload.create({
          collection: 'posts',
          overrideAccess: true,
          data: {
            title: `Colliding Post ${suffix}`,
            slug: `clash-${suffix}`,
            publicPath: `/clash-${suffix}`,
            _status: 'published',
          },
        }),
      ).rejects.toThrow(/already in use/i)
    })

    it('rejects reserved system paths', async () => {
      await expect(
        payload.create({
          collection: 'posts',
          overrideAccess: true,
          data: {
            title: `Reserved Post ${suffix}`,
            slug: `reserved-post-${suffix}`,
            publicPath: '/admin/settings',
            _status: 'published',
          },
        }),
      ).rejects.toThrow(/reserved/i)
    })
  })
})
