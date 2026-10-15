import type { Config } from '@puckeditor/core'
import { ColumnsBlock, type ColumnsProps } from '../../blocks/mega-menu/ColumnsBlock'
import { LinkListBlock, type LinkListProps } from '../../blocks/mega-menu/LinkListBlock'
import { PromoBannerBlock, type PromoBannerProps } from '../../blocks/mega-menu/PromoBannerBlock'
import { ContactCardBlock, type ContactCardProps } from '../../blocks/mega-menu/ContactCardBlock'
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
}

export const megaMenuConfig: Config<MegaMenuComponentProps> = {
  components: {
    Columns: ColumnsBlock,
    LinkList: LinkListBlock,
    PromoBanner: PromoBannerBlock,
    ContactCard: ContactCardBlock,
  },
  categories: {
    layout: {
      title: 'Layout',
      components: ['Columns'],
    },
    navigation: {
      title: 'Navigation & Content',
      components: ['LinkList', 'PromoBanner', 'ContactCard'],
    },
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
