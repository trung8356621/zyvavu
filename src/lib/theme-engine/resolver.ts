import type { Payload } from 'payload'
import type { TemplateContext, ThemeTemplateDocument } from './types'
import { validateThemeTemplateDocument } from './validation'
import {
  DEFAULT_THEME_ID,
  getBundledTemplateForTheme,
  getInstalledTheme,
  isValidThemeId,
  normalizeThemeId,
} from './themes'

export class InvalidStoredTemplateError extends Error {}

export const ACTIVE_THEME_KEY = 'active_theme_id'

/**
 * Resolves the currently active theme ID from Settings global.
 * Falls back to legacy payload-preferences, then to DEFAULT_THEME_ID ('corporate').
 */
export async function resolveActiveThemeId(payload?: Payload): Promise<string> {
  if (!payload) return DEFAULT_THEME_ID

  try {
    const settings = await payload
      .findGlobal({
        slug: 'settings',
        overrideAccess: true,
      })
      .catch(() => null)

    const raw = (settings as any)?.activeThemeId
    if (typeof raw === 'string' && isValidThemeId(raw)) {
      return normalizeThemeId(raw)
    }

    // Fallback to legacy payload-preferences if settings doesn't have it yet
    const pref = await payload
      .find({
        collection: 'payload-preferences' as any,
        where: { key: { equals: ACTIVE_THEME_KEY } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    const prefRaw = pref?.docs?.[0]?.value
    const id = typeof prefRaw === 'string' ? prefRaw : (prefRaw as any)?.themeId
    if (typeof id === 'string' && isValidThemeId(id)) {
      return normalizeThemeId(id)
    }
  } catch (err) {
    console.error('[ThemeEngine] resolveActiveThemeId error:', err)
  }

  return DEFAULT_THEME_ID
}

/**
 * Sets the active theme site-wide in Settings global.
 */
export async function setActiveThemeId(payload: Payload, themeId: string): Promise<boolean> {
  if (!isValidThemeId(themeId)) {
    throw new Error(`Invalid theme ID: "${themeId}"`)
  }

  const normalized = normalizeThemeId(themeId)

  try {
    await payload.updateGlobal({
      slug: 'settings',
      data: {
        activeThemeId: normalized,
      },
      overrideAccess: true,
    })
    return true
  } catch (err) {
    console.error('[ThemeEngine] setActiveThemeId failed:', err)
    return false
  }
}

/**
 * Resolves theme ID taking into account secure admin preview overrides.
 * Public visitors cannot switch theme through arbitrary parameters.
 */
export async function resolveCurrentThemeId(
  payload?: Payload,
  options?: { previewTheme?: string; isStaff?: boolean },
): Promise<string> {
  if (options?.isStaff && options.previewTheme && isValidThemeId(options.previewTheme)) {
    return normalizeThemeId(options.previewTheme)
  }
  return resolveActiveThemeId(payload)
}

export async function getPreviewThemeFromCookie(): Promise<string | undefined> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return undefined
    const cookiePreview = cookieStore.get('zyvavu_preview_theme')?.value
    if (cookiePreview && isValidThemeId(cookiePreview)) {
      return normalizeThemeId(cookiePreview)
    }
  } catch {
    // not in request context
  }
  return undefined
}

/**
 * Returns the bundled default template JSON for a context and theme.
 */
export function getBundledTemplate(
  context: TemplateContext,
  themeId: string = DEFAULT_THEME_ID,
): ThemeTemplateDocument {
  return getBundledTemplateForTheme(themeId, context)
}

/**
 * Resolves the template for a given context and theme.
 * Scoped by theme ID and template key.
 *
 * Hierarchy:
 * 1. Site-wide template override in Settings global: themeTemplates[theme_template_${themeId}_${context}]
 * 2. If theme is corporate, check legacy key in Settings: themeTemplates[theme_template_${context}]
 * 3. Fallback to legacy payload-preferences
 * 4. Bundled template JSON for this theme
 * 5. Safe fallback
 */
export async function resolveThemeTemplate(
  payload: Payload,
  context: TemplateContext,
  themeId?: string,
): Promise<ThemeTemplateDocument> {
  const preview = await getPreviewThemeFromCookie()
  const targetTheme = normalizeThemeId(themeId || preview || (await resolveActiveThemeId(payload)))
  const fallback = getBundledTemplate(context, targetTheme)

  try {
    const scopedKey = `theme_template_${targetTheme}_${context}`

    // 1. Check Settings global
    const settings = await payload
      .findGlobal({
        slug: 'settings',
        overrideAccess: true,
      })
      .catch(() => null)

    const settingsTemplates = (settings as any)?.themeTemplates
    if (settingsTemplates && typeof settingsTemplates === 'object') {
      const doc = settingsTemplates[scopedKey] as ThemeTemplateDocument | undefined
      if (doc && typeof doc === 'object') {
        const validation = validateThemeTemplateDocument(doc, context)
        if (validation.valid) return doc
        throw new InvalidStoredTemplateError(validation.errors.join('; '))
      }

      if (targetTheme === 'corporate') {
        const legacyDoc = settingsTemplates[`theme_template_${context}`] as
          ThemeTemplateDocument | undefined
        if (legacyDoc && typeof legacyDoc === 'object') {
          const validation = validateThemeTemplateDocument(legacyDoc, context)
          if (validation.valid) return legacyDoc
          throw new InvalidStoredTemplateError(validation.errors.join('; '))
        }
      }
    }

    // 2. Fallback to legacy payload-preferences
    const preference = await payload
      .find({
        collection: 'payload-preferences' as any,
        where: { key: { equals: scopedKey } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    const prefDoc = preference?.docs?.[0]?.value as ThemeTemplateDocument | undefined
    if (prefDoc && typeof prefDoc === 'object') {
      const validation = validateThemeTemplateDocument(prefDoc, context)
      if (validation.valid) return prefDoc
      throw new InvalidStoredTemplateError(validation.errors.join('; '))
    }

    if (targetTheme === 'corporate') {
      const legacyPref = await payload
        .find({
          collection: 'payload-preferences' as any,
          where: { key: { equals: `theme_template_${context}` } },
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null)

      const legacyDoc = legacyPref?.docs?.[0]?.value as ThemeTemplateDocument | undefined
      if (legacyDoc && typeof legacyDoc === 'object') {
        const validation = validateThemeTemplateDocument(legacyDoc, context)
        if (validation.valid) return legacyDoc
        throw new InvalidStoredTemplateError(validation.errors.join('; '))
      }
    }
  } catch (err) {
    if (err instanceof InvalidStoredTemplateError) throw err
    console.error('[ThemeEngine] resolveThemeTemplate error:', err)
  }

  return fallback
}

/**
 * Persists a user-edited template override scoped by theme ID to Settings global in PostgreSQL.
 * Validates document before saving.
 */
export async function saveThemeTemplateOverride(
  payload: Payload,
  context: TemplateContext,
  document: ThemeTemplateDocument,
  user?: any,
  themeId?: string,
): Promise<{ success: boolean; errors?: string[] }> {
  const targetTheme = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))

  // 1. Load current document to check instance locks
  const currentDoc = await resolveThemeTemplate(payload, context, targetTheme)

  // 2. Validate against schema, policy, and locks
  const validation = validateThemeTemplateDocument(document, context, currentDoc)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const toSave: ThemeTemplateDocument = {
    ...document,
    template: context,
    updatedAt: new Date().toISOString(),
  }

  const scopedKey = `theme_template_${targetTheme}_${context}`

  try {
    // 3. Persist site-wide to Settings global
    const settings = await payload
      .findGlobal({
        slug: 'settings',
        overrideAccess: true,
      })
      .catch(() => null)

    const existingTemplates =
      ((settings as any)?.themeTemplates as Record<string, ThemeTemplateDocument>) || {}
    const updatedTemplates = {
      ...existingTemplates,
      [scopedKey]: toSave,
      ...(targetTheme === 'corporate' ? { [`theme_template_${context}`]: toSave } : {}),
    }

    await payload.updateGlobal({
      slug: 'settings',
      data: {
        themeTemplates: updatedTemplates,
      },
      overrideAccess: true,
    })

    return { success: true }
  } catch (err: any) {
    console.error('[ThemeEngine] saveThemeTemplateOverride failed:', err)
    return { success: false, errors: [err?.message || 'Failed to save theme template.'] }
  }
}
