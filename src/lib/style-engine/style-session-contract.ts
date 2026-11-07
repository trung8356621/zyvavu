/**
 * Shared Style Session contract (direct-commit era).
 *
 * Product rules (2026-11-07):
 * - Edit → update real Editor state → Canvas (no Apply boundary).
 * - Cancel restores the snapshot captured when the Style session opened (scoped).
 * - Reset restores domain defaults/inheritance (distinct from Cancel / Undo).
 * - Undo/Redo are History transactions (Puck-owned when style uses setData+recordHistory).
 *
 * Status labels for callers: CONFIRMED against Puck 0.23 source where noted.
 */

import type { WidgetSemanticStyle } from '@/lib/theme-engine/types'
import type { StyleModalDomain } from './domains'
import { resetStyleDomain } from './domains'

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

/** Cancel-session restore target: exact style at session open. */
export function getCancelRestoreStyle(session: StyleSessionSnapshot): WidgetSemanticStyle {
  return cloneStyle(session.style)
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
