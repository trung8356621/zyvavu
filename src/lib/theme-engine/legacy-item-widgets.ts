/** Legacy CollectionLoop Item* widget ids — frontend-only compatibility. */
export const LEGACY_ITEM_WIDGET_TYPES = [
  'ItemTitle',
  'ItemImage',
  'ItemExcerpt',
  'ItemLink',
  'ItemDate',
] as const

export type LegacyItemWidgetType = (typeof LEGACY_ITEM_WIDGET_TYPES)[number]

export function isLegacyItemWidget(type: string): boolean {
  return (LEGACY_ITEM_WIDGET_TYPES as readonly string[]).includes(type)
}

/**
 * Document/archive specialists with shared-Atom equivalents.
 * Keep registered for saved templates; hide from new Widget Library insertion.
 */
export const OBSOLETE_DOCUMENT_AUTHORING_WIDGETS = [
  'DocumentTitle',
  'DocumentDate',
  'DocumentCategory',
  'DocumentFeaturedMedia',
  'CategoryTitle',
  'CategoryDescription',
  'PostTitle',
  'PostMeta',
  'FeaturedMedia',
  'CategoryHeader',
] as const

export function isObsoleteDocumentAuthoringWidget(type: string): boolean {
  return (OBSOLETE_DOCUMENT_AUTHORING_WIDGETS as readonly string[]).includes(type)
}

/** Hide from new authoring library (legacy Item* + obsolete document specialists). */
export function isHiddenFromNewAuthoring(type: string): boolean {
  return isLegacyItemWidget(type) || isObsoleteDocumentAuthoringWidget(type)
}
