import type { TemplateContext, ThemeComponentData, ThemeTemplateDocument } from './types'

export const PAGE_CONTENT_CONTEXTS: ReadonlySet<TemplateContext> = new Set([
  'home',
  'single',
  'page',
  'category',
  'product',
])

export function isPageContentContext(context: string): boolean {
  return PAGE_CONTENT_CONTEXTS.has(context as TemplateContext)
}

/**
 * Deterministically normalizes a template document so that all root-level content
 * widgets reside within Section containers for page-content templates.
 *
 * Rules:
 * - Header and footer are structured theme parts and are preserved without modification.
 * - If all root items are already Section widgets, returns the document as-is (idempotent).
 * - Any root-level non-Section widgets are grouped into Section containers.
 * - Existing nested zones (e.g. Columns, CollectionLoop) are preserved with zero data loss.
 * - Widget props, IDs, dynamic bindings, and locks are fully preserved.
 * - Generated Section IDs are deterministic and collision-free.
 */
export function normalizeThemeTemplateDocument(doc: ThemeTemplateDocument): ThemeTemplateDocument {
  if (!doc || typeof doc !== 'object') {
    return doc
  }

  // Header and Footer are exempt
  if (!isPageContentContext(doc.template)) {
    return doc
  }

  if (!Array.isArray(doc.content)) {
    return doc
  }

  // Check if normalization is needed
  const needsNormalization = doc.content.some((item) => item?.type !== 'Section')
  if (!needsNormalization) {
    return doc
  }

  const newContent: ThemeComponentData[] = []
  const newZones: Record<string, ThemeComponentData[]> = { ...(doc.zones || {}) }

  let pendingGroup: ThemeComponentData[] = []
  let groupIndex = 0

  const flushPendingGroup = () => {
    if (pendingGroup.length === 0) return
    groupIndex++
    const firstWidget = pendingGroup[0]
    const baseId = firstWidget?.props?.id || `group-${groupIndex}`
    const sectionId = `section-${doc.template}-${baseId}`
    const zoneKey = `${sectionId}:content`

    newZones[zoneKey] = [...pendingGroup]

    newContent.push({
      type: 'Section',
      props: {
        id: sectionId,
        containerWidth: 'inherit',
        verticalPadding: 'md',
        minHeight: 'auto',
      },
    })

    pendingGroup = []
  }

  for (const item of doc.content) {
    if (item.type === 'Section') {
      flushPendingGroup()
      newContent.push(item)
    } else {
      pendingGroup.push(item)
    }
  }

  flushPendingGroup()

  return {
    ...doc,
    content: newContent,
    zones: newZones,
  }
}
