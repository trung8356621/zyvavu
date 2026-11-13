import type { Payload, PayloadRequest } from 'payload'
import { normalizeThemeId } from './themes'
import { resolveActiveThemeId, getBundledTemplate } from './resolver'
import type { ThemeTemplateDocument } from './types'
import { validateThemeTemplateDocument } from './validation'
import {
  LEGACY_TEMPLATE_VERSION_ID,
  isVersionableTemplateContext,
  legacyTemplateDocKey,
  templateVersionDocKey,
  templateVersionIndexKey,
  templateVersionLabel,
  type TemplateVersionIndex,
  type TemplateVersionMeta,
  type VersionableTemplateContext,
} from './template-versions-types'

export type {
  TemplateVersionIndex,
  TemplateVersionMeta,
  VersionableTemplateContext,
} from './template-versions-types'
export {
  LEGACY_TEMPLATE_VERSION_ID,
  VERSIONABLE_TEMPLATE_CONTEXTS,
  isVersionableTemplateContext,
  legacyTemplateDocKey,
  setActiveVersionLabel,
  templateVersionDocKey,
  templateVersionIndexKey,
  templateVersionLabel,
} from './template-versions-types'

type Req = Partial<PayloadRequest> | undefined

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

async function readStore(payload: Payload, req?: Req): Promise<Record<string, unknown>> {
  const settings = await payload
    .findGlobal({ slug: 'settings', overrideAccess: true, ...(req ? { req } : {}) })
    .catch(() => null)
  const templates = (settings as { themeTemplates?: unknown } | null)?.themeTemplates
  return object(templates) ? { ...templates } : {}
}

