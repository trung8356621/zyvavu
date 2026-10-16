import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import {
  ItemContextProvider,
  type LoopItemRecord,
} from '@/lib/theme-engine/item-context'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'

export type CollectionLoopProps = {
  id?: string
  mode?: 'dynamic' | 'manual'
  source?: 'posts' | 'products'
  columns?: number
  gap?: string
  heading?: string
  limit?: number
  categoryId?: string
  sort?: 'newest' | 'oldest'
  emptyText?: string
  manualItems?: LoopItemRecord[]
  itemTemplate?: React.ReactNode
  dataContext?: ThemeDataContext
  renderSlot?: (
    slotName: string,
    itemDataContext?: ThemeDataContext,
    keyPrefix?: string,
  ) => React.ReactNode
}

function mapDocToRecord(doc: any): LoopItemRecord {
  const imgDoc =
    typeof doc.featuredMedia === 'object'
      ? doc.featuredMedia
      : typeof doc.heroImage === 'object'
        ? doc.heroImage
        : null
  const imgUrl =
    imgDoc?.url ||
    (typeof doc.featuredMedia === 'string'
      ? `/api/media/file/${doc.featuredMedia}`
      : undefined)

  const firstCat =
    Array.isArray(doc.categories) && doc.categories[0]
      ? typeof doc.categories[0] === 'object'
        ? doc.categories[0]
        : null
      : null

  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    url: doc.publicPath || `/posts/${doc.slug || doc.id}`,
    excerpt: doc.excerpt || '',
    date: doc.publishedAt || doc.createdAt,
    category: firstCat ? firstCat.title || firstCat.name : undefined,
    image: imgUrl ? { url: imgUrl, alt: imgDoc?.alt || doc.title } : undefined,
    raw: doc,
  }
}

function renderRecords(props: CollectionLoopProps, records: LoopItemRecord[]) {
  const {
    id = 'collection-loop',
    columns = 3,
    gap = '24px',
    heading,
    emptyText = 'Chưa có bài viết nào.',
    dataContext,
    renderSlot,
  } = props

  return (
    <div className="zyvavu-widget-collection-loop" style={{ padding: '24px 0' }}>
      {heading && (
        <h2
          className="zyvavu-widget-collection-loop__heading"
          style={{
            margin: '0 0 24px 0',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--zyvavu-theme-text, inherit)',
          }}
        >
          {heading}
        </h2>
      )}

      {records.length === 0 ? (
        <p
          className="zyvavu-widget-collection-loop__empty"
          style={{ color: 'var(--zyvavu-theme-text-muted, #888)', fontStyle: 'italic' }}
        >
          {emptyText}
        </p>
      ) : (
        <div
          className="zyvavu-widget-collection-loop__grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: gap || '24px',
          }}
        >
          {records.map((record, idx) => (
            <article
              key={record.id || idx}
              className="zyvavu-widget-collection-loop__card"
              style={{
                border: '1px solid var(--zyvavu-theme-border, #e2e8f0)',
                borderRadius: '8px',
                padding: '20px',
                background: 'var(--zyvavu-theme-surface, #ffffff)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              {renderSlot ? (
                renderSlot(
                  'itemTemplate',
                  {
                    ...(dataContext || { type: 'home' }),
                    item: record,
                  },
                  `loop-${id}-item-${record.id || idx}`,
                )
              ) : (
                <ItemContextProvider item={record}>
                  <ItemTitleFrontend />
                  <ItemExcerptFrontend />
                  <ItemLinkFrontend />
                </ItemContextProvider>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

async function renderDynamicAsync(
  props: CollectionLoopProps,
  boundedLimit: number,
): Promise<React.ReactNode> {
  const { categoryId, sort = 'newest', dataContext } = props
  let records: LoopItemRecord[] = []

  try {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    const payload = await getPayload({ config })

    const where: Record<string, any> = {
      _status: { equals: 'published' },
    }

    if (categoryId && categoryId.trim()) {
      const catTrim = categoryId.trim()
      if (/^\d+$/.test(catTrim)) {
        where['categories.id'] = { equals: Number(catTrim) }
      } else {
        const catRes = await payload.find({
          collection: 'categories',
          where: { slug: { equals: catTrim } },
          limit: 1,
          overrideAccess: true,
        })
        if (catRes.docs.length > 0) {
          where['categories.id'] = { equals: catRes.docs[0].id }
        }
      }
    }

    const sortField = sort === 'oldest' ? 'publishedAt' : '-publishedAt'

    const postResults = await payload.find({
      collection: 'posts',
      where,
      sort: sortField,
      limit: boundedLimit,
      depth: 2,
      overrideAccess: true,
    })

    records = postResults.docs.map(mapDocToRecord)
  } catch (err) {
    console.error('[CollectionLoop] Failed to fetch dynamic posts:', err)
    if (Array.isArray(dataContext?.archive?.posts)) {
      records = dataContext.archive.posts.slice(0, boundedLimit).map(mapDocToRecord)
    }
  }

  return renderRecords(props, records)
}

export function CollectionLoopFrontend(
  props: CollectionLoopProps,
): React.ReactNode | Promise<React.ReactNode> {
  const {
    mode = 'dynamic',
    source = 'posts',
    limit = 6,
    manualItems = [],
    dataContext,
    categoryId,
  } = props

  const boundedLimit = Math.min(Math.max(1, limit || 6), 24)

  if (mode === 'manual') {
    const records: LoopItemRecord[] = (manualItems || []).slice(0, boundedLimit).map((item, idx) => ({
      id: item.id || `manual-${idx}`,
      title: item.title || `Mục ${idx + 1}`,
      excerpt: item.excerpt || '',
      url: item.url || '#',
      image: item.image,
      category: item.category,
      date: item.date,
      raw: item,
    }))
    return renderRecords(props, records)
  }

  if (source === 'products') {
    // Products collection boundary (contract-only, catalog not yet implemented)
    return renderRecords(props, [])
  }

  // Dynamic posts: if archive posts are provided in dataContext and no specific categoryId filter
  if (Array.isArray(dataContext?.archive?.posts) && !categoryId) {
    const records = dataContext.archive.posts.slice(0, boundedLimit).map(mapDocToRecord)
    return renderRecords(props, records)
  }

  // Otherwise query payload asynchronously in Next.js Server Component
  return renderDynamicAsync(props, boundedLimit)
}
