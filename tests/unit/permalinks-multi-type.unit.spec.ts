/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  DEFAULT_TAG_PERMALINK_STRUCTURE,
  extractPatternWithOldSlug,
  extractSlugAndPattern,
  HOMEPAGE_PATH,
  insertTokenAtCursor,
  normalizePermalinkPattern,
  PermalinkResourceType,
  RESOURCE_CONFIGS,
  resolveCategoryPath,
  resolveEstablishedOrPattern,
  resolvePagePath,
  resolvePostPath,
  resolveResourcePath,
  resolveTagPath,
  validatePermalinkPattern,
} from '@/lib/permalinks'
import { isReservedPath, normalizePath } from '@/lib/url/normalize'
import { canonicalPathFor } from '@/lib/url/paths'

describe('Multi-Type Permalinks Pure Contract & Validation', () => {
  describe('1. Resource type → configuration field mapping & metadata', () => {
    it('maps posts to postPermalinkStructure with %postname% token', () => {
      const cfg = RESOURCE_CONFIGS.posts
      expect(cfg.field).toBe('postPermalinkStructure')
      expect(cfg.token).toBe('%postname%')
      expect(cfg.supportedTokens).toEqual(['%postname%'])
      expect(cfg.defaultStructure).toBe(DEFAULT_POST_PERMALINK_STRUCTURE)
      expect(cfg.isFunctional).toBe(true)
    })

    it('maps pages to pagePermalinkStructure with %slug% token', () => {
      const cfg = RESOURCE_CONFIGS.pages
      expect(cfg.field).toBe('pagePermalinkStructure')
      expect(cfg.token).toBe('%slug%')
      expect(cfg.supportedTokens).toEqual(['%slug%'])
      expect(cfg.defaultStructure).toBe(DEFAULT_PAGE_PERMALINK_STRUCTURE)
      expect(cfg.isFunctional).toBe(true)
    })

    it('maps categories to categoryPermalinkStructure with %term% token (pending routing)', () => {
      const cfg = RESOURCE_CONFIGS.categories
      expect(cfg.field).toBe('categoryPermalinkStructure')
      expect(cfg.token).toBe('%term%')
      expect(cfg.supportedTokens).toEqual(['%term%'])
      expect(cfg.defaultStructure).toBe(DEFAULT_CATEGORY_PERMALINK_STRUCTURE)
      expect(cfg.isFunctional).toBe(false)
      expect(cfg.statusNote).toContain('pending backend implementation')
    })

    it('maps tags to tagPermalinkStructure with %term% token (pending routing)', () => {
      const cfg = RESOURCE_CONFIGS.tags
      expect(cfg.field).toBe('tagPermalinkStructure')
      expect(cfg.token).toBe('%term%')
      expect(cfg.supportedTokens).toEqual(['%term%'])
      expect(cfg.defaultStructure).toBe(DEFAULT_TAG_PERMALINK_STRUCTURE)
      expect(cfg.isFunctional).toBe(false)
      expect(cfg.statusNote).toContain('pending backend implementation')
    })
  })

  describe('2. Pattern validation per resource type', () => {
    describe('Posts pattern validation (%postname%)', () => {
      it('accepts valid post structures', () => {
        expect(validatePermalinkPattern('/%postname%.html', 'posts')).toBeNull()
        expect(validatePermalinkPattern('/posts/%postname%', 'posts')).toBeNull()
        expect(validatePermalinkPattern('/%postname%', 'posts')).toBeNull()
        expect(validatePermalinkPattern('/tin-tuc/%postname%.html', 'posts')).toBeNull()
      })

      it('rejects post patterns without %postname%', () => {
        expect(validatePermalinkPattern('/posts/sample', 'posts')).toContain('must include the %postname% token')
        expect(validatePermalinkPattern('/%slug%', 'posts')).toContain("The token '%slug%' is not supported")
        expect(validatePermalinkPattern('/%term%', 'posts')).toContain("The token '%term%' is not supported")
      })

      it('rejects unsupported legacy WordPress tokens for posts', () => {
        expect(validatePermalinkPattern('/%category%/%postname%', 'posts')).toContain("The token '%category%' is not supported")
        expect(validatePermalinkPattern('/%year%/%monthnum%/%postname%', 'posts')).toContain("The token '%year%' is not supported")
        expect(validatePermalinkPattern('/%post_id%/%postname%', 'posts')).toContain("The token '%post_id%' is not supported")
        expect(validatePermalinkPattern('/%author%/%postname%', 'posts')).toContain("The token '%author%' is not supported")
      })
    })

    describe('Pages pattern validation (%slug%)', () => {
      it('accepts valid page structures', () => {
        expect(validatePermalinkPattern('/%slug%', 'pages')).toBeNull()
        expect(validatePermalinkPattern('/pages/%slug%', 'pages')).toBeNull()
        expect(validatePermalinkPattern('/p/%slug%', 'pages')).toBeNull()
      })

      it('rejects page patterns without %slug%', () => {
        expect(validatePermalinkPattern('/pages/sample', 'pages')).toContain('must include the %slug% token')
        expect(validatePermalinkPattern('/%postname%', 'pages')).toContain("The token '%postname%' is not supported")
        expect(validatePermalinkPattern('/%term%', 'pages')).toContain("The token '%term%' is not supported")
      })

      it('rejects unsupported tokens for pages', () => {
        expect(validatePermalinkPattern('/%year%/%slug%', 'pages')).toContain("The token '%year%' is not supported")
        expect(validatePermalinkPattern('/%category%/%slug%', 'pages')).toContain("The token '%category%' is not supported")
      })
    })

    describe('Taxonomies pattern validation (%term%)', () => {
      it('accepts valid category structures', () => {
        expect(validatePermalinkPattern('/category/%term%', 'categories')).toBeNull()
        expect(validatePermalinkPattern('/chuyen-muc/%term%', 'categories')).toBeNull()
        expect(validatePermalinkPattern('/c/%term%', 'categories')).toBeNull()
      })

      it('accepts valid tag structures', () => {
        expect(validatePermalinkPattern('/tag/%term%', 'tags')).toBeNull()
        expect(validatePermalinkPattern('/the/%term%', 'tags')).toBeNull()
        expect(validatePermalinkPattern('/t/%term%', 'tags')).toBeNull()
      })

      it('rejects taxonomy patterns without %term%', () => {
        expect(validatePermalinkPattern('/category/all', 'categories')).toContain('must include the %term% token')
        expect(validatePermalinkPattern('/tag/all', 'tags')).toContain('must include the %term% token')
        expect(validatePermalinkPattern('/%postname%', 'categories')).toContain("The token '%postname%' is not supported")
        expect(validatePermalinkPattern('/%slug%', 'tags')).toContain("The token '%slug%' is not supported")
      })
    })

    describe('Universal syntax and traversal validation', () => {
      const resources: PermalinkResourceType[] = ['posts', 'pages', 'categories', 'tags']

      resources.forEach((resource) => {
        const token = RESOURCE_CONFIGS[resource].token

        it(`rejects duplicate slashes for ${resource}`, () => {
          expect(validatePermalinkPattern(`//base/${token}`, resource)).toContain('duplicate slashes')
        })

        it(`rejects relative navigation for ${resource}`, () => {
          expect(validatePermalinkPattern(`/../${token}`, resource)).toContain('relative path navigation')
          expect(validatePermalinkPattern(`/base/./${token}`, resource)).toContain('relative path navigation')
        })

        it(`rejects invalid URL characters for ${resource}`, () => {
          expect(validatePermalinkPattern(`/${token}?ref=1`, resource)).toContain('invalid characters')
          expect(validatePermalinkPattern(`/${token}#section`, resource)).toContain('invalid characters')
          expect(validatePermalinkPattern(`/${token}\\sub`, resource)).toContain('invalid characters')
          expect(validatePermalinkPattern(`/${token} with spaces`, resource)).toContain('invalid characters')
        })

        it(`rejects unmatched % tokens for ${resource}`, () => {
          expect(validatePermalinkPattern(`/${token}%invalid`, resource)).toContain('unmatched % token separator')
        })

        it(`rejects reserved system path prefixes for ${resource}`, () => {
          expect(validatePermalinkPattern(`/admin/${token}`, resource)).toContain('reserved system path')
          expect(validatePermalinkPattern(`/api/${token}`, resource)).toContain('reserved system path')
          expect(validatePermalinkPattern(`/_next/${token}`, resource)).toContain('reserved system path')
        })
      })
    })
  })

  describe('3. Custom token insertion helper', () => {
    it('inserts token into empty string', () => {
      const res = insertTokenAtCursor('', '%postname%', 0, 0)
      expect(res.newText).toBe('%postname%')
      expect(res.newCursorPos).toBe(10)
    })

    it('inserts token at cursor position in existing string', () => {
      const res = insertTokenAtCursor('/news/', '%postname%', 6, 6)
      expect(res.newText).toBe('/news/%postname%')
      expect(res.newCursorPos).toBe(16)
    })

    it('replaces selected text with token', () => {
      const res = insertTokenAtCursor('/news/PLACEHOLDER.html', '%postname%', 6, 17)
      expect(res.newText).toBe('/news/%postname%.html')
      expect(res.newCursorPos).toBe(16)
    })

    it('appends token if no cursor selection provided', () => {
      const res = insertTokenAtCursor('/blog/', '%slug%')
      expect(res.newText).toBe('/blog/%slug%')
      expect(res.newCursorPos).toBe(12)
    })
  })

  describe('4. Independent settings values & defaults', () => {
    it('maintains distinct default structures across resources', () => {
      expect(DEFAULT_POST_PERMALINK_STRUCTURE).toBe('/%postname%.html')
      expect(DEFAULT_PAGE_PERMALINK_STRUCTURE).toBe('/%slug%')
      expect(DEFAULT_CATEGORY_PERMALINK_STRUCTURE).toBe('/category/%term%')
      expect(DEFAULT_TAG_PERMALINK_STRUCTURE).toBe('/tag/%term%')
      expect(HOMEPAGE_PATH).toBe('/')
    })

    it('normalizes preset shortcuts to their full patterns per resource', () => {
      expect(normalizePermalinkPattern('posts', 'posts')).toBe('/posts/%postname%')
      expect(normalizePermalinkPattern('flat', 'posts')).toBe('/%postname%')
      expect(normalizePermalinkPattern('postname-html', 'posts')).toBe('/%postname%.html')

      expect(normalizePermalinkPattern('slug', 'pages')).toBe('/%slug%')
      expect(normalizePermalinkPattern('pages', 'pages')).toBe('/pages/%slug%')

      expect(normalizePermalinkPattern('category', 'categories')).toBe('/category/%term%')
      expect(normalizePermalinkPattern('tag', 'tags')).toBe('/tag/%term%')
    })
  })

  describe('5. Live URL preview & path resolution', () => {
    it('resolves post sample URLs accurately', () => {
      expect(resolvePostPath('/%postname%.html', 'sample-post')).toBe('/sample-post.html')
      expect(resolvePostPath('/posts/%postname%', 'sample-post')).toBe('/posts/sample-post')
      expect(resolveResourcePath('/tin-tuc/%postname%.html', 'sample-post', 'posts')).toBe('/tin-tuc/sample-post.html')
    })

    it('resolves page sample URLs and strictly preserves homepage at /', () => {
      expect(resolvePagePath('/%slug%', 'sample-page')).toBe('/sample-page')
      expect(resolvePagePath('/pages/%slug%', 'about-us')).toBe('/pages/about-us')
      // Homepage MUST always resolve to / regardless of custom pattern
      expect(resolvePagePath('/%slug%', 'home')).toBe('/')
      expect(resolvePagePath('/pages/%slug%', 'home')).toBe('/')
      expect(resolveResourcePath('/any/prefix/%slug%', 'home', 'pages')).toBe('/')
    })

    it('resolves category and tag sample URLs', () => {
      expect(resolveCategoryPath('/category/%term%', 'technology')).toBe('/category/technology')
      expect(resolveCategoryPath('/chuyen-muc/%term%', 'tin-tuc')).toBe('/chuyen-muc/tin-tuc')
      expect(resolveTagPath('/tag/%term%', 'featured')).toBe('/tag/featured')
      expect(resolveTagPath('/the/%term%', 'noi-bat')).toBe('/the/noi-bat')
    })

    it('canonicalPathFor correctly handles pages and posts with structures', () => {
      expect(canonicalPathFor('page', 'about')).toBe('/about')
      expect(canonicalPathFor('page', 'home')).toBe('/')
      expect(canonicalPathFor('page', 'about', null, null, '/pages/%slug%')).toBe('/pages/about')
      expect(canonicalPathFor('page', 'home', null, null, '/pages/%slug%')).toBe('/')
      expect(canonicalPathFor('post', 'my-post', null, '/posts/%postname%')).toBe('/posts/my-post')
      expect(canonicalPathFor('post', 'my-post', null, '/%postname%.html')).toBe('/my-post.html')
      // Explicit publicPath always wins
      expect(canonicalPathFor('post', 'my-post', '/custom/override', '/%postname%.html')).toBe('/custom/override')
    })
  })

  describe('6. Existing URL preservation & pattern resolution', () => {
    it('preserves established post pattern when renaming slug', () => {
      expect(resolveEstablishedOrPattern('/posts/old-post', 'old-post', 'new-post', '/%postname%.html', 'posts')).toBe('/posts/new-post')
      expect(resolveEstablishedOrPattern('/old-post.html', 'old-post', 'new-post', '/posts/%postname%', 'posts')).toBe('/new-post.html')
      expect(resolveEstablishedOrPattern('/tin-tuc/old.html', 'old', 'new', '/%postname%.html', 'posts')).toBe('/tin-tuc/new.html')
    })

    it('preserves established page pattern when renaming slug', () => {
      expect(resolveEstablishedOrPattern('/pages/old-page', 'old-page', 'new-page', '/%slug%', 'pages')).toBe('/pages/new-page')
      expect(resolveEstablishedOrPattern('/old-page', 'old-page', 'new-page', '/pages/%slug%', 'pages')).toBe('/new-page')
      expect(resolveEstablishedOrPattern('/company/old', 'old', 'new', '/%slug%', 'pages')).toBe('/company/new')
    })

    it('extractSlugAndPattern extracts pattern with token accurately', () => {
      expect(extractSlugAndPattern('/posts/hello-world', '%postname%')).toEqual({
        slug: 'hello-world',
        pattern: '/posts/%postname%',
      })
      expect(extractSlugAndPattern('/hello-world.html', '%postname%')).toEqual({
        slug: 'hello-world',
        pattern: '/%postname%.html',
      })
      expect(extractSlugAndPattern('/pages/about', '%slug%')).toEqual({
        slug: 'about',
        pattern: '/pages/%slug%',
      })
      expect(extractSlugAndPattern('/about', '%slug%')).toEqual({
        slug: 'about',
        pattern: '/%slug%',
      })
    })

    it('extractPatternWithOldSlug extracts established pattern accurately', () => {
      expect(extractPatternWithOldSlug('/posts/my-old-post', 'my-old-post', '%postname%')).toBe('/posts/%postname%')
      expect(extractPatternWithOldSlug('/my-old-post.html', 'my-old-post', '%postname%')).toBe('/%postname%.html')
      expect(extractPatternWithOldSlug('/pages/my-old-page', 'my-old-page', '%slug%')).toBe('/pages/%slug%')
    })
  })

  describe('7. Collision and reserved path protection', () => {
    it('identifies exact system reserved paths', () => {
      expect(isReservedPath('/admin')).toBe(true)
      expect(isReservedPath('/admin/settings')).toBe(true)
      expect(isReservedPath('/api')).toBe(true)
      expect(isReservedPath('/api/users')).toBe(true)
      expect(isReservedPath('/_next')).toBe(true)
      expect(isReservedPath('/_next/static')).toBe(true)
      expect(isReservedPath('/posts')).toBe(true)
      expect(isReservedPath('/favicon.ico')).toBe(true)
      expect(isReservedPath('/sw.js')).toBe(true)
    })

    it('allows valid content paths', () => {
      expect(isReservedPath('/about')).toBe(false)
      expect(isReservedPath('/my-post.html')).toBe(false)
      expect(isReservedPath('/posts/my-post')).toBe(false)
      expect(isReservedPath('/category/news')).toBe(false)
      expect(isReservedPath('/tag/updates')).toBe(false)
    })

    it('normalizes paths consistently', () => {
      expect(normalizePath('about')).toBe('/about')
      expect(normalizePath('/about/')).toBe('/about')
      expect(normalizePath('//about//sub//')).toBe('/about/sub')
      expect(normalizePath('/SAMPLE-PAGE')).toBe('/sample-page')
    })
  })
})
