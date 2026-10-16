import type { SchemaAdapter, SchemaEntityIds, SchemaNode, SeoPageContext } from '../types'

export const BreadcrumbSchemaAdapter: SchemaAdapter = {
  name: 'breadcrumb',
  supports(context: SeoPageContext): boolean {
    return (
      context.status === 'ok' &&
      context.isIndexable &&
      Boolean(context.canonicalUrl) &&
      context.breadcrumbs.length >= 2
    )
  },
  build(context: SeoPageContext, ids: SchemaEntityIds): SchemaNode | null {
    if (!ids.breadcrumbId || context.breadcrumbs.length < 2) return null

    const itemListElement = context.breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    }))

    return {
      '@type': 'BreadcrumbList',
      '@id': ids.breadcrumbId,
      itemListElement,
    }
  },
}
