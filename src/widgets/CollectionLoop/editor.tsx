'use client'

import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'

import React, { useMemo } from 'react'
import type { ComponentConfig, CustomField } from '@puckeditor/core'
import { createUsePuck } from '@puckeditor/core'
import { Select, Text } from '@mantine/core'

const usePuck = createUsePuck()
import { ItemContextProvider, type LoopItemRecord } from '@/lib/theme-engine/item-context'
import { resolveSlotItems } from '@/lib/theme-engine/document-slots'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemImageFrontend } from '@/widgets/ItemImage/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import { ItemDateFrontend } from '@/widgets/ItemDate/frontend'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { useLoopItemTemplates } from '@/lib/theme-engine/loop-item-templates-context'
import { LoopItemEditorPreview } from '@/lib/theme-engine/loop-item-editor-preview'
import type { CollectionLoopProps } from './frontend'
import { isProductSchemaSupported } from '@/lib/theme-engine/normalized-item'

const SAFE_PREVIEW_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ItemTitle: ItemTitleFrontend,
  ItemImage: ItemImageFrontend,
  ItemExcerpt: ItemExcerptFrontend,
  ItemLink: ItemLinkFrontend,
  ItemDate: ItemDateFrontend,
  TextBlock: TextBlockFrontend,
}

const EDITOR_SAMPLE_RECORDS: LoopItemRecord[] = [
  {
    id: 'sample-post-1',
    title: 'Hệ thống sản xuất công nghệ cao và tự động hóa trong quản trị',
    excerpt:
      'Khám phá giải pháp chuyển đổi mô hình vận hành và cải thiện 40% hiệu suất chuyền gia công hiện đại.',
    url: '#',
    date: '2026-10-15',
    category: 'Công nghệ',
  },
  {
    id: 'sample-post-2',
    title: 'Báo cáo xu hướng thị trường xuất khẩu và tiêu chuẩn kỹ thuật 2026',
    excerpt:
      'Tổng hợp đánh giá chuyên sâu về chuỗi cung ứng toàn cầu và bộ tiêu chuẩn kiểm định châu Âu mới.',
    url: '#',
    date: '2026-10-14',
    category: 'Báo cáo',
  },
  {
    id: 'sample-post-3',
    title: 'Chiến lược phát triển bền vững và giảm phát thải carbon doanh nghiệp',
    excerpt:
      'Ứng dụng năng lượng tái tạo và chứng chỉ xanh giúp gia tăng giá trị thương hiệu đối tác quốc tế.',
    url: '#',
    date: '2026-10-12',
    category: 'Vận hành',
  },
  {
    id: 'sample-post-4',
    title: 'Tối ưu hóa năng lực logistic và phân phối liên vùng đa phương thức',
    excerpt:
      'Mạng lưới kho bãi kết nối trực tiếp cảng nước sâu giúp rút ngắn thời gian giao vận xuống 24 giờ.',
    url: '#',
    date: '2026-10-10',
    category: 'Logistics',
  },
]

function LoopItemTemplateFieldControl({
  value,
  onChange,
  readOnly,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  readOnly?: boolean
}) {
  const { items } = useLoopItemTemplates()
  const data = items.map((item) => ({ value: item.id, label: item.name }))
  return (
    <Select
      label="Loop Item Template"
      description="Required for new Collection Loops. Item presentation comes from this shared template."
      data={data}
      value={value || null}
      onChange={(next) => onChange(next || undefined)}
      placeholder={data.length ? 'Select a Loop Item Template' : 'Create a Loop Item via + first'}
      disabled={readOnly || data.length === 0}
      clearable
      searchable
      size="sm"
      comboboxProps={{ withinPortal: true }}
    />
  )
}

const loopItemTemplateField: CustomField<string | undefined> = {
  type: 'custom',
  label: 'Loop Item Template',
  render: ({ value, onChange, readOnly }) => (
    <LoopItemTemplateFieldControl value={value} onChange={onChange} readOnly={readOnly} />
  ),
}

