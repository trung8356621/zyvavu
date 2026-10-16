import type { WidgetManifest } from './types'

import { postTitleManifest } from '@/widgets/PostTitle/manifest'
import { postContentManifest } from '@/widgets/PostContent/manifest'
import { postMetaManifest } from '@/widgets/PostMeta/manifest'
import { featuredMediaManifest } from '@/widgets/FeaturedMedia/manifest'
import { columnsManifest } from '@/widgets/Columns/manifest'
import { textBlockManifest } from '@/widgets/TextBlock/manifest'
import { recentPostsManifest } from '@/widgets/RecentPosts/manifest'
import { categoryHeaderManifest } from '@/widgets/CategoryHeader/manifest'
import { productHeaderManifest } from '@/widgets/ProductHeader/manifest'
import { headerManifest } from '@/widgets/Header/manifest'
import { headerBrandManifest } from '@/widgets/HeaderBrand/manifest'
import { headerNavManifest } from '@/widgets/HeaderNav/manifest'
import { headerActionManifest } from '@/widgets/HeaderAction/manifest'
import { headerTopBarTextManifest } from '@/widgets/HeaderTopBarText/manifest'
import { footerManifest } from '@/widgets/Footer/manifest'
import { collectionLoopManifest } from '@/widgets/CollectionLoop/manifest'
import { itemTitleManifest } from '@/widgets/ItemTitle/manifest'
import { itemImageManifest } from '@/widgets/ItemImage/manifest'
import { itemExcerptManifest } from '@/widgets/ItemExcerpt/manifest'
import { itemLinkManifest } from '@/widgets/ItemLink/manifest'
import { sectionManifest } from '@/widgets/Section/manifest'

const defaultManifestRegistry: Record<string, WidgetManifest> = {
  Section: sectionManifest,
  PostTitle: postTitleManifest,
  PostContent: postContentManifest,
  PostMeta: postMetaManifest,
  FeaturedMedia: featuredMediaManifest,
  Columns: columnsManifest,
  TextBlock: textBlockManifest,
  RecentPosts: recentPostsManifest,
  CategoryHeader: categoryHeaderManifest,
  ProductHeader: productHeaderManifest,
  Header: headerManifest,
  HeaderBrand: headerBrandManifest,
  HeaderNav: headerNavManifest,
  HeaderAction: headerActionManifest,
  HeaderTopBarText: headerTopBarTextManifest,
  Footer: footerManifest,
  CollectionLoop: collectionLoopManifest,
  ItemTitle: itemTitleManifest,
  ItemImage: itemImageManifest,
  ItemExcerpt: itemExcerptManifest,
  ItemLink: itemLinkManifest,
}

const customManifestOverrides: Record<string, Partial<WidgetManifest>> = {}

export function registerWidgetManifest(id: string, manifest?: Partial<WidgetManifest>) {
  if (manifest) {
    customManifestOverrides[id] = manifest
  }
}

export function getWidgetManifest(id: string): WidgetManifest | undefined {
  const custom = customManifestOverrides[id]
  const base = defaultManifestRegistry[id]

  if (!base && !custom) return undefined

  return (custom ? { ...base, ...custom } : base) as WidgetManifest
}

export function getAllWidgetManifests(): Record<string, WidgetManifest> {
  const result: Record<string, WidgetManifest> = { ...defaultManifestRegistry }
  for (const [key, val] of Object.entries(customManifestOverrides)) {
    result[key] = (result[key] ? { ...result[key], ...val } : val) as WidgetManifest
  }
  return result
}
