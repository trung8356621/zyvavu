/**
 * @vitest-environment node
 */
import crypto from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { renderToStaticMarkup } from 'react-dom/server'
import { PublicDocument } from '@/components/frontend/PublicDocument'
import {
  DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  DEFAULT_TAG_PERMALINK_STRUCTURE,
  normalizePermalinkPattern,
  resolveEstablishedOrPattern,
  resolvePostPath,
  validatePermalinkPattern,
} from '@/lib/permalinks'
import { getCanonicalPath, inspectAndRepairUrlRegistry, resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'

let payload: Payload
const suffix = crypto.randomBytes(4).toString('hex')
const createdPages: number[] = []
const createdPosts: number[] = []
const createdCategories: number[] = []
const createdTags: number[] = []

describe('permalinks & URL routing contract', () => {
  let originalStructure = DEFAULT_POST_PERMALINK_STRUCTURE
  let originalCategoryStructure = DEFAULT_CATEGORY_PERMALINK_STRUCTURE
  let originalTagStructure = DEFAULT_TAG_PERMALINK_STRUCTURE
  let originalThemeId = 'corporate'

  beforeAll(async () => {
    payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    if (settings?.postPermalinkStructure) {
      originalStructure = settings.postPermalinkStructure as string
    }
    if (settings?.categoryPermalinkStructure) {
      originalCategoryStructure = settings.categoryPermalinkStructure as string
    }
    if (settings?.tagPermalinkStructure) {
      originalTagStructure = settings.tagPermalinkStructure as string
    }
    if (settings?.activeThemeId) {
      originalThemeId = settings.activeThemeId as string
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
    for (const id of createdCategories) {
      await payload.delete({ collection: 'categories', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdTags) {
      await payload.delete({ collection: 'tags', id, overrideAccess: true }).catch(() => undefined)
    }

    // Restore original settings
    await payload.updateGlobal({
      slug: 'settings',
      overrideAccess: true,
      data: {
        postPermalinkStructure: originalStructure,
        categoryPermalinkStructure: originalCategoryStructure,
        tagPermalinkStructure: originalTagStructure,
        activeThemeId: originalThemeId,
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

    it('updates canonical URL and creates redirect when slug is renamed in a draft first and then published', async () => {
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: { postPermalinkStructure: '/%postname%.html' },
      })

      const post = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Draft Rename Post ${suffix}`,
          slug: `draft-orig-${suffix}`,
          _status: 'published',
        },
      })
      createdPosts.push(post.id)
      expect((post as any).canonicalPath).toBe(`/draft-orig-${suffix}.html`)

      // Step 1: Save draft with new slug
      await payload.update({
        collection: 'posts',
        id: post.id,
        draft: true,
        overrideAccess: true,
        data: {
          slug: `draft-renamed-${suffix}`,
        },
      })

      // Live canonical stays on old slug while draft is unpublished
      expect(await resolvePublicPath(payload, `/draft-orig-${suffix}.html`)).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })
      expect(await resolvePublicPath(payload, `/draft-renamed-${suffix}.html`)).toBeNull()

      // Step 2: Publish the draft without changing slug again
      const published = await payload.update({
        collection: 'posts',
        id: post.id,
        overrideAccess: true,
        data: {
          slug: `draft-renamed-${suffix}`,
          _status: 'published',
        },
      })
      expect((published as any).canonicalPath).toBe(`/draft-renamed-${suffix}.html`)

      expect(await resolvePublicPath(payload, `/draft-renamed-${suffix}.html`)).toEqual({
        kind: 'canonical',
        resourceType: 'post',
        id: post.id,
      })
      expect(await resolvePublicPath(payload, `/draft-orig-${suffix}.html`)).toEqual({
        kind: 'redirect',
        target: `/draft-renamed-${suffix}.html`,
      })
    })

    it('synchronizes Category and Tag routes across create, rename, custom structure, collision, and delete', async () => {
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: {
          categoryPermalinkStructure: DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
          tagPermalinkStructure: DEFAULT_TAG_PERMALINK_STRUCTURE,
        },
      })

      const category = await payload.create({
        collection: 'categories',
        overrideAccess: true,
        data: {
          title: `Category ${suffix}`,
          slug: `cat-${suffix}`,
        },
      })
      createdCategories.push(category.id)
      expect((category as any).canonicalPath).toBe(`/category/cat-${suffix}`)
      expect(await resolvePublicPath(payload, `/category/cat-${suffix}`)).toEqual({
        kind: 'canonical',
        resourceType: 'category',
        id: category.id,
      })

      const tag = await payload.create({
        collection: 'tags',
        overrideAccess: true,
        data: {
          title: `Tag ${suffix}`,
          slug: `tag-${suffix}`,
        },
      })
      createdTags.push(tag.id)
      expect((tag as any).canonicalPath).toBe(`/tag/tag-${suffix}`)
      expect(await resolvePublicPath(payload, `/tag/tag-${suffix}`)).toEqual({
        kind: 'canonical',
        resourceType: 'tag',
        id: tag.id,
      })

      // Rename Category slug -> updates canonical and creates redirect
      await payload.update({
        collection: 'categories',
        id: category.id,
        overrideAccess: true,
        data: { slug: `cat-renamed-${suffix}` },
      })
      expect(await resolvePublicPath(payload, `/category/cat-renamed-${suffix}`)).toEqual({
        kind: 'canonical',
        resourceType: 'category',
        id: category.id,
      })
      expect(await resolvePublicPath(payload, `/category/cat-${suffix}`)).toEqual({
        kind: 'redirect',
        target: `/category/cat-renamed-${suffix}`,
      })

      // Rename Tag slug -> updates canonical and creates redirect
      await payload.update({
        collection: 'tags',
        id: tag.id,
        overrideAccess: true,
        data: { slug: `tag-renamed-${suffix}` },
      })
      expect(await resolvePublicPath(payload, `/tag/tag-renamed-${suffix}`)).toEqual({
        kind: 'canonical',
        resourceType: 'tag',
        id: tag.id,
      })
      expect(await resolvePublicPath(payload, `/tag/tag-${suffix}`)).toEqual({
        kind: 'redirect',
        target: `/tag/tag-renamed-${suffix}`,
      })

      // Custom configured category & tag patterns apply to newly created taxonomies
      await payload.updateGlobal({
        slug: 'settings',
        overrideAccess: true,
        data: {
          categoryPermalinkStructure: '/chuyen-muc/%term%',
          tagPermalinkStructure: '/the/%term%',
        },
      })

      const customCat = await payload.create({
        collection: 'categories',
        overrideAccess: true,
        data: {
          title: `Custom Cat ${suffix}`,
          slug: `custom-cat-${suffix}`,
        },
      })
      createdCategories.push(customCat.id)
      expect(await resolvePublicPath(payload, `/chuyen-muc/custom-cat-${suffix}`)).toEqual({
        kind: 'canonical',
        resourceType: 'category',
        id: customCat.id,
      })

      // Collision between Page publicPath and Category canonical path is rejected
      await expect(
        payload.create({
          collection: 'pages',
          overrideAccess: true,
          data: {
            title: `Clash with Cat ${suffix}`,
            slug: `clash-cat-page-${suffix}`,
            publicPath: `/category/cat-renamed-${suffix}`,
            visibility: 'public',
            presentation: 'shared',
            _status: 'published',
          },
        }),
      ).rejects.toThrow(/already in use/i)

      // Deleting customCat removes its canonical route
      await payload.delete({
        collection: 'categories',
        id: customCat.id,
        overrideAccess: true,
      })
      createdCategories.splice(createdCategories.indexOf(customCat.id), 1)
      expect(await resolvePublicPath(payload, `/chuyen-muc/custom-cat-${suffix}`)).toBeNull()
    })

    it('renders Category and Tag public archives via PublicDocument across themes and repairs missing canonicals safely', async () => {
      const cat = await payload.create({
        collection: 'categories',
        overrideAccess: true,
        data: {
          title: `Archive Cat ${suffix}`,
          slug: `arch-cat-${suffix}`,
        },
      })
      createdCategories.push(cat.id)

      const emptyTag = await payload.create({
        collection: 'tags',
        overrideAccess: true,
        data: {
          title: `Empty Tag ${suffix}`,
          slug: `empty-tag-${suffix}`,
        },
      })
      createdTags.push(emptyTag.id)

      const assignedTag = await payload.create({
        collection: 'tags',
        overrideAccess: true,
        data: {
          title: `Assigned Tag ${suffix}`,
          slug: `assigned-tag-${suffix}`,
        },
      })
      createdTags.push(assignedTag.id)

      const publishedPost = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Archive Post Published ${suffix}`,
          slug: `arch-post-pub-${suffix}`,
          categories: [cat.id],
          tags: [assignedTag.id],
          _status: 'published',
        },
      })
      createdPosts.push(publishedPost.id)

      const draftPost = await payload.create({
        collection: 'posts',
        overrideAccess: true,
        data: {
          title: `Archive Post Draft ${suffix}`,
          slug: `arch-post-draft-${suffix}`,
          categories: [cat.id],
          tags: [assignedTag.id],
          _status: 'draft',
        },
      })
      createdPosts.push(draftPost.id)

      const catPath = (await getCanonicalPath(payload, 'category', cat.id)) as string
      const assignedTagPath = (await getCanonicalPath(payload, 'tag', assignedTag.id)) as string
      const emptyTagPath = (await getCanonicalPath(payload, 'tag', emptyTag.id)) as string
      const pubPostPath = (await getCanonicalPath(payload, 'post', publishedPost.id)) as string

      // Render Category archive: contains published post, excludes draft post, links to canonical post path
      const catElement = await PublicDocument({ path: catPath })
      const catHtml = renderToStaticMarkup(catElement as any)
      expect(catHtml).toContain(`Archive Cat ${suffix}`)
      expect(catHtml).toContain(`Archive Post Published ${suffix}`)
      expect(catHtml).not.toContain(`Archive Post Draft ${suffix}`)
      expect(catHtml).toContain(pubPostPath)

      // Render Tag archive: adapts heading to distinguish Tag vs Category, contains published post
      const tagElement = await PublicDocument({ path: assignedTagPath })
      const tagHtml = renderToStaticMarkup(tagElement as any)
      expect(tagHtml).toContain(`Assigned Tag ${suffix}`)
      expect(tagHtml).toContain('Thẻ')
      expect(tagHtml).toContain(`Archive Post Published ${suffix}`)
      expect(tagHtml).not.toContain(`Archive Post Draft ${suffix}`)

      // Render Empty Tag archive: displays empty state
      const emptyTagElement = await PublicDocument({ path: emptyTagPath })
      const emptyTagHtml = renderToStaticMarkup(emptyTagElement as any)
      expect(emptyTagHtml).toContain(`Empty Tag ${suffix}`)
      expect(emptyTagHtml).toContain('Chưa có bài viết nào')

      // Switching active theme does not change routing resolution
      for (const themeId of ['corporate', 'industrial', 'editorial']) {
        await payload.updateGlobal({
          slug: 'settings',
          overrideAccess: true,
          data: { activeThemeId: themeId },
        })
        expect(await resolvePublicPath(payload, catPath)).toEqual({
          kind: 'canonical',
          resourceType: 'category',
          id: cat.id,
        })
        expect(await resolvePublicPath(payload, assignedTagPath)).toEqual({
          kind: 'canonical',
          resourceType: 'tag',
          id: assignedTag.id,
        })
      }

      // Simulate a missing canonical record and verify bounded idempotent repair
      const routesToDelete = await payload.find({
        collection: 'url-registry',
        where: {
          and: [
            { recordRole: { equals: 'canonical' } },
            { tag: { equals: emptyTag.id } },
          ],
        },
        overrideAccess: true,
      })
      for (const r of routesToDelete.docs) {
        await payload.delete({ collection: 'url-registry', id: r.id, overrideAccess: true })
      }
      expect(await resolvePublicPath(payload, emptyTagPath)).toBeNull()

      const dryReport = await inspectAndRepairUrlRegistry(payload, { dryRun: true })
      expect(dryReport.discrepancies.some((d) => d.resourceType === 'tag' && d.id === emptyTag.id)).toBe(true)

      const repairReport = await inspectAndRepairUrlRegistry(payload, { dryRun: false })
      expect(repairReport.repaired.some((d) => d.resourceType === 'tag' && d.id === emptyTag.id)).toBe(true)
      expect(await resolvePublicPath(payload, emptyTagPath)).toEqual({
        kind: 'canonical',
        resourceType: 'tag',
        id: emptyTag.id,
      })
    })
  })
})