async function writeStore(payload: Payload, next: Record<string, unknown>, req?: Req) {
  await payload.updateGlobal({
    slug: 'settings',
    data: { themeTemplates: next },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
}

function assertContext(context: string): VersionableTemplateContext {
  if (!isVersionableTemplateContext(context)) {
    throw new Error(`Template Versions are not available for "${context}".`)
  }
  return context
}

function readIndex(
  store: Record<string, unknown>,
  themeId: string,
  context: VersionableTemplateContext,
): TemplateVersionIndex | null {
  const raw = store[templateVersionIndexKey(themeId, context)]
  if (!object(raw) || typeof raw.primaryId !== 'string' || !Array.isArray(raw.items)) return null
  const items = raw.items.filter(
    (item): item is TemplateVersionMeta =>
      object(item) && typeof item.id === 'string' && item.id.trim() !== '' && typeof item.name === 'string',
  )
  if (!items.length) return null
  return { primaryId: raw.primaryId, items }
}

function hasLegacyDoc(
  store: Record<string, unknown>,
  themeId: string,
  context: VersionableTemplateContext,
): boolean {
  const doc = store[legacyTemplateDocKey(themeId, context)]
  return object(doc) && Array.isArray(doc.content)
}

function nextVersionName(context: VersionableTemplateContext, items: TemplateVersionMeta[]): string {
  const base = templateVersionLabel(context)
  let n = items.length + 1
  const taken = new Set(items.map((item) => item.name))
  while (taken.has(`${base} v${n}`)) n += 1
  return `${base} v${n}`
}

export function allocateTemplateVersionId(existing: TemplateVersionMeta[]): string {
  const taken = new Set(existing.map((item) => item.id))
  let n = 2
  while (taken.has(`v${n}`)) n += 1
  return `v${n}`
}

function ensureIndex(
  store: Record<string, unknown>,
  themeId: string,
  context: VersionableTemplateContext,
): TemplateVersionIndex {
  const existing = readIndex(store, themeId, context)
  if (existing) return existing
  const updatedAt = hasLegacyDoc(store, themeId, context)
    ? (store[legacyTemplateDocKey(themeId, context)] as ThemeTemplateDocument).updatedAt
    : undefined
  return {
    primaryId: LEGACY_TEMPLATE_VERSION_ID,
    items: [{
      id: LEGACY_TEMPLATE_VERSION_ID,
      name: `${templateVersionLabel(context)} v1`,
      updatedAt,
    }],
  }
}

/** Read-only listing. Never writes. Synthetic v1 when no index exists. */
export async function listTemplateVersions(
  payload: Payload,
  context: VersionableTemplateContext | string,
  themeId?: string,
): Promise<{ index: TemplateVersionIndex; synthetic: boolean }> {
  const ctx = assertContext(context)
  const target = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const store = await readStore(payload)
  const existing = readIndex(store, target, ctx)
  if (existing) return { index: existing, synthetic: false }

  const updatedAt = hasLegacyDoc(store, target, ctx)
    ? (store[legacyTemplateDocKey(target, ctx)] as ThemeTemplateDocument).updatedAt
    : undefined
  return {
    synthetic: true,
    index: {
      primaryId: LEGACY_TEMPLATE_VERSION_ID,
      items: [{
        id: LEGACY_TEMPLATE_VERSION_ID,
        name: `${templateVersionLabel(ctx)} v1`,
        updatedAt,
      }],
    },
  }
}

/**
 * Resolve a specific version for Builder (not necessarily Primary).
 * `v1` without a versioned doc falls back to legacy override, then bundled — no write.
 */
export async function resolveTemplateVersion(
  payload: Payload,
  context: VersionableTemplateContext | string,
  versionId: string,
  themeId?: string,
  req?: Req,
): Promise<ThemeTemplateDocument | null> {
  if (!versionId?.trim()) return null
  const ctx = assertContext(context)
  const target = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const store = await readStore(payload, req)

  const versioned = store[templateVersionDocKey(target, ctx, versionId)]
  if (object(versioned) && Array.isArray(versioned.content)) {
    const validation = validateThemeTemplateDocument(versioned, ctx)
    if (!validation.valid) return null
    return versioned as ThemeTemplateDocument
  }

  if (versionId === LEGACY_TEMPLATE_VERSION_ID) {
    const legacy = store[legacyTemplateDocKey(target, ctx)]
    if (object(legacy) && Array.isArray(legacy.content)) {
      const validation = validateThemeTemplateDocument(legacy, ctx)
      if (!validation.valid) return null
      return legacy as ThemeTemplateDocument
    }
    if (target === 'corporate') {
      const corporateLegacy = store[`theme_template_${ctx}`]
      if (object(corporateLegacy) && Array.isArray(corporateLegacy.content)) {
        const validation = validateThemeTemplateDocument(corporateLegacy, ctx)
        if (validation.valid) return corporateLegacy as ThemeTemplateDocument
      }
    }
    return getBundledTemplate(ctx, target)
  }

  return null
}

/** Frontend Primary for one theme + template context. */
export async function resolvePrimaryTemplateDocument(
  payload: Payload,
  context: VersionableTemplateContext | string,
  themeId: string,
  store?: Record<string, unknown>,
): Promise<ThemeTemplateDocument | null> {
  const ctx = assertContext(context)
  const target = normalizeThemeId(themeId)
  const data = store ?? (await readStore(payload))
  const index = readIndex(data, target, ctx)
  if (!index?.primaryId) return null
  const versioned = data[templateVersionDocKey(target, ctx, index.primaryId)]
  if (object(versioned) && Array.isArray(versioned.content)) {
    const validation = validateThemeTemplateDocument(versioned, ctx)
    if (validation.valid) return versioned as ThemeTemplateDocument
    return null
  }
  if (index.primaryId === LEGACY_TEMPLATE_VERSION_ID) {
    const legacy = data[legacyTemplateDocKey(target, ctx)]
    if (object(legacy) && Array.isArray(legacy.content)) {
      const validation = validateThemeTemplateDocument(legacy, ctx)
      if (validation.valid) return legacy as ThemeTemplateDocument
    }
  }
  return null
}

export async function saveTemplateVersion(
  payload: Payload,
  context: VersionableTemplateContext | string,
  versionId: string,
  document: ThemeTemplateDocument,
  themeId?: string,
  req?: Req,
): Promise<{ success: boolean; errors?: string[]; meta?: TemplateVersionMeta }> {
  if (!versionId?.trim()) return { success: false, errors: ['Template version id is required'] }
  const ctx = assertContext(context)
  const target = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const previous = await resolveTemplateVersion(payload, ctx, versionId, target, req)
  const validation = validateThemeTemplateDocument(document, ctx, previous)
  if (!validation.valid) return { success: false, errors: validation.errors }

  const toSave: ThemeTemplateDocument = {
    ...document,
    template: ctx,
    metadata: {
      ...(document.metadata || {}),
      templateVersionId: versionId,
      ...(ctx === 'home' ? { homeVersionId: versionId } : {}),
    },
    updatedAt: new Date().toISOString(),
  }

  try {
    const store = await readStore(payload, req)
    const index = ensureIndex(store, target, ctx)
    const items = [...index.items]
    if (!items.some((item) => item.id === versionId)) {
      items.push({ id: versionId, name: nextVersionName(ctx, items), updatedAt: toSave.updatedAt })
    }
    const nextItems = items.map((item) =>
      item.id === versionId ? { ...item, updatedAt: toSave.updatedAt } : item,
    )

    const useLegacyKey =
      versionId === LEGACY_TEMPLATE_VERSION_ID &&
      !object(store[templateVersionDocKey(target, ctx, LEGACY_TEMPLATE_VERSION_ID)])

    if (useLegacyKey) {
      store[legacyTemplateDocKey(target, ctx)] = toSave
      if (target === 'corporate') store[`theme_template_${ctx}`] = toSave
    } else {
      store[templateVersionDocKey(target, ctx, versionId)] = toSave
    }

    store[templateVersionIndexKey(target, ctx)] = { primaryId: index.primaryId, items: nextItems }
    await writeStore(payload, store, req)
    return { success: true, meta: nextItems.find((item) => item.id === versionId) }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to save template version.'],
    }
  }
}

export async function createTemplateVersion(
  payload: Payload,
  args: {
    themeId?: string
    context: VersionableTemplateContext | string
    name?: string
    document: ThemeTemplateDocument
    sourceVersionId?: string
  },
  req?: Req,
): Promise<
  | { success: true; meta: TemplateVersionMeta; document: ThemeTemplateDocument }
  | { success: false; errors: string[] }
> {
  const ctx = assertContext(args.context)
  if (!args.themeId?.trim()) {
    return {
      success: false,
      errors: ['Theme ID đích là bắt buộc. Không dùng Active theme làm fallback.'],
    }
  }
  const target = normalizeThemeId(args.themeId)
  const validation = validateThemeTemplateDocument(args.document, ctx)
  if (!validation.valid) return { success: false, errors: validation.errors }

  try {
    const store = await readStore(payload, req)
    const index = ensureIndex(store, target, ctx)
    const id = allocateTemplateVersionId(index.items)
    const name = (args.name || '').trim() || nextVersionName(ctx, index.items)
    const document: ThemeTemplateDocument = {
      ...args.document,
      template: ctx,
      metadata: {
        ...(args.document.metadata || {}),
        templateVersionId: id,
        ...(ctx === 'home' ? { homeVersionId: id } : {}),
        ...(args.sourceVersionId ? { sourceVersionId: args.sourceVersionId } : {}),
        name,
      },
      updatedAt: new Date().toISOString(),
    }
    const meta: TemplateVersionMeta = { id, name, updatedAt: document.updatedAt }
    store[templateVersionDocKey(target, ctx, id)] = document
    store[templateVersionIndexKey(target, ctx)] = {
      primaryId: index.primaryId,
      items: [...index.items, meta],
    }
    await writeStore(payload, store, req)
    return { success: true, meta, document }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to create template version.'],
    }
  }
}

