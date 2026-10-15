import React from 'react'
import type { Config } from '@puckeditor/core'
import { ColumnsBlock, type ColumnsProps } from '../../blocks/mega-menu/ColumnsBlock'
import { LinkListBlock, type LinkListProps } from '../../blocks/mega-menu/LinkListBlock'
import { PromoBannerBlock, type PromoBannerProps } from '../../blocks/mega-menu/PromoBannerBlock'
import { ContactCardBlock, type ContactCardProps } from '../../blocks/mega-menu/ContactCardBlock'
import { PostCategoryListBlock, type PostCategoryListProps } from '../../blocks/mega-menu/PostCategoryListBlock'
import { ProductCategoryListBlock, type ProductCategoryListProps } from '../../blocks/mega-menu/ProductCategoryListBlock'
import { CURRENT_BUILDER_VERSION } from '../../core/document'
import type { BuilderDocument } from '../../core/types'

// Reserved type contract for future ProductList block (Phase V2)
export type FutureProductListBlockProps = {
  categorySlug: string
  limit?: number
  mode?: 'pinned' | 'auto' | 'mixed'
}

export type MegaMenuComponentProps = {
  Columns: ColumnsProps
  LinkList: LinkListProps
  PromoBanner: PromoBannerProps
  ContactCard: ContactCardProps
  PostCategoryList: PostCategoryListProps
  ProductCategoryList: ProductCategoryListProps
}

export const megaMenuConfig: Config<MegaMenuComponentProps> = {
  components: {
    Columns: ColumnsBlock,
    LinkList: LinkListBlock,
    PromoBanner: PromoBannerBlock,
    ContactCard: ContactCardBlock,
    PostCategoryList: PostCategoryListBlock,
    ProductCategoryList: ProductCategoryListBlock,
  },
  categories: {
    layout: {
      title: 'Layout',
      components: ['Columns'],
    },
    navigation: {
      title: 'Navigation & Content',
      components: [
        'LinkList',
        'PromoBanner',
        'ContactCard',
        'PostCategoryList',
        'ProductCategoryList',
      ],
    },
  },
  root: {
    render: ({ children }) =>
      React.createElement(
        'div',
        {
          className: 'zyvavu-mega-dropdown-canvas',
          style: {
            width: '100%',
            maxWidth: '1140px',
            margin: '24px auto',
            padding: '24px 32px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #dfe5e2',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            boxSizing: 'border-box',
            minHeight: '260px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              borderBottom: '1px dashed #e2e8f0',
              paddingBottom: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            },
          },
          React.createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#65716e',
              },
            },
            'Mega Menu Dropdown Preview',
          ),
          React.createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                color: '#94a3b8',
              },
            },
            'Desktop Panel (Max 1140px)',
          ),
        ),
        children,
      ),
  },
}

export function createDefaultMegaMenuDocument(): BuilderDocument {
  return {
    version: CURRENT_BUILDER_VERSION,
    root: { props: {} },
    content: [
      {
        type: 'Columns',
        props: {
          id: 'mega-cols-1',
          distribution: 'equal-2',
        },
      },
    ],
    zones: {
      'mega-cols-1:column1': [
        {
          type: 'LinkList',
          props: {
            id: 'mega-linklist-1',
            heading: 'Main Navigation',
            items: [
              { label: 'Products', type: 'page', url: '/products', newTab: false },
              { label: 'Services', type: 'page', url: '/services', newTab: false },
              { label: 'Blog & Insights', type: 'post', url: '/blog', newTab: false },
              { label: 'About Company', type: 'page', url: '/about', newTab: false },
            ],
          },
        },
      ],
      'mega-cols-1:column2': [
        {
          type: 'PromoBanner',
          props: {
            id: 'mega-promo-1',
            title: 'Welcome to Zyvavu',
            description: 'Discover modern digital experience built on high performance architecture.',
            ctaLabel: 'Learn More',
            ctaUrl: '/about',
            ctaNewTab: false,
          },
        },
      ],
    },
  }
}
