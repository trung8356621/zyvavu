/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ThemeRenderer, validateThemeTemplateDocument } from '@/lib/theme-engine'
import { canonicalizeZonesToSlots } from '@/lib/theme-engine/document-slots'
import { mapDocToRecord, boundPostLimit, formatPostDate } from '@/lib/theme-engine/post-query'
import { PostCard } from '@/lib/theme-engine/post-collection-render'
import { collectionLoopManifest } from '@/widgets/CollectionLoop/manifest'
import { featuredPostManifest } from '@/widgets/FeaturedPost/manifest'
import { postCollectionManifest } from '@/widgets/PostCollection/manifest'
import { itemDateManifest } from '@/widgets/ItemDate/manifest'
import { FeaturedPostFrontend } from '@/widgets/FeaturedPost/frontend'
import { PostCollectionFrontend } from '@/widgets/PostCollection/frontend'
import { ItemDateFrontend } from '@/widgets/ItemDate/frontend'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { getFrontendWidget } from '@/lib/theme-engine/widget-registry-frontend'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

describe('Dynamic Content Batch A', () => {
  it('canonicalizes dual zone+slot storage so duplicate IDs are removed', () => {
    const child = {
      type: 'ItemTitle',
      props: { id: 'shared-title', tag: 'h3' },
    }
    const dual = {
      content: [
        {
          type: 'Section',
          props: {
            id: 'sec-1',
            content: [
              {
                type: 'CollectionLoop',
                props: {
                  id: 'loop-1',
                  mode: 'manual',
                  itemTemplate: [structuredClone(child)],
                },
              },
            ],
          },
        },
      ],
      zones: {
        'loop-1:itemTemplate': [structuredClone(child)],
      },
    }

    const before = validateThemeTemplateDocument(
      {
        version: 1,
        template: 'home',
        root: { props: {} },
        ...dual,
      },
      'home',
    )
    // Validation canonicalizes internally — must not report duplicate IDs.
    expect(before.errors.filter((e) => /duplicate/i.test(e))).toEqual([])

    const canonical = canonicalizeZonesToSlots(dual)
    expect(canonical.zones?.['loop-1:itemTemplate']).toBeUndefined()
    expect(canonical.content[0].props.content[0].props.itemTemplate).toHaveLength(1)
    expect(canonical.content[0].props.content[0].props.itemTemplate[0].props.id).toBe(
      'shared-title',
    )
  })

  it('registers FeaturedPost, PostCollection, ItemDate', () => {
    expect(featuredPostManifest.id).toBe('FeaturedPost')
    expect(postCollectionManifest.id).toBe('PostCollection')
    expect(itemDateManifest.id).toBe('ItemDate')
    expect(collectionLoopManifest.defaultProps.layout).toBe('grid')
    expect(getWidgetManifest('FeaturedPost')?.id).toBe('FeaturedPost')
    expect(getFrontendWidget('PostCollection')?.manifest.id).toBe('PostCollection')
    expect(getFrontendWidget('ItemDate')?.manifest.id).toBe('ItemDate')
  })

  it('maps post docs and bounds limits without inventing unpublished URLs', () => {
    expect(boundPostLimit(100)).toBe(24)
    expect(boundPostLimit(0)).toBe(6)
    expect(formatPostDate('2026-10-15T00:00:00.000Z')).toBeTruthy()

    const record = mapDocToRecord({
      id: 9,
      title: 'Hello',
      slug: 'hello',
      excerpt: 'Ex',
      publishedAt: '2026-10-15',
      _status: 'published',
      publicPath: '/tin-tuc/hello',
    })
    expect(record.url).toBe('/tin-tuc/hello')
    expect(record.title).toBe('Hello')

    const deleted = mapDocToRecord(null)
    expect(deleted.url).toBe('#')
  })

  it('renders FeaturedPost empty and PostCollection empty states', () => {
    const featured = FeaturedPostFrontend({
      mode: 'latest',
      emptyText: 'No featured post',
      dataContext: { type: 'home', archive: { posts: [] } },
    })
    expect(renderToStaticMarkup(featured as React.ReactElement)).toContain('No featured post')

    const collection = PostCollectionFrontend({
      emptyText: 'No posts in collection',
      limit: 3,
      dataContext: { type: 'home', archive: { posts: [] } },
    })
    expect(renderToStaticMarkup(collection as React.ReactElement)).toContain(
      'No posts in collection',
    )
  })

  it('renders PostCard presets and ItemDate from record context', () => {
    const record = {
      id: 1,
      title: 'Card Title',
      excerpt: 'Card excerpt',
      url: '/posts/card',
      date: '2026-10-15',
      image: { url: '/media/a.jpg', alt: 'A' },
    }
    expect(renderToStaticMarkup(<PostCard record={record} preset="classic-list" />)).toContain(
      'Card Title',
    )
    expect(renderToStaticMarkup(<PostCard record={record} preset="compact-list" />)).toContain(
      'href="/posts/card"',
    )
    expect(renderToStaticMarkup(<PostCard record={record} preset="image-card-grid" />)).toContain(
      'src="/media/a.jpg"',
    )
    expect(
      renderToStaticMarkup(
        <ItemDateFrontend dataContext={{ type: 'home', item: record }} />,
      ),
    ).toMatch(/2026/)
  })

  it('SSR CollectionLoop still repeats one template for many records', () => {
    const doc: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: {},
      content: [
        {
          type: 'Section',
          props: {
            id: 'sec',
            content: [
              {
                type: 'CollectionLoop',
                props: {
                  id: 'loop',
                  mode: 'manual',
                  columns: 2,
                  layout: 'grid',
                  limit: 2,
                  manualItems: [
                    { id: 'a', title: 'Alpha', excerpt: 'A', url: '/a' },
                    { id: 'b', title: 'Beta', excerpt: 'B', url: '/b' },
                  ],
                  itemTemplate: [
                    { type: 'ItemTitle', props: { id: 't', tag: 'h3', linkToPost: true } },
                    { type: 'ItemDate', props: { id: 'd' } },
                    { type: 'ItemLink', props: { id: 'l', label: 'Open', variant: 'button' } },
                  ],
                },
              },
            ],
          },
        },
      ],
      zones: {},
    }

    const validation = validateThemeTemplateDocument(doc, 'home')
    expect(validation.valid).toBe(true)

    const html = renderToStaticMarkup(<ThemeRenderer document={doc} />)
    expect(html).toContain('Alpha')
    expect(html).toContain('Beta')
    expect(html).toContain('href="/a"')
    expect(html).toContain('href="/b"')
    expect(html.match(/class="zyvavu-widget-collection-loop__card"/g)?.length).toBe(2)
  })

  it('renders FeaturedPost from archive context without DB', async () => {
    const node = await FeaturedPostFrontend({
      mode: 'latest',
      preset: 'minimal',
      dataContext: {
        type: 'home',
        archive: {
          posts: [
            {
              id: 42,
              title: 'Archive Featured',
              excerpt: 'From archive',
              publicPath: '/posts/archive-featured',
              publishedAt: '2026-10-01',
            },
          ],
        },
      },
    })
    const html = renderToStaticMarkup(node as React.ReactElement)
    expect(html).toContain('Archive Featured')
    expect(html).toContain('href="/posts/archive-featured"')
  })
})