export const collectionLoopEditor: ComponentConfig<CollectionLoopProps> = {
  label: 'Collection Loop',
  fields: {
    heading: {
      type: 'text',
      label: 'Section Heading',
    },
    mode: {
      type: 'select',
      label: 'Data Mode',
      options: [
        { label: 'Dynamic Posts (Payload Database)', value: 'dynamic' },
        { label: 'Manual Records (Custom List)', value: 'manual' },
      ],
    },
    source: {
      type: 'select',
      label: 'Data Source',
      options: [
        { label: 'Posts (Blog & Articles)', value: 'posts' },
        { label: 'Categories', value: 'categories' },
        {
          label: isProductSchemaSupported()
            ? 'Products'
            : 'Products (Pending Catalog)',
          value: 'products',
        },
      ],
    },
    loopItemTemplateId: loopItemTemplateField,
    layout: {
      type: 'select',
      label: 'Layout',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
      ],
    },
    columns: {
      type: 'select',
      label: 'Desktop Columns',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
      ],
    },
    columnsTablet: {
      type: 'select',
      label: 'Tablet Columns',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
      ],
    },
    columnsMobile: {
      type: 'select',
      label: 'Mobile Columns',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
      ],
    },
    gap: {
      type: 'select',
      label: 'Grid Gap',
      options: [
        { label: 'Compact (12px)', value: '12px' },
        { label: 'Standard (16px)', value: '16px' },
        { label: 'Spacious (24px)', value: '24px' },
        { label: 'Wide (32px)', value: '32px' },
      ],
    },
    limit: {
      type: 'number',
      label: 'Item Limit (1 to 24)',
      min: 1,
      max: 24,
    },
    categoryId: {
      type: 'text',
      label: 'Category Filter (Slug or ID, Optional)',
    },
    sort: {
      type: 'select',
      label: 'Order',
      options: [
        { label: 'Newest First', value: 'newest' },
        { label: 'Oldest First', value: 'oldest' },
        { label: 'Title A–Z', value: 'title-asc' },
        { label: 'Title Z–A', value: 'title-desc' },
      ],
    },
    emptyText: {
      type: 'text',
      label: 'Empty State Message',
    },
    manualItems: {
      type: 'array',
      label: 'Manual Records (When Mode = Manual)',
      arrayFields: {
        title: { type: 'text', label: 'Item Title' },
        excerpt: { type: 'textarea', label: 'Item Description' },
        url: { type: 'text', label: 'Item URL' },
      },
      getItemSummary: (item) => item.title || 'Untitled Item',
    },
    // Legacy inline slot field retained so existing documents do not lose stored slot data on save.
    // New authoring uses loopItemTemplateId only; library no longer offers Item* widgets.
    itemTemplate: {
      type: 'slot',
      label: 'Legacy inline item template (compat — do not use for new designs)',
      disallow: [
        'Section',
        'CollectionLoop',
        'PostCollection',
        'FeaturedPost',
        'RecentPosts',
        'ItemTitle',
        'ItemImage',
        'ItemExcerpt',
        'ItemLink',
        'ItemDate',
      ],
    },
  },
  defaultProps: {
    mode: 'dynamic',
    source: 'posts',
    layout: 'grid',
    columns: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: '24px',
    heading: '',
    limit: 6,
    categoryId: '',
    sort: 'newest',
    emptyText: 'Chưa có bài viết nào.',
    manualItems: [],
    loopItemTemplateId: '',
  },
  render: (props: any) => <CollectionLoopEditorCanvas {...props} />,
}

