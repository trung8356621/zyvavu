import type { SchemaAdapter, SchemaEntityIds, SchemaNode, SeoPageContext } from '../types'
import { buildAbsoluteUrl } from '../utils'

export const WebSiteSchemaAdapter: SchemaAdapter = {
  name: 'website',
  supports(context: SeoPageContext): boolean {
    return context.status === 'ok' && context.isIndexable
  },
  build(context: SeoPageContext, ids: SchemaEntityIds): SchemaNode {
    const homeUrl = buildAbsoluteUrl(context.site.siteUrl, '/')
    const node: SchemaNode = {
      '@type': 'WebSite',
      '@id': ids.websiteId,
      url: homeUrl,
      name: context.site.siteName,
      inLanguage: context.site.language,
      publisher: { '@id': ids.organizationId },
    }

    if (context.site.tagline) {
      node.description = context.site.tagline
    }

    return node
  },
}
