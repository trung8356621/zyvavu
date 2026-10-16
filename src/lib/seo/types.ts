import type { PublicSiteSettings } from '@/lib/site/settings'

export type SeoResourceType = 'home' | 'page' | 'post' | 'category' | 'tag'

export type SeoResolutionStatus = 'ok' | 'redirect' | 'not_found'

export interface SeoImageInfo {
  url: string
  width?: number
  height?: number
  caption?: string
  mimeType?: string
}

export interface SeoTermInfo {
  id: number
  title: string
  slug: string
  canonicalPath: string | null
  canonicalUrl: string | null
}

export interface SeoBreadcrumbItem {
  name: string
  url: string
}

export interface SeoSiteInfo extends PublicSiteSettings {
  logo?: SeoImageInfo
}

export interface SeoPostData {
  id: number
  title: string
  slug: string
  excerpt?: string
  wordCount?: number
  categories: SeoTermInfo[]
  tags: SeoTermInfo[]
}

export interface SeoPageData {
  id: number
  title: string
  slug: string
  excerpt?: string
  isHome: boolean
}

export interface SeoTaxonomyData {
  id: number
  taxonomy: 'category' | 'tag'
  title: string
  slug: string
  postCount?: number
}

export interface SeoPageContext {
  status: SeoResolutionStatus
  requestedPath: string
  redirectTarget?: string
  resourceType?: SeoResourceType
  isIndexable: boolean
  site: SeoSiteInfo
  canonicalPath?: string
  canonicalUrl?: string
  title: string
  documentTitle: string
  description: string
  publishedAt?: string
  modifiedAt?: string
  primaryImage?: SeoImageInfo
  breadcrumbs: SeoBreadcrumbItem[]
  post?: SeoPostData
  page?: SeoPageData
  term?: SeoTaxonomyData
  document?: Record<string, unknown>
}

export interface SchemaIdReference {
  '@id': string
}

export interface SchemaNode {
  '@type': string | string[]
  '@id'?: string
  [key: string]: unknown
}

export interface SchemaGraph {
  '@context': 'https://schema.org'
  '@graph': SchemaNode[]
}

export interface SchemaEntityIds {
  organizationId: string
  websiteId: string
  logoId: string
  webpageId?: string
  breadcrumbId?: string
  primaryImageId?: string
  articleId?: string
  entityId: (fragment: string, baseUrl?: string) => string
}

export interface SchemaAdapter {
  name: string
  supports(context: SeoPageContext): boolean
  build(context: SeoPageContext, ids: SchemaEntityIds): SchemaNode | SchemaNode[] | null
}

export interface GraphValidationResult {
  valid: boolean
  uniqueIds: string[]
  duplicateIds: string[]
  danglingReferences: string[]
  errors: string[]
}
