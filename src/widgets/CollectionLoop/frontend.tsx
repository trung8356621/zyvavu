import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { LoopItemRecord, ThemeDataContext, ThemeTemplateDocument } from '@/lib/theme-engine/types'
import {
  boundPostLimit,
  mapDocToRecord,
  resolvePosts,
  type PostSort,
} from '@/lib/theme-engine/post-query'
import { resolveCategories } from '@/lib/theme-engine/category-query'
import { isProductSchemaSupported } from '@/lib/theme-engine/normalized-item'
import {
  collectionGridStyle,
  collectionResponsiveCss,
} from '@/lib/theme-engine/post-collection-render'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'

export type CollectionLoopProps = {
  style?: UniversalStyle
  id?: string
  mode?: 'dynamic' | 'manual'
  source?: 'posts' | 'products' | 'categories'
  layout?: 'list' | 'grid'
  columns?: number
  columnsTablet?: number
  columnsMobile?: number
  gap?: string
  heading?: string
  limit?: number
  categoryId?: string
  sort?: PostSort
  emptyText?: string
  manualItems?: LoopItemRecord[]
  /** Stable reference to a standalone Loop Item Template. */
  loopItemTemplateId?: string
  /**
   * Resolved Loop Item Template document (SSR / parent injects once).
   * Not persisted on the Collection Loop widget — identity is loopItemTemplateId.
   */
  loopItemTemplateDocument?: ThemeTemplateDocument | null
  itemTemplate?: React.ReactNode
  dataContext?: ThemeDataContext
  renderSlot?: (
    slotName: string,
    itemDataContext?: ThemeDataContext,
    keyPrefix?: string,
  ) => React.ReactNode
}

function renderCardShell(
  record: LoopItemRecord,
  idx: number,
  content: React.ReactNode,
) {
  return (
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
      {content}
    </article>
  )
}

function renderRecords(props: CollectionLoopProps, records: LoopItemRecord[]) {
  const {
    id = 'collection-loop',
    layout = 'grid',
    columns = 3,
    columnsTablet = 2,
    columnsMobile = 1,
    gap = '24px',
    heading,
    emptyText = 'Chưa có bài viết nào.',
    dataContext,
    renderSlot,
    loopItemTemplateId,
    loopItemTemplateDocument,
    style: semanticStyle,
  } = props

  const gridClass = 'zyvavu-widget-collection-loop__grid'
  const useLinkedTemplate = Boolean(loopItemTemplateId && loopItemTemplateDocument)

  return (
    <div
      className="zyvavu-widget-collection-loop"
      {...animationAttributes(semanticStyle?.animation)}
      style={{ padding: '24px 0', ...resolveWidgetStyles(semanticStyle) }}
    >
      <style dangerouslySetInnerHTML={{ __html: collectionResponsiveCss(gridClass) }} />
      {heading && (
        <h2
          className="zyvavu-widget-collection-loop__heading"
          style={{
            margin: '0 0 24px 0',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
          }}
        >
          {heading}
        </h2>
      )}

      {records.length === 0 ? (
        <p
          className="zyvavu-widget-collection-loop__empty"
          style={{
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text-muted, #888))',
            fontStyle: 'italic',
          }}
        >
          {emptyText}
        </p>
      ) : (
        <div
          className={gridClass}
          data-layout={layout === 'list' ? 'list' : 'grid'}
          data-loop-item-template={loopItemTemplateId || undefined}
          style={collectionGridStyle(layout === 'list' ? 'list' : 'grid', columns, gap, {
            tablet: columnsTablet,
            mobile: columnsMobile,
          })}
        >
          {records.map((record, idx) => {
            const itemContext: ThemeDataContext = {
              ...(dataContext || { type: 'home' }),
              item: record,
            }

            if (useLinkedTemplate && loopItemTemplateDocument) {
              return renderCardShell(
                record,
                idx,
                <ThemeRenderer
                  document={loopItemTemplateDocument}
                  dataContext={itemContext}
                  isNested
                />,
              )
            }

            const slotContent = renderSlot
              ? renderSlot('itemTemplate', itemContext, `loop-${id}-item-${record.id || idx}`)
              : null

            return renderCardShell(
              record,
              idx,
              slotContent || (
                <p
                  className="zyvavu-widget-collection-loop__missing-template"
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--zyvavu-theme-text-muted, #64748b)',
                  }}
                >
                  Select a Loop Item Template for this Collection Loop.
                </p>
              ),
            )
          })}
        </div>
      )}
    </div>
  )
}

