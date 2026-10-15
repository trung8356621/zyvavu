import type { Payload } from 'payload'
import type { TemplateContext, ThemeTemplateDocument } from './types'
import { validateThemeTemplateDocument } from './validation'

// Import bundled default templates
import singleJson from '@/themes/default/templates/single.json'
import pageJson from '@/themes/default/templates/page.json'
import homeJson from '@/themes/default/templates/home.json'
import categoryJson from '@/themes/default/templates/category.json'
import productJson from '@/themes/default/templates/product.json'
import headerJson from '@/themes/default/parts/header.json'
import footerJson from '@/themes/default/parts/footer.json'

const BUNDLED_TEMPLATES: Record<TemplateContext, ThemeTemplateDocument> = {
  single: singleJson as unknown as ThemeTemplateDocument,
  page: pageJson as unknown as ThemeTemplateDocument,
  home: homeJson as unknown as ThemeTemplateDocument,
  category: categoryJson as unknown as ThemeTemplateDocument,
  product: productJson as unknown as ThemeTemplateDocument,
  header: headerJson as unknown as ThemeTemplateDocument,
  footer: footerJson as unknown as ThemeTemplateDocument,
}

/**
 * Returns the bundled default template JSON for a context.
 */
export function getBundledTemplate(context: TemplateContext): ThemeTemplateDocument {
  const tpl = BUNDLED_TEMPLATES[context]
  if (!tpl) {
    throw new Error(`No bundled default template found for context "${context}"`)
  }
  // Deep clone to prevent mutation
  return JSON.parse(JSON.stringify(tpl))
}

/**
 * Resolves the active template for a given context.
 * Hierarchy:
 * 1. Database template override in PostgreSQL
 * 2. Bundled default theme JSON
 * 3. Safe fallback
 */
export async function resolveThemeTemplate(
  payload: Payload,
  context: TemplateContext,
): Promise<ThemeTemplateDocument> {
  const fallback = getBundledTemplate(context)

  try {
    // 1. Check payload_preferences with key theme_template_${context}
    const preference = await payload
      .find({
        collection: 'payload-preferences' as any,
        where: { key: { equals: `theme_template_${context}` } },
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

    // 2. Also check settings.themeTemplates if present
    const settings = await payload
      .findGlobal({
        slug: 'settings',
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    const override = (settings as any)?.themeTemplates?.[context] as ThemeTemplateDocument | undefined
    if (override && typeof override === 'object') {
      const validation = validateThemeTemplateDocument(override, context)
      if (validation.valid) {
        return override
      }
    }
  } catch (err) {
    // Fail-safe to bundled default template
  }

  return fallback
}

/**
 * Persists a user-edited template override to PostgreSQL.
 * Validates document before saving.
 */
export async function saveThemeTemplateOverride(
  payload: Payload,
  context: TemplateContext,
  document: ThemeTemplateDocument,
  user?: any,
): Promise<{ success: boolean; errors?: string[] }> {
  // 1. Load current document to check instance locks
  const currentDoc = await resolveThemeTemplate(payload, context)

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

  // 3. Persist to payload_preferences
  const existing = await payload
    .find({
      collection: 'payload-preferences' as any,
      where: { key: { equals: `theme_template_${context}` } },
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
        key: `theme_template_${context}`,
        value: toSave,
      },
      overrideAccess: true,
    })
  }

  // 4. Try updating settings.themeTemplates if possible
  try {
    const settings = await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })
    const currentTemplates = (settings as any)?.themeTemplates || {}
    await payload.updateGlobal({
      slug: 'settings',
      data: {
        themeTemplates: {
          ...currentTemplates,
          [context]: toSave,
        },
      } as any,
      overrideAccess: true,
    })
  } catch {
    // Safe if column not present
  }

  return { success: true }
}
