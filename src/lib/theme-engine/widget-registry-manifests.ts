import { atomManifests } from '@/widgets/atoms/manifests'
import type { WidgetManifest } from './types'
import { normalizeComponentType } from '@/lib/style-engine/capabilities'

import { postTitleManifest } from '@/widgets/PostTitle/manifest'
import { postContentManifest } from '@/widgets/PostContent/manifest'
import { postMetaManifest } from '@/widgets/PostMeta/manifest'
import { featuredMediaManifest } from '@/widgets/FeaturedMedia/manifest'
import { galleryManifest } from '@/widgets/Gallery/manifest'
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
import { featuredPostManifest } from '@/widgets/FeaturedPost/manifest'
import { postCollectionManifest } from '@/widgets/PostCollection/manifest'
import { itemTitleManifest } from '@/widgets/ItemTitle/manifest'
import { itemImageManifest } from '@/widgets/ItemImage/manifest'
import { itemExcerptManifest } from '@/widgets/ItemExcerpt/manifest'
import { itemLinkManifest } from '@/widgets/ItemLink/manifest'
import { itemDateManifest } from '@/widgets/ItemDate/manifest'
import { sectionManifest } from '@/widgets/Section/manifest'
import { contactInformationManifest } from '@/widgets/ContactInformation/manifest'
import { iconManifest } from '@/widgets/Icon/manifest'
import { categoryListManifest } from '@/widgets/CategoryList/manifest'

const defaultManifestRegistry: Record<string, WidgetManifest> = {
  ...atomManifests,
  Section: sectionManifest,
  PostTitle: postTitleManifest,
  PostContent: postContentManifest,
  PostMeta: postMetaManifest,
  FeaturedMedia: featuredMediaManifest,
  Gallery: galleryManifest,
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
  FeaturedPost: featuredPostManifest,
  PostCollection: postCollectionManifest,
  ItemTitle: itemTitleManifest,
  ItemImage: itemImageManifest,
  ItemExcerpt: itemExcerptManifest,
  ItemLink: itemLinkManifest,
  ItemDate: itemDateManifest,
  ContactInformation: contactInformationManifest,
  Icon: iconManifest,
  CategoryList: categoryListManifest,
}

const customManifestOverrides: Record<string, Partial<WidgetManifest>> = {}

export function registerWidgetManifest(id: string, manifest?: Partial<WidgetManifest>) {
  if (manifest) {
    customManifestOverrides[id] = manifest
  }
}

export function getWidgetManifest(id: string): WidgetManifest | undefined {
  const normalized = normalizeComponentType(id)
  const custom = customManifestOverrides[normalized] || customManifestOverrides[id]
  const base = defaultManifestRegistry[normalized] || defaultManifestRegistry[id]

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
