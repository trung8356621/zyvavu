'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { usePuck } from '@puckeditor/core'
import {
  ItemContextProvider,
  type LoopItemRecord,
} from '@/lib/theme-engine/item-context'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemImageFrontend } from '@/widgets/ItemImage/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import type { CollectionLoopProps } from './frontend'

const SAFE_PREVIEW_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ItemTitle: ItemTitleFrontend,
  ItemImage: ItemImageFrontend,
  ItemExcerpt: ItemExcerptFrontend,
  ItemLink: ItemLinkFrontend,
  TextBlock: TextBlockFrontend,
}

const EDITOR_SAMPLE_RECORDS: LoopItemRecord[] = [
  {
    id: 'sample-post-1',
    title: 'Hệ thống sản xuất công nghệ cao và tự động hóa trong quản trị',
    excerpt:
      'Khám phá giải pháp chuyển đổi mô hình vận hành và cải thiện 40% hiệu suất chuyền gia công hiện đại.',
    url: '#',
    date: '15/10/2026',
    category: 'Công nghệ',
  },
  {
    id: 'sample-post-2',
    title: 'Báo cáo xu hướng thị trường xuất khẩu và tiêu chuẩn kỹ thuật 2026',
    excerpt:
      'Tổng hợp đánh giá chuyên sâu về chuỗi cung ứng toàn cầu và bộ tiêu chuẩn kiểm định châu Âu mới.',
    url: '#',
    date: '14/10/2026',
    category: 'Báo cáo',
  },
  {
    id: 'sample-post-3',
    title: 'Chiến lược phát triển bền vững và giảm phát thải carbon doanh nghiệp',
    excerpt:
      'Ứng dụng năng lượng tái tạo và chứng chỉ xanh giúp gia tăng giá trị thương hiệu đối tác quốc tế.',
    url: '#',
    date: '12/10/2026',
    category: 'Vận hành',
  },
  {
    id: 'sample-post-4',
    title: 'Tối ưu hóa năng lực logistic và phân phối liên vùng đa phương thức',
    excerpt:
      'Mạng lưới kho bãi kết nối trực tiếp cảng nước sâu giúp rút ngắn thời gian giao vận xuống 24 giờ.',
    url: '#',
    date: '10/10/2026',
    category: 'Logistics',
  },
]

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
        { label: 'Products (Pending Catalog)', value: 'products' },
      ],
    },
    columns: {
      type: 'select',
      label: 'Grid Columns',
      options: [
        { label: '1 Column (List)', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
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
    itemTemplate: { type: 'slot' },
  },
  defaultProps: {
    mode: 'dynamic',
    source: 'posts',
    columns: 3,
    gap: '24px',
    heading: '',
    limit: 6,
    categoryId: '',
    sort: 'newest',
    emptyText: 'Chưa có bài viết nào.',
    manualItems: [],
  },
  render: ({
    id = 'collection-loop',
    heading,
    mode = 'dynamic',
    source = 'posts',
    columns = 3,
    gap = '24px',
    manualItems = [],
    itemTemplate: ItemTemplateSlot,
  }: any) => {
    // Resolve zone items for prototype from Puck appState
    let templateItems: any[] = []
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { appState } = usePuck()
      const zoneKey = `${id}:itemTemplate`
      templateItems = appState?.data?.zones?.[zoneKey] || []
    } catch {
      // If not rendered in active Puck context
    }

    // Active records for preview
    const activeRecords: LoopItemRecord[] =
      mode === 'manual' && manualItems && manualItems.length > 0
        ? manualItems.map((m: any, idx: number) => ({
            id: `manual-${idx}`,
            title: m.title || `Mục ${idx + 1}`,
            excerpt: m.excerpt || '',
            url: m.url || '#',
          }))
        : EDITOR_SAMPLE_RECORDS

    const prototypeRecord = activeRecords[0]
    const previewRecords = activeRecords.slice(1, Math.max(2, Number(columns)))

    return (
      <div
        className="zyvavu-widget-collection-loop zyvavu-widget-collection-loop--editor"
        style={{
          padding: '24px 0',
          border: '1px dashed #cbd5e1',
          borderRadius: '10px',
          margin: '12px 0',
          backgroundColor: '#fafaf9',
        }}
      >
        {/* Editor Info Bar */}
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
              Mode: {mode === 'dynamic' ? `Dynamic (${source})` : 'Manual Items'} •{' '}
              {columns} Columns
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Thiết kế 1 Prototype Card bên trái — các thẻ Preview bên phải tự động lặp theo
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: gap || '24px',
            padding: '0 16px',
          }}
        >
          {/* 1. Prototype Card: editable dropzone */}
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
              ★ PROTOTYPE TEMPLATE (Editable)
            </div>

            <ItemContextProvider item={prototypeRecord}>
              {ItemTemplateSlot ? (
                <ItemTemplateSlot />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                  Slot: Drop widgets here
                </div>
              )}
            </ItemContextProvider>

            {templateItems.length === 0 && (
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
                Kéo thả các Item widgets (ItemTitle, ItemImage, ItemExcerpt, ItemLink...) vào đây.
              </div>
            )}
          </div>

          {/* 2. Repeated Preview Cards */}
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
                Preview #{sIdx + 2} (Auto-repeated)
              </div>

              <ItemContextProvider item={sampleRecord}>
                {templateItems.length > 0 ? (
                  templateItems.map((child: any, cIdx: number) => {
                    const Component = SAFE_PREVIEW_COMPONENTS[child.type]
                    if (!Component) return null
                    return (
                      <Component
                        key={child.props?.id || cIdx}
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
                    (Lặp theo Prototype)
                  </div>
                )}
              </ItemContextProvider>
            </div>
          ))}
        </div>
      </div>
    )
  },
}
