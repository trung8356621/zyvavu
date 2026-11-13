/**
 * Shared Style Session contract (direct-commit era).
 *
 * Product rules (2026-11-11 PO correction):
 * - Edit → update real Editor state → Canvas (no Apply boundary).
 * - Close / X / Escape = navigation only; never rollback committed edits.
 * - Cancel (explicit) restores only paths this session mutated (session-owned).
 * - Cancel must not overwrite unrelated newer document changes outside dirty paths.
 * - Reset restores domain defaults/inheritance (distinct from Cancel / Undo / Close).
 * - Undo/Redo are History transactions (Puck-owned when style uses setData+recordHistory).
 *
 * Status labels for callers: CONFIRMED against Puck 0.23 source where noted.
 */

import type { WidgetSemanticStyle } from '@/lib/theme-engine/types'
import type { StyleModalDomain } from './domains'
import { resetStyleDomain } from './domains'

/** Style object keys owned by each Style modal domain. */
export const STYLE_DOMAIN_FIELDS: Record<StyleModalDomain, readonly string[]> = {
  animation: ['animation'],
  background: ['background', 'backgroundToken'],
  spacing: ['spacing', 'dimensions', 'section'],
  borders: ['border', 'radius'],
  typography: ['typography', 'colorToken', 'align'],
  shadow: ['shadow'],
  effects: ['effects'],
  button: ['button', 'typography', 'colorToken', 'align'],
}

export type StyleHistoryOwner = 'puck'

/** One chronological step in the Zyvavu coordinator index. Style writes use Puck only. */
export type EditorHistoryStepRef = {
  owner: StyleHistoryOwner
  /** Local Puck history index after the step was recorded. */
  localIndex: number
}

export type StyleSessionSnapshot = {
  componentId: string
  style: WidgetSemanticStyle
  openedAt: number
  /** Domain focus when the session opened (accordion expansion hint). */
  domain?: StyleModalDomain | null
}

export type StyleCommitOptions = {
  /**
   * When true, ask Puck to record history for this setData.
   * CONFIRMED: setData defaults to NOT recording; must pass recordHistory: true.
   * Rapid successive true commits coalesce via Puck's internal 250ms debounce on record().
   */
  recordHistory?: boolean
}

export type StyleControlChange<T = unknown> = {
  componentId: string
  domain: StyleModalDomain | 'palette' | 'session'
  path: string
  value: T
  style: WidgetSemanticStyle
}

export function cloneStyle(style: WidgetSemanticStyle | null | undefined): WidgetSemanticStyle {
  return JSON.parse(JSON.stringify(style || {})) as WidgetSemanticStyle
}

export function stylesEqual(
  a: WidgetSemanticStyle | null | undefined,
  b: WidgetSemanticStyle | null | undefined,
): boolean {
  return JSON.stringify(a || {}) === JSON.stringify(b || {})
}

export function createStyleSessionSnapshot(
  componentId: string,
  style: WidgetSemanticStyle | null | undefined,
  domain?: StyleModalDomain | null,
): StyleSessionSnapshot {
  return {
    componentId,
    style: cloneStyle(style),
    openedAt: Date.now(),
    domain: domain ?? null,
  }
}

/** Full session-open snapshot (legacy helpers / tests). Prefer scoped Cancel below. */
export function getCancelRestoreStyle(session: StyleSessionSnapshot): WidgetSemanticStyle {
  return cloneStyle(session.style)
}

/**
 * Cancel: restore only session-owned (dirty) domains onto the current document style.
 * Untouched domains keep `current` values (including edits from prior closed sessions).
 */
export function restoreSessionOwnedStyleDomains(args: {
  baseline: WidgetSemanticStyle | null | undefined
  current: WidgetSemanticStyle | null | undefined
  dirtyDomains: Iterable<StyleModalDomain>
}): WidgetSemanticStyle {
  const baseline = cloneStyle(args.baseline)
  const next = cloneStyle(args.current) as WidgetSemanticStyle & Record<string, unknown>
  const dirty = new Set(args.dirtyDomains)
  if (!dirty.size) return next

  for (const domain of dirty) {
    const fields = STYLE_DOMAIN_FIELDS[domain] || []
    for (const field of fields) {
      const value = (baseline as Record<string, unknown>)[field]
      if (value === undefined) delete next[field]
      else next[field] = JSON.parse(JSON.stringify(value))
    }
  }
  return next
}

/** CategoryList presentation keys owned by each Style Target. */
export const CATEGORY_LIST_TARGET_FIELDS = {
  container: ['container', 'indentPx'],
  parentItem: ['itemParent'],
  childItem: ['itemChild'],
  marker: ['marker'],
  chevron: ['chevron'],
} as const

export type CategoryListSessionTarget = keyof typeof CATEGORY_LIST_TARGET_FIELDS

/** BannerSlider controlsStyle keys owned by each Style Target (bannerItem writes SlideItem.style). */
export const BANNER_SLIDER_TARGET_FIELDS = {
  bannerItem: [],
  arrows: ['arrows'],
  pagination: ['pagination'],
} as const

export type BannerSliderSessionTarget = keyof typeof BANNER_SLIDER_TARGET_FIELDS

/**
 * Cancel for CategoryList: restore only dirty Style Targets onto current presentation.
 * Previously committed targets (e.g. Parent after Close) remain from `current`.
 */
export function restoreSessionOwnedPresentationTargets(args: {
  baseline: Record<string, unknown> | null | undefined
  current: Record<string, unknown> | null | undefined
  dirtyTargets: Iterable<string>
  targetFields?: Record<string, readonly string[]>
}): Record<string, unknown> {
  const fieldMap = args.targetFields || CATEGORY_LIST_TARGET_FIELDS
  const baseline = JSON.parse(JSON.stringify(args.baseline || {})) as Record<string, unknown>
  const next = JSON.parse(JSON.stringify(args.current || {})) as Record<string, unknown>
  for (const target of args.dirtyTargets) {
    const fields = fieldMap[target] || [target]
    for (const field of fields) {
      if (baseline[field] === undefined) delete next[field]
      else next[field] = JSON.parse(JSON.stringify(baseline[field]))
    }
  }
  return next
}

/** Reset one Style domain in-place (still requires a document commit by the host). */
export function getDomainResetStyle(
  style: WidgetSemanticStyle,
  domain: StyleModalDomain,
  options?: { sectionClearsShadowEffects?: boolean },
): WidgetSemanticStyle {
  const next = resetStyleDomain(cloneStyle(style), domain) as WidgetSemanticStyle &
    Record<string, unknown>
  if (options?.sectionClearsShadowEffects && domain === 'borders') {
    delete next.shadow
    delete next.effects
  }
  return next
}

export function mergeStylePartial(
  base: WidgetSemanticStyle,
  partial: Partial<WidgetSemanticStyle>,
): WidgetSemanticStyle {
  return {
    ...base,
    ...partial,
  }
}
