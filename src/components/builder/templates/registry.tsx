import React from 'react'

export type PostItemData = {
  id: string | number
  title: string
  url: string
  slug: string
  excerpt?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}

export type ProductItemData = {
  id: string | number
  title: string
  url: string
  slug: string
  price?: number | null
  formattedPrice?: string | null
  imageUrl?: string | null
  description?: string | null
}

export type ItemTemplate<T> = {
  id: string
  label: string
  description?: string
  render: (props: { item: T; index: number }) => React.ReactNode
}

// Built-in Post Templates
export const defaultPostLinkListTemplate: ItemTemplate<PostItemData> = {
  id: 'default-link-list',
  label: 'Default Link List',
  description: 'Clean vertical list of post titles with arrow icons',
  render: ({ item }) => (
    <a
      key={item.id}
      href={item.url}
      className="zyvavu-post-item-link"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderRadius: '6px',
        color: 'var(--zyvavu-text, #17201f)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--zyvavu-background, #f5f6f4)'
        e.currentTarget.style.color = '#0e6b66'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--zyvavu-text, #17201f)'
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </span>
      <span style={{ fontSize: '11px', color: '#8c9b98', marginLeft: '8px', flexShrink: 0 }}>
        &rarr;
      </span>
    </a>
  ),
}

export const postTitleAndExcerptTemplate: ItemTemplate<PostItemData> = {
  id: 'title-and-excerpt',
  label: 'Title and Excerpt Card',
  description: 'Post title with a brief excerpt snippet',
  render: ({ item }) => (
    <a
      key={item.id}
      href={item.url}
      className="zyvavu-post-item-card"
      style={{
        display: 'block',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid var(--zyvavu-border, #dfe5e2)',
        backgroundColor: '#ffffff',
        textDecoration: 'none',
        marginBottom: '6px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#0e6b66'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 107, 102, 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--zyvavu-border, #dfe5e2)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--zyvavu-text, #17201f)',
          marginBottom: '4px',
        }}
      >
        {item.title}
      </div>
      {item.excerpt && (
        <div
          style={{
            fontSize: '11px',
            color: '#65716e',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.excerpt}
        </div>
      )}
    </a>
  ),
}

export const postCompactDateListTemplate: ItemTemplate<PostItemData> = {
  id: 'compact-date-list',
  label: 'Compact Title with Date',
  description: 'Post title with formatted publication date badge',
  render: ({ item }) => {
    const formattedDate = item.publishedAt
      ? new Date(item.publishedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null

    return (
      <a
        key={item.id}
        href={item.url}
        className="zyvavu-post-item-date"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 10px',
          borderRadius: '6px',
          color: 'var(--zyvavu-text, #17201f)',
          textDecoration: 'none',
          fontSize: '13px',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--zyvavu-background, #f5f6f4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </span>
        {formattedDate && (
          <span
            style={{
              fontSize: '10px',
              color: '#65716e',
              backgroundColor: '#e6f3f1',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '8px',
              flexShrink: 0,
            }}
          >
            {formattedDate}
          </span>
        )}
      </a>
    )
  },
}

// Built-in Product Templates (Extensible Contract for Phase 2)
export const defaultProductCardTemplate: ItemTemplate<ProductItemData> = {
  id: 'default-product-card',
  label: 'Product Card with Price & CTA',
  description: 'Standard product card with thumbnail, title, price, and CTA link',
  render: ({ item }) => (
    <div
      key={item.id}
      style={{
        padding: '12px',
        border: '1px solid var(--zyvavu-border, #dfe5e2)',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        marginBottom: '8px',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '13px', color: '#17201f' }}>{item.title}</div>
      {item.formattedPrice && (
        <div style={{ fontSize: '12px', color: '#0e6b66', fontWeight: 600, marginTop: '4px' }}>
          {item.formattedPrice}
        </div>
      )}
    </div>
  ),
}

export const productCompactRowTemplate: ItemTemplate<ProductItemData> = {
  id: 'product-compact-row',
  label: 'Compact Product Row',
  description: 'Single-line product title with inline price badge',
  render: ({ item }) => (
    <div
      key={item.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.title}</span>
      {item.formattedPrice && (
        <span style={{ fontSize: '11px', color: '#0e6b66', fontWeight: 600 }}>
          {item.formattedPrice}
        </span>
      )}
    </div>
  ),
}

// In-Memory Registries
export const postTemplateRegistry = new Map<string, ItemTemplate<PostItemData>>([
  [defaultPostLinkListTemplate.id, defaultPostLinkListTemplate],
  [postTitleAndExcerptTemplate.id, postTitleAndExcerptTemplate],
  [postCompactDateListTemplate.id, postCompactDateListTemplate],
])

export const productTemplateRegistry = new Map<string, ItemTemplate<ProductItemData>>([
  [defaultProductCardTemplate.id, defaultProductCardTemplate],
  [productCompactRowTemplate.id, productCompactRowTemplate],
])

// Registration & Retrieval Helpers
export function registerPostTemplate(template: ItemTemplate<PostItemData>): void {
  postTemplateRegistry.set(template.id, template)
}

export function registerProductTemplate(template: ItemTemplate<ProductItemData>): void {
  productTemplateRegistry.set(template.id, template)
}

export function getPostTemplate(id?: string): ItemTemplate<PostItemData> {
  if (id && postTemplateRegistry.has(id)) {
    return postTemplateRegistry.get(id)!
  }
  return defaultPostLinkListTemplate
}

export function getProductTemplate(id?: string): ItemTemplate<ProductItemData> {
  if (id && productTemplateRegistry.has(id)) {
    return productTemplateRegistry.get(id)!
  }
  return defaultProductCardTemplate
}

export function getPostTemplateOptions(): Array<{ label: string; value: string }> {
  return Array.from(postTemplateRegistry.values()).map((t) => ({
    label: t.label,
    value: t.id,
  }))
}

export function getProductTemplateOptions(): Array<{ label: string; value: string }> {
  return Array.from(productTemplateRegistry.values()).map((t) => ({
    label: t.label,
    value: t.id,
  }))
}
