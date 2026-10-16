import type { SchemaAdapter, SchemaEntityIds, SchemaNode, SeoPageContext } from '../types'

export const WebPageSchemaAdapter: SchemaAdapter = {
  name: 'webpage',
  supports(context: SeoPageContext): boolean {
    return context.status === 'ok' && context.isIndexable && Boolean(context.canonicalUrl)
  },
  build(context: SeoPageContext, ids: SchemaEntityIds): SchemaNode[] | null {
    if (!context.canonicalUrl || !ids.webpageId) return null

    const nodes: SchemaNode[] = []

    const isCollectionPage =
      context.resourceType === 'category' ||
      context.resourceType === 'tag' ||
      (context.resourceType === 'home' && !context.page)

    const webpageNode: SchemaNode = {
      '@type': isCollectionPage ? 'CollectionPage' : 'WebPage',
      '@id': ids.webpageId,
      url: context.canonicalUrl,
      name: context.title,
      isPartOf: { '@id': ids.websiteId },
      inLanguage: context.site.language,
    }

    if (context.description) {
      webpageNode.description = context.description
    }

    if (context.resourceType === 'home') {
      webpageNode.about = { '@id': ids.organizationId }
    }

    if (context.publishedAt) {
      webpageNode.datePublished = context.publishedAt
    }

    if (context.modifiedAt) {
      webpageNode.dateModified = context.modifiedAt
    }

    if (context.primaryImage?.url && ids.primaryImageId) {
      const imageNode: SchemaNode = {
        '@type': 'ImageObject',
        '@id': ids.primaryImageId,
        url: context.primaryImage.url,
        contentUrl: context.primaryImage.url,
        inLanguage: context.site.language,
      }
      if (context.primaryImage.width) imageNode.width = context.primaryImage.width
      if (context.primaryImage.height) imageNode.height = context.primaryImage.height
      if (context.primaryImage.caption) imageNode.caption = context.primaryImage.caption
      if (context.primaryImage.mimeType) imageNode.encodingFormat = context.primaryImage.mimeType

      nodes.push(imageNode)
      webpageNode.primaryImageOfPage = { '@id': ids.primaryImageId }
    }

    if (context.breadcrumbs.length >= 2 && ids.breadcrumbId) {
      webpageNode.breadcrumb = { '@id': ids.breadcrumbId }
    }

    nodes.push(webpageNode)
    return nodes
  },
}