function CollectionLoopEditorCanvas({
  style: semanticStyle,
  id = 'collection-loop',
  heading,
  mode = 'dynamic',
  source = 'posts',
  layout = 'grid',
  columns = 3,
  gap = '24px',
  manualItems = [],
  loopItemTemplateId = '',
  itemTemplate: ItemTemplateSlot,
}: any) {
  const data = usePuck((s) => s.appState?.data)
  const { documents, items: loopMetas } = useLoopItemTemplates()
  const templateItems = useMemo(
    () => resolveSlotItems(data, id, 'itemTemplate'),
    [data, id],
  )

  const linkedId = String(loopItemTemplateId || '').trim()
  const linkedDoc = linkedId ? documents[linkedId] : null
  const linkedMeta = loopMetas.find((item) => item.id === linkedId)
  const legacyInline = !linkedDoc && templateItems.length > 0

  const activeRecords: LoopItemRecord[] =
    mode === 'manual' && manualItems && manualItems.length > 0
      ? manualItems.map((m: any, idx: number) => ({
          id: `manual-${idx}`,
          title: m.title || `Mục ${idx + 1}`,
          excerpt: m.excerpt || '',
          url: m.url || '#',
        }))
      : EDITOR_SAMPLE_RECORDS

  const previewCount = layout === 'list' ? 2 : Math.max(2, Number(columns) || 3)
  const prototypeRecord = activeRecords[0]
  const previewRecords = activeRecords.slice(1, previewCount)

  return (
    <div
      className="zyvavu-widget-collection-loop zyvavu-widget-collection-loop--editor"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        padding: '24px 0',
        border: '1px dashed #cbd5e1',
        borderRadius: '10px',
        margin: '12px 0',
        backgroundColor: '#fafaf9',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      <div
        style={{
          padding: '0 16px 12px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: '#0e6b66',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '4px',
              marginRight: '8px',
            }}
          >
            Collection Loop
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            Mode: {mode === 'dynamic' ? `Dynamic (${source})` : 'Manual'} • {layout} • {columns}{' '}
            cols
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {linkedDoc
            ? `Template: ${linkedMeta?.name || linkedId} (shared reference)`
            : legacyInline
              ? 'Legacy inline item template — select a Loop Item Template to migrate'
              : 'Select a Loop Item Template in settings'}
        </span>
      </div>

      {heading && (
        <h2
          style={{
            margin: '0 16px 20px',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          {heading}
        </h2>
      )}

      {legacyInline && (
        <Text size="xs" c="orange" px="md" mb="sm">
          This Collection Loop still uses a legacy inline item design. Choose a Loop Item Template
          above; the inline design is kept until you do so (not discarded).
        </Text>
      )}

      <div
        style={{
          display: layout === 'list' ? 'flex' : 'grid',
          flexDirection: layout === 'list' ? 'column' : undefined,
          gridTemplateColumns:
            layout === 'list' ? undefined : `repeat(${columns}, minmax(0, 1fr))`,
          gap: gap || '24px',
          padding: '0 16px',
        }}
      >
        <div
          style={{
            border: '2px dashed #0e6b66',
            borderRadius: '8px',
            padding: '16px',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(14, 107, 102, 0.08)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '220px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: '#e6fffa',
              color: '#0e6b66',
              border: '1px solid #b2f5ea',
              borderRadius: '4px',
              padding: '2px 6px',
              alignSelf: 'flex-start',
              marginBottom: '12px',
              letterSpacing: '0.05em',
            }}
          >
            {linkedDoc
              ? '★ Linked Loop Item Template (edit via Template Type → Loop Item)'
              : '★ Loop Item Template (Editable legacy slot)'}
          </div>

          <ItemContextProvider item={prototypeRecord}>
            {linkedDoc ? (
              <LoopItemEditorPreview
                document={linkedDoc}
                dataContext={{ type: 'home', item: prototypeRecord }}
              />
            ) : ItemTemplateSlot ? (
              <ItemTemplateSlot />
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                Select a Loop Item Template in widget settings
              </div>
            )}
          </ItemContextProvider>

          {!linkedDoc && templateItems.length === 0 && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              Create a Loop Item via the Theme Builder + menu, then select it here.
            </div>
          )}
        </div>

        {previewRecords.map((sampleRecord, sIdx) => (
          <div
            key={sampleRecord.id || sIdx}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              background: '#ffffff',
              opacity: 0.92,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '220px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                background: '#f1f5f9',
                color: '#64748b',
                borderRadius: '4px',
                padding: '2px 6px',
                alignSelf: 'flex-start',
                marginBottom: '12px',
              }}
            >
              Preview #{sIdx + 2} (not saved)
            </div>

            <ItemContextProvider item={sampleRecord}>
              {linkedDoc ? (
                <LoopItemEditorPreview
                  document={linkedDoc}
                  dataContext={{ type: 'home', item: sampleRecord }}
                />
              ) : templateItems.length > 0 ? (
                templateItems.map((child: any, cIdx: number) => {
                  const Component = SAFE_PREVIEW_COMPONENTS[child.type]
                  if (!Component) return null
                  return (
                    <Component
                      key={`${sampleRecord.id}-${child.props?.id || cIdx}`}
                      {...child.props}
                      dataContext={{ type: 'home', item: sampleRecord }}
                    />
                  )
                })
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '140px',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}
                >
                  (Repeats Loop Item Template)
                </div>
              )}
            </ItemContextProvider>
          </div>
        ))}
      </div>
    </div>
  )
}
