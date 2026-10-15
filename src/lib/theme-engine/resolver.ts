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

export const ACTIVE_THEME_KEY = 'active_theme_id'

/**
 * Resolves the currently active theme ID from payload-preferences.
 * Falls back to DEFAULT_THEME_ID ('corporate').
 */
export async function resolveActiveThemeId(payload?: Payload): Promise<string> {
  if (!payload) return DEFAULT_THEME_ID

  try {
    const pref = await payload
      .find({
        collection: 'payload-preferences' as any,
        where: { key: { equals: ACTIVE_THEME_KEY } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    const raw = pref?.docs?.[0]?.value
    const id = typeof raw === 'string' ? raw : (raw as any)?.themeId
    if (typeof id === 'string' && isValidThemeId(id)) {
      return normalizeThemeId(id)
    }
  } catch {
    // Safe fallback
  }

  return DEFAULT_THEME_ID
}

/**
 * Sets the active theme site-wide.
 */
export async function setActiveThemeId(payload: Payload, themeId: string): Promise<boolean> {
  if (!isValidThemeId(themeId)) {
    throw new Error(`Invalid theme ID: "${themeId}"`)
  }

  const normalized = normalizeThemeId(themeId)

  try {
    const existing = await payload
      .find({
        collection: 'payload-preferences' as any,
        where: { key: { equals: ACTIVE_THEME_KEY } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    if (existing?.docs?.length) {
      await payload.update({
        collection: 'payload-preferences' as any,
        id: existing.docs[0].id,
        data: { value: normalized },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'payload-preferences' as any,
        data: { key: ACTIVE_THEME_KEY, value: normalized },
        overrideAccess: true,
      })
    }
    return true
  } catch {
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
 * 1. Database template override scoped by theme: theme_template_${themeId}_${context}
 * 2. If theme is default/corporate, check legacy key: theme_template_${context}
 * 3. Bundled template JSON for this theme
 * 4. Safe fallback
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
    // 1. Check scoped payload-preferences key: theme_template_${targetTheme}_${context}
    const scopedKey = `theme_template_${targetTheme}_${context}`
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
      if (validation.valid) {
        return prefDoc
      }
    }

    // 2. If targetTheme is corporate/default, check legacy un-scoped key
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
        if (validation.valid) {
          return legacyDoc
        }
      }
    }
  } catch (err) {
    // Fail-safe to bundled template
  }

  return fallback
}

/**
 * Persists a user-edited template override scoped by theme ID to PostgreSQL.
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

  // 3. Persist to payload_preferences with scoped key
  const existing = await payload
    .find({
      collection: 'payload-preferences' as any,
      where: { key: { equals: scopedKey } },
      limit: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  if (existing?.docs?.length) {
    await payload.update({
      collection: 'payload-preferences' as any,
      id: existing.docs[0].id,
      data: {
        value: toSave,
      },
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'payload-preferences' as any,
      data: {
        key: scopedKey,
        value: toSave,
      },
      overrideAccess: true,
    })
  }

  // 4. If corporate, keep legacy key in sync for backwards compatibility
  if (targetTheme === 'corporate') {
    try {
      const legacyKey = `theme_template_${context}`
      const legacyExisting = await payload
        .find({
          collection: 'payload-preferences' as any,
          where: { key: { equals: legacyKey } },
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null)

      if (legacyExisting?.docs?.length) {
        await payload.update({
          collection: 'payload-preferences' as any,
          id: legacyExisting.docs[0].id,
          data: { value: toSave },
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'payload-preferences' as any,
          data: { key: legacyKey, value: toSave },
          overrideAccess: true,
        })
      }
    } catch {
      // safe ignore
    }
  }

  return { success: true }
}
