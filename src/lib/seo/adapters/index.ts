import type { SchemaAdapter } from '../types'
import { ArticleSchemaAdapter } from './article'
import { BreadcrumbSchemaAdapter } from './breadcrumb'
import { OrganizationSchemaAdapter } from './organization'
import { WebPageSchemaAdapter } from './webpage'
import { WebSiteSchemaAdapter } from './website'

export {
  ArticleSchemaAdapter,
  BreadcrumbSchemaAdapter,
  OrganizationSchemaAdapter,
  WebPageSchemaAdapter,
  WebSiteSchemaAdapter,
}

export const DEFAULT_SCHEMA_ADAPTERS: readonly SchemaAdapter[] = [
  OrganizationSchemaAdapter,
  WebSiteSchemaAdapter,
  WebPageSchemaAdapter,
  BreadcrumbSchemaAdapter,
  ArticleSchemaAdapter,
]
