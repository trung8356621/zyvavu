import { publisherDisplayName } from '../settings'
import type { SchemaAdapter, SchemaEntityIds, SchemaNode, SeoPageContext } from '../types'
import { buildAbsoluteUrl } from '../utils'

export const OrganizationSchemaAdapter: SchemaAdapter = {
  name: 'organization',
  supports(context: SeoPageContext): boolean {
    return context.status === 'ok' && context.isIndexable
  },
  build(context: SeoPageContext, ids: SchemaEntityIds): SchemaNode[] {
    const nodes: SchemaNode[] = []
    const homeUrl = buildAbsoluteUrl(context.site.siteUrl, '/')

    const organizationNode: SchemaNode = {
      '@type': context.site.publisherType === 'Person' ? 'Person' : 'Organization',
      '@id': ids.organizationId,
      name: publisherDisplayName(context.site),
      url: homeUrl,
    }

    if (context.site.sameAs && context.site.sameAs.length > 0) {
      organizationNode.sameAs = context.site.sameAs
    }

    if (context.site.logo?.url) {
      const logoNode: SchemaNode = {
        '@type': 'ImageObject',
        '@id': ids.logoId,
        url: context.site.logo.url,
        contentUrl: context.site.logo.url,
        inLanguage: context.site.language,
      }
      if (context.site.logo.width) logoNode.width = context.site.logo.width
      if (context.site.logo.height) logoNode.height = context.site.logo.height
      if (context.site.logo.caption) logoNode.caption = context.site.logo.caption
      if (context.site.logo.mimeType) logoNode.encodingFormat = context.site.logo.mimeType

      nodes.push(logoNode)
      organizationNode.logo = { '@id': ids.logoId }
      organizationNode.image = { '@id': ids.logoId }
    }

    nodes.unshift(organizationNode)
    return nodes
  },
}