async function loadLinkedTemplate(
  props: CollectionLoopProps,
): Promise<ThemeTemplateDocument | null> {
  if (props.loopItemTemplateDocument) return props.loopItemTemplateDocument
  const id = props.loopItemTemplateId?.trim()
  if (!id) return null
  try {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    const payload = await getPayload({ config })
    const { resolveLoopItemTemplate } = await import('@/lib/theme-engine/loop-item-templates')
    const themeId =
      typeof (props.dataContext as any)?.site?.themeId === 'string'
        ? (props.dataContext as any).site.themeId
        : undefined
    return await resolveLoopItemTemplate(payload, id, themeId)
  } catch (err) {
    console.error('[CollectionLoop] failed to load Loop Item Template', err)
    return null
  }
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
    sort = 'newest',
    loopItemTemplateId,
  } = props

  const boundedLimit = boundPostLimit(limit, 6)

  const run = async () => {
    // Resolve shared template once per Collection Loop render (not per item).
    const linkedDoc = loopItemTemplateId?.trim()
      ? await loadLinkedTemplate(props)
      : props.loopItemTemplateDocument || null
    const nextProps = { ...props, loopItemTemplateDocument: linkedDoc }

    if (mode === 'manual') {
      const records: LoopItemRecord[] = (manualItems || [])
        .slice(0, boundedLimit)
        .map((item, idx) => ({
          id: item.id || `manual-${idx}`,
          title: item.title || `Mục ${idx + 1}`,
          excerpt: item.excerpt || '',
          url: item.url || '#',
          image: item.image,
          category: item.category,
          date: item.date,
          raw: item,
        }))
      return renderRecords(nextProps, records)
    }

    if (source === 'products') {
      if (!isProductSchemaSupported()) return renderRecords(nextProps, [])
      return renderRecords(nextProps, [])
    }

    if (source === 'categories') {
      const records = await resolveCategories({ limit: boundedLimit, sort }, dataContext)
      return renderRecords(nextProps, records)
    }

    // Sync path: archive posts already resolved by the page (editor/SSR parity without suspend).
    if (Array.isArray(dataContext?.archive?.posts) && !(categoryId && categoryId.trim())) {
      return renderRecords(
        nextProps,
        dataContext.archive.posts.slice(0, boundedLimit).map(mapDocToRecord),
      )
    }

    const records = await resolvePosts({ limit: boundedLimit, categoryId, sort }, dataContext)
    return renderRecords(nextProps, records)
  }

  // Sync paths when the linked template is already resolved (or unused).
  const linkedReady =
    !loopItemTemplateId?.trim() || Boolean(props.loopItemTemplateDocument)

  if (linkedReady && mode === 'manual') {
    const records: LoopItemRecord[] = (manualItems || [])
      .slice(0, boundedLimit)
      .map((item, idx) => ({
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

  if (
    linkedReady &&
    mode === 'dynamic' &&
    source === 'posts' &&
    Array.isArray(dataContext?.archive?.posts) &&
    !(categoryId && categoryId.trim())
  ) {
    return renderRecords(
      props,
      dataContext.archive.posts.slice(0, boundedLimit).map(mapDocToRecord),
    )
  }

  if (linkedReady && source === 'products') {
    return renderRecords(props, [])
  }

  return run()
}

export { mapDocToRecord }
