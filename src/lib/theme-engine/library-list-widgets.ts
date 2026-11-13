/**
 * User-facing Widget Library "List Widget" groups.
 *
 * Organizational layer only — does not replace Widget Registry, Pattern IDs,
 * Puck component types, or saved-document schemas.
 */

export const BANNER_SLIDER_PATTERN_IDS = [
  'banner-slider-hero',
  'banner-slider-editorial',
  'banner-slider-minimal',
] as const

export const ANIMATED_COUNTER_PATTERN_IDS = [
  'counter-single-highlight',
  'counter-stats-row',
  'counter-editorial-milestone',
] as const

export type LibraryListWidgetGroupId = 'bannerSlider' | 'animatedCounter'

export type LibraryListWidgetGroup = {
  id: LibraryListWidgetGroupId
  /** Short rail label */
  label: string
  /** Underlying insertable widget types (SlideItem intentionally omitted). */
  widgetTypes: readonly string[]
  /** Pattern preset IDs owned by this group (may insert Columns, etc.). */
  patternIds: readonly string[]
  /** MCP / auditor intent hint */
  intent: string
}

export const LIBRARY_LIST_WIDGET_GROUPS: readonly LibraryListWidgetGroup[] = [
  {
    id: 'bannerSlider',
    label: 'Banner Slider',
    widgetTypes: ['BannerSlider'],
    patternIds: BANNER_SLIDER_PATTERN_IDS,
    intent: 'ui.banner-slider',
  },
  {
    id: 'animatedCounter',
    label: 'Animated Counter',
    widgetTypes: ['AnimatedCounter'],
    patternIds: ANIMATED_COUNTER_PATTERN_IDS,
    intent: 'ui.animated-counter',
  },
] as const

const WIDGET_TYPE_TO_GROUP = new Map<string, LibraryListWidgetGroupId>(
  LIBRARY_LIST_WIDGET_GROUPS.flatMap((group) =>
    group.widgetTypes.map((type) => [type, group.id] as const),
  ),
)

const PATTERN_ID_TO_GROUP = new Map<string, LibraryListWidgetGroupId>(
  LIBRARY_LIST_WIDGET_GROUPS.flatMap((group) =>
    group.patternIds.map((id) => [id, group.id] as const),
  ),
)

export function isLibraryListWidgetGroup(id: string): id is LibraryListWidgetGroupId {
  return LIBRARY_LIST_WIDGET_GROUPS.some((group) => group.id === id)
}

export function getLibraryListWidgetGroup(id: string): LibraryListWidgetGroup | undefined {
  return LIBRARY_LIST_WIDGET_GROUPS.find((group) => group.id === id)
}

/** User-facing library group for a registry widget type (not Slot-only SlideItem). */
export function libraryListGroupForWidgetType(type: string): LibraryListWidgetGroupId | null {
  return WIDGET_TYPE_TO_GROUP.get(type) ?? null
}

/** User-facing library group for a Pattern preset (ID override beats widgetType). */
export function libraryListGroupForPattern(record: {
  id: string
  widgetType: string
}): LibraryListWidgetGroupId | null {
  return PATTERN_ID_TO_GROUP.get(record.id) ?? libraryListGroupForWidgetType(record.widgetType)
}

/** Slot-only components must never appear as standalone Library Basics. */
export const LIBRARY_SLOT_ONLY_WIDGET_TYPES = ['SlideItem'] as const

export function isLibrarySlotOnlyWidget(type: string) {
  return (LIBRARY_SLOT_ONLY_WIDGET_TYPES as readonly string[]).includes(type)
}

export type LibraryGroupAuditFinding = {
  code:
    | 'WRONG_FUNCTIONAL_GROUP'
    | 'PATTERN_MISSING_FROM_GROUP'
    | 'BASIC_MISSING_FROM_GROUP'
    | 'SLOT_ONLY_EXPOSED'
    | 'UNKNOWN_PATTERN_IN_GROUP'
  message: string
  groupId?: string
  widgetType?: string
  patternId?: string
}

/**
 * Architecture Auditor helpers for List Widget grouping (read-only checks).
 * Callers supply the visible library type set and pattern catalog.
 */
export function auditLibraryListWidgetGroups(args: {
  visibleWidgetTypes: readonly string[]
  patternIds: readonly string[]
  groupOfWidget: (type: string) => string
  groupOfPattern: (patternId: string, widgetType: string) => string | null
  patterns: readonly { id: string; widgetType: string }[]
}): LibraryGroupAuditFinding[] {
  const findings: LibraryGroupAuditFinding[] = []
  for (const type of LIBRARY_SLOT_ONLY_WIDGET_TYPES) {
    if (args.visibleWidgetTypes.includes(type)) {
      findings.push({
        code: 'SLOT_ONLY_EXPOSED',
        message: `${type} is slot-only and must not appear as a standalone Library widget.`,
        widgetType: type,
      })
    }
  }

  for (const group of LIBRARY_LIST_WIDGET_GROUPS) {
    for (const type of group.widgetTypes) {
      if (!args.visibleWidgetTypes.includes(type)) {
        findings.push({
          code: 'BASIC_MISSING_FROM_GROUP',
          message: `Basic widget ${type} is not visible for List Widget "${group.label}".`,
          groupId: group.id,
          widgetType: type,
        })
        continue
      }
      if (args.groupOfWidget(type) !== group.id) {
        findings.push({
          code: 'WRONG_FUNCTIONAL_GROUP',
          message: `${type} is assigned to "${args.groupOfWidget(type)}" instead of "${group.id}".`,
          groupId: group.id,
          widgetType: type,
        })
      }
    }
    for (const patternId of group.patternIds) {
      const record = args.patterns.find((pattern) => pattern.id === patternId)
      if (!record) {
        findings.push({
          code: 'PATTERN_MISSING_FROM_GROUP',
          message: `Pattern ${patternId} is missing from the catalog for "${group.label}".`,
          groupId: group.id,
          patternId,
        })
        continue
      }
      if (!args.patternIds.includes(patternId)) {
        findings.push({
          code: 'PATTERN_MISSING_FROM_GROUP',
          message: `Pattern ${patternId} is not exposed in List Widget "${group.label}".`,
          groupId: group.id,
          patternId,
        })
      }
      const assigned = args.groupOfPattern(record.id, record.widgetType)
      if (assigned !== group.id) {
        findings.push({
          code: 'WRONG_FUNCTIONAL_GROUP',
          message: `Pattern ${patternId} resolves to group "${assigned}" instead of "${group.id}".`,
          groupId: group.id,
          patternId,
        })
      }
    }
  }
  return findings
}
