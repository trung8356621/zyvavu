import type { SchemaAdapter, SchemaEntityIds, SchemaNode, SeoPageContext } from '../types'

export const ArticleSchemaAdapter: SchemaAdapter = {
  name: 'article',
  supports(context: SeoPageContext): boolean {
    return (
      context.status === 'ok' &&
      context.isIndexable &&
      context.resourceType === 'post' &&
      Boolean(context.canonicalUrl) &&
      Boolean(context.post)
    )
  },
  build(context: SeoPageContext, ids: SchemaEntityIds): SchemaNode | null {
    if (!context.canonicalUrl || !context.post || !ids.articleId || !ids.webpageId) return null

    const articleNode: SchemaNode = {
      '@type': 'BlogPosting',
      '@id': ids.articleId,
      url: context.canonicalUrl,
      headline: context.post.title,
      name: context.post.title,
      inLanguage: context.site.language,
      isPartOf: { '@id': ids.webpageId },
      mainEntityOfPage: { '@id': ids.webpageId },
      publisher: { '@id': ids.organizationId },
    }

    if (context.description) {
      articleNode.description = context.description
    }

    if (context.publishedAt) {
      articleNode.datePublished = context.publishedAt
    }

    if (context.modifiedAt) {
      articleNode.dateModified = context.modifiedAt
    }

    if (context.primaryImage?.url && ids.primaryImageId) {
      articleNode.image = { '@id': ids.primaryImageId }
    }

    if (context.post.categories.length > 0) {
      articleNode.articleSection = context.post.categories.map((cat) => cat.title)
    }

    if (context.post.tags.length > 0) {
      articleNode.keywords = context.post.tags.map((tag) => tag.title).join(', ')
    }

    if (typeof context.post.wordCount === 'number' && context.post.wordCount > 0) {
      articleNode.wordCount = context.post.wordCount
    }

    return articleNode
  },
}
