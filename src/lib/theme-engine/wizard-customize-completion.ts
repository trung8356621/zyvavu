/**
 * Theme Customize Step 1 completion is derived from a verified Payload draft
 * for the selected Theme ID — never from sessionStorage alone.
 */

import type { ThemeTokens } from './types'

export type CustomizeColorSwatch = { token: string; value: string }

export type CustomizeDraftPreview = {
  revision: number | null
  updatedAt: string | null
  colors: CustomizeColorSwatch[]
  typography: {
    headingFont?: string
    bodyFont?: string
    baseFontSize?: string
    samples: Array<{ token: string; summary: string }>
  }
  spacing: Array<{ token: string; value: string }>
  layout: Array<{ token: string; value: string }>
  radius: Array<{ token: string; value: string }>
}

export type CustomizeDraftCheck = {
  complete: boolean
  preview?: CustomizeDraftPreview
  errors?: string[]
}

const COLOR_PRIORITY = [
  'background',
  'surface',
  'primary',
  'accent',
  'text',
  'textMuted',
  'border',
  'primaryHover',
  'headerBackground',
  'headerText',
  'headerBorder',
] as const

const TYPOGRAPHY_SAMPLES = ['h1', 'h2', 'p1', 'p2'] as const
const SPACING_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const
const LAYOUT_ORDER = [
  'containerWidth',
  'narrowWidth',
  'wideWidth',
  'pageSpacing',
  'alignment',
  'contentAlignment',
] as const
const RADIUS_ORDER = ['sm', 'md', 'lg', 'pill'] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function orderedEntries(
  source: Record<string, unknown> | undefined,
  preferred: readonly string[],
): Array<{ token: string; value: string }> {
  if (!source) return []
  const seen = new Set<string>()
  const out: Array<{ token: string; value: string }> = []
  for (const token of preferred) {
    const value = source[token]
    if (!isNonEmptyString(value)) continue
    seen.add(token)
    out.push({ token, value: value.trim() })
  }
  for (const token of Object.keys(source).sort()) {
    if (seen.has(token)) continue
    const value = source[token]
    if (!isNonEmptyString(value)) continue
    out.push({ token, value: value.trim() })
  }
  return out
}

function typographySampleSummary(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  const record = entry as Record<string, unknown>
  const parts = [record.size, record.weight, record.lineHeight]
    .filter(isNonEmptyString)
    .map((part) => part.trim())
  return parts.length ? parts.join(' / ') : null
}

/** Compact preview from a verified Theme Customize draft. Omits missing fields. */
export function buildCustomizeDraftPreview(draft: {
  tokens?: ThemeTokens | null
  revision?: unknown
  updatedAt?: unknown
} | null | undefined): CustomizeDraftPreview | null {
  const tokens = draft?.tokens
  if (!tokens || typeof tokens !== 'object') return null

  const colors = orderedEntries(
    tokens.colors as Record<string, unknown> | undefined,
    COLOR_PRIORITY,
  )
  const spacing = orderedEntries(
    tokens.spacing as Record<string, unknown> | undefined,
    SPACING_ORDER,
  )
  const layout = orderedEntries(
    tokens.layout as Record<string, unknown> | undefined,
    LAYOUT_ORDER,
  )
  const radius = orderedEntries(
    tokens.radius as Record<string, unknown> | undefined,
    RADIUS_ORDER,
  )

  const typographySource = tokens.typography
  const headingFont = isNonEmptyString(typographySource?.fontFamilyHeading)
    ? typographySource.fontFamilyHeading.trim()
    : undefined
  const bodyFont = isNonEmptyString(typographySource?.fontFamily)
    ? typographySource.fontFamily.trim()
    : undefined
  const baseFontSize = isNonEmptyString(typographySource?.baseFontSize)
    ? typographySource.baseFontSize.trim()
    : undefined
  const samples: Array<{ token: string; summary: string }> = []
  if (typographySource) {
    for (const token of TYPOGRAPHY_SAMPLES) {
      const summary = typographySampleSummary(typographySource[token])
      if (summary) samples.push({ token, summary })
    }
  }

  const revision =
    typeof draft?.revision === 'number' && Number.isSafeInteger(draft.revision)
      ? draft.revision
      : null
  const updatedAt = isNonEmptyString(draft?.updatedAt) ? draft.updatedAt.trim() : null

  return {
    revision,
    updatedAt,
    colors,
    typography: {
      ...(headingFont ? { headingFont } : {}),
      ...(bodyFont ? { bodyFont } : {}),
      ...(baseFontSize ? { baseFontSize } : {}),
      samples,
    },
    spacing,
    layout,
    radius,
  }
}

export function interpretCustomizeDraftCheck(input: {
  ok: boolean
  success?: boolean
  errors?: string[]
  preview?: CustomizeDraftPreview | null
}): CustomizeDraftCheck {
  if (input.ok && input.success === true) {
    const preview = input.preview && typeof input.preview === 'object' ? input.preview : undefined
    return preview ? { complete: true, preview } : { complete: true }
  }
  return {
    complete: false,
    ...(Array.isArray(input.errors) && input.errors.length > 0
      ? { errors: input.errors }
      : {}),
  }
}

export async function fetchCustomizeDraftComplete(
  themeId: string,
  init?: RequestInit,
): Promise<CustomizeDraftCheck> {
  const query = new URLSearchParams({ themeId, action: 'check-draft' })
  try {
    const response = await fetch(`/api/theme-customizer/import?${query}`, {
      method: 'POST',
      ...init,
    })
    const result = (await response.json().catch(() => ({}))) as {
      success?: boolean
      errors?: string[]
      preview?: CustomizeDraftPreview
    }
    return interpretCustomizeDraftCheck({
      ok: response.ok,
      success: result.success,
      errors: result.errors,
      preview: result.preview,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { complete: false }
    }
    return { complete: false, errors: ['Unable to verify the theme draft.'] }
  }
}
