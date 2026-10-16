import React from 'react'
import type { WidgetManifest } from './types'

// Import only manifests and frontend implementations
import { postTitleManifest } from '@/widgets/PostTitle/manifest'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'

import { postContentManifest } from '@/widgets/PostContent/manifest'
import { PostContentFrontend } from '@/widgets/PostContent/frontend'

import { postMetaManifest } from '@/widgets/PostMeta/manifest'
import { PostMetaFrontend } from '@/widgets/PostMeta/frontend'

import { featuredMediaManifest } from '@/widgets/FeaturedMedia/manifest'
import { FeaturedMediaFrontend } from '@/widgets/FeaturedMedia/frontend'

import { columnsManifest } from '@/widgets/Columns/manifest'
import { ColumnsFrontend } from '@/widgets/Columns/frontend'

import { textBlockManifest } from '@/widgets/TextBlock/manifest'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'

import { recentPostsManifest } from '@/widgets/RecentPosts/manifest'
import { RecentPostsFrontend } from '@/widgets/RecentPosts/frontend'

import { categoryHeaderManifest } from '@/widgets/CategoryHeader/manifest'
import { CategoryHeaderFrontend } from '@/widgets/CategoryHeader/frontend'

import { productHeaderManifest } from '@/widgets/ProductHeader/manifest'
import { ProductHeaderFrontend } from '@/widgets/ProductHeader/frontend'

import { headerManifest } from '@/widgets/Header/manifest'
import { HeaderFrontend } from '@/widgets/Header/frontend'

import { headerBrandManifest } from '@/widgets/HeaderBrand/manifest'
import { HeaderBrandFrontend } from '@/widgets/HeaderBrand/frontend'

import { headerNavManifest } from '@/widgets/HeaderNav/manifest'
import { HeaderNavFrontend } from '@/widgets/HeaderNav/frontend'

import { headerActionManifest } from '@/widgets/HeaderAction/manifest'
import { HeaderActionFrontend } from '@/widgets/HeaderAction/frontend'

import { headerTopBarTextManifest } from '@/widgets/HeaderTopBarText/manifest'
import { HeaderTopBarTextFrontend } from '@/widgets/HeaderTopBarText/frontend'

import { footerManifest } from '@/widgets/Footer/manifest'
import { FooterFrontend } from '@/widgets/Footer/frontend'

import { collectionLoopManifest } from '@/widgets/CollectionLoop/manifest'
import { CollectionLoopFrontend } from '@/widgets/CollectionLoop/frontend'

import { itemTitleManifest } from '@/widgets/ItemTitle/manifest'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'

import { itemImageManifest } from '@/widgets/ItemImage/manifest'
import { ItemImageFrontend } from '@/widgets/ItemImage/frontend'

import { itemExcerptManifest } from '@/widgets/ItemExcerpt/manifest'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'

import { itemLinkManifest } from '@/widgets/ItemLink/manifest'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'

export type FrontendWidgetEntry = {
  manifest: WidgetManifest
  component: React.ComponentType<any>
}

// Default built-in registry
const defaultFrontendRegistry: Record<string, FrontendWidgetEntry> = {
  PostTitle: { manifest: postTitleManifest, component: PostTitleFrontend },
  PostContent: { manifest: postContentManifest, component: PostContentFrontend },
  PostMeta: { manifest: postMetaManifest, component: PostMetaFrontend },
  FeaturedMedia: { manifest: featuredMediaManifest, component: FeaturedMediaFrontend },
  Columns: { manifest: columnsManifest, component: ColumnsFrontend },
  TextBlock: { manifest: textBlockManifest, component: TextBlockFrontend },
  RecentPosts: { manifest: recentPostsManifest, component: RecentPostsFrontend },
  CategoryHeader: { manifest: categoryHeaderManifest, component: CategoryHeaderFrontend },
  ProductHeader: { manifest: productHeaderManifest, component: ProductHeaderFrontend },
  Header: { manifest: headerManifest, component: HeaderFrontend },
  HeaderBrand: { manifest: headerBrandManifest, component: HeaderBrandFrontend },
  HeaderNav: { manifest: headerNavManifest, component: HeaderNavFrontend },
  HeaderAction: { manifest: headerActionManifest, component: HeaderActionFrontend },
  HeaderTopBarText: { manifest: headerTopBarTextManifest, component: HeaderTopBarTextFrontend },
  Footer: { manifest: footerManifest, component: FooterFrontend },
  CollectionLoop: { manifest: collectionLoopManifest, component: CollectionLoopFrontend },
  ItemTitle: { manifest: itemTitleManifest, component: ItemTitleFrontend },
  ItemImage: { manifest: itemImageManifest, component: ItemImageFrontend },
  ItemExcerpt: { manifest: itemExcerptManifest, component: ItemExcerptFrontend },
  ItemLink: { manifest: itemLinkManifest, component: ItemLinkFrontend },
}

import { registerWidgetManifest } from './widget-registry-manifests'

// Runtime overrides for developers
const customFrontendOverrides: Record<string, Partial<FrontendWidgetEntry>> = {}

export function registerFrontendWidget(
  id: string,
  component: React.ComponentType<any>,
  manifest?: Partial<WidgetManifest>,
) {
  customFrontendOverrides[id] = {
    component,
    manifest: manifest as WidgetManifest,
  }
  if (manifest) {
    registerWidgetManifest(id, manifest)
  }
}

export function getFrontendWidget(id: string): FrontendWidgetEntry | undefined {
  const custom = customFrontendOverrides[id]
  const base = defaultFrontendRegistry[id]

  if (!base && !custom) return undefined

  return {
    manifest: (custom?.manifest || base?.manifest) as WidgetManifest,
    component: custom?.component || base?.component,
  }
}

export function getAllFrontendWidgets(): Record<string, FrontendWidgetEntry> {
  const result: Record<string, FrontendWidgetEntry> = { ...defaultFrontendRegistry }
  for (const [key, val] of Object.entries(customFrontendOverrides)) {
    if (val.component && val.manifest) {
      result[key] = val as FrontendWidgetEntry
    }
  }
  return result
}