export async function setPrimaryTemplateVersion(
  payload: Payload,
  context: VersionableTemplateContext | string,
  versionId: string,
  themeId?: string,
  req?: Req,
): Promise<{ success: boolean; errors?: string[]; index?: TemplateVersionIndex }> {
  if (!versionId?.trim()) return { success: false, errors: ['Template version id is required'] }
  const ctx = assertContext(context)
  const target = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const doc = await resolveTemplateVersion(payload, ctx, versionId, target, req)
  if (!doc) return { success: false, errors: ['Template version not found or invalid.'] }
  const validation = validateThemeTemplateDocument(doc, ctx)
  if (!validation.valid) return { success: false, errors: validation.errors }

  try {
    const store = await readStore(payload, req)
    const index = ensureIndex(store, target, ctx)
    if (!index.items.some((item) => item.id === versionId)) {
      index.items.push({
        id: versionId,
        name: versionId === LEGACY_TEMPLATE_VERSION_ID
          ? `${templateVersionLabel(ctx)} v1`
          : nextVersionName(ctx, index.items),
        updatedAt: doc.updatedAt,
      })
    }
    const next: TemplateVersionIndex = { primaryId: versionId, items: index.items }
    store[templateVersionIndexKey(target, ctx)] = next
    await writeStore(payload, store, req)
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/')
    } catch {
      // Outside a Next.js request (unit tests / local scripts).
    }
    return { success: true, index: next }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to set active template version.'],
    }
  }
}
