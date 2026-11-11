import type { Payload } from 'payload'
import { normalizeThemeId } from './themes'
import { resolveActiveThemeId } from './resolver'
import type { ThemeTemplateDocument } from './types'
import { validateThemeTemplateDocument } from './validation'
import {
  allocateLoopItemId,
  createEmptyLoopItemDocument,
} from './loop-item-document'
import type { LoopItemTemplateIndex, LoopItemTemplateMeta } from './loop-item-templates-types'

export type { LoopItemTemplateMeta, LoopItemTemplateIndex } from './loop-item-templates-types'
export {
  allocateLoopItemId,
  createEmptyLoopItemDocument,
  slugifyLoopItemName,
} from './loop-item-document'

function indexKey(themeId: string) {
  return `theme_loop_items_${normalizeThemeId(themeId)}`
}

export function loopItemDocKey(themeId: string, loopItemId: string) {
  return `theme_template_${normalizeThemeId(themeId)}_loopItem_${loopItemId}`
}

async function readThemeTemplates(payload: Payload): Promise<Record<string, unknown>> {
  const settings = await payload
    .findGlobal({ slug: 'settings', overrideAccess: true })
    .catch(() => null)
  const templates = (settings as any)?.themeTemplates
  return templates && typeof templates === 'object' ? { ...templates } : {}
}

async function writeThemeTemplates(
  payload: Payload,
  next: Record<string, unknown>,
): Promise<void> {
  await payload.updateGlobal({
    slug: 'settings',
    data: { themeTemplates: next },
    overrideAccess: true,
  })
}

export async function listLoopItemTemplates(
  payload: Payload,
  themeId?: string,
): Promise<LoopItemTemplateMeta[]> {
  const targetTheme = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const store = await readThemeTemplates(payload)
  const index = store[indexKey(targetTheme)] as LoopItemTemplateIndex | undefined
  if (!index || !Array.isArray(index.items)) return []
  return index.items.filter((item) => item && typeof item.id === 'string' && item.name)
}

export async function resolveLoopItemTemplate(
  payload: Payload,
  loopItemId: string,
  themeId?: string,
): Promise<ThemeTemplateDocument | null> {
  if (!loopItemId?.trim()) return null
  const targetTheme = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const store = await readThemeTemplates(payload)
  const doc = store[loopItemDocKey(targetTheme, loopItemId)] as ThemeTemplateDocument | undefined
  if (!doc || typeof doc !== 'object') return null
  const validation = validateThemeTemplateDocument(doc, 'loopItem')
  if (!validation.valid) return null
  return doc
}

export async function createLoopItemTemplate(
  payload: Payload,
  name: string,
  themeId?: string,
): Promise<
  | { success: true; meta: LoopItemTemplateMeta; document: ThemeTemplateDocument }
  | { success: false; errors: string[] }
> {
  const trimmed = String(name || '').trim()
  if (!trimmed) return { success: false, errors: ['Template name is required'] }

  const targetTheme = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const store = await readThemeTemplates(payload)
  const key = indexKey(targetTheme)
  const index = (store[key] as LoopItemTemplateIndex | undefined) || { items: [] }
  const items = Array.isArray(index.items) ? [...index.items] : []
  const id = allocateLoopItemId(trimmed, items)
  const document = createEmptyLoopItemDocument(trimmed, id)
  const meta: LoopItemTemplateMeta = {
    id,
    name: trimmed,
    updatedAt: document.updatedAt,
  }

  const validation = validateThemeTemplateDocument(document, 'loopItem')
  if (!validation.valid) return { success: false, errors: validation.errors }

  store[key] = { items: [...items, meta] }
  store[loopItemDocKey(targetTheme, id)] = document
  await writeThemeTemplates(payload, store)

  return { success: true, meta, document }
}

export async function saveLoopItemTemplate(
  payload: Payload,
  loopItemId: string,
  document: ThemeTemplateDocument,
  themeId?: string,
): Promise<{ success: boolean; errors?: string[] }> {
  if (!loopItemId?.trim()) return { success: false, errors: ['Loop Item id is required'] }
  const targetTheme = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const validation = validateThemeTemplateDocument(document, 'loopItem')
  if (!validation.valid) return { success: false, errors: validation.errors }

  const store = await readThemeTemplates(payload)
  const key = indexKey(targetTheme)
  const index = (store[key] as LoopItemTemplateIndex | undefined) || { items: [] }
  const items = Array.isArray(index.items) ? [...index.items] : []
  const name =
    (typeof document.metadata?.name === 'string' && document.metadata.name.trim()) ||
    items.find((item) => item.id === loopItemId)?.name ||
    loopItemId

  const toSave: ThemeTemplateDocument = {
    ...document,
    template: 'loopItem',
    metadata: {
      ...(document.metadata || {}),
      name,
      loopItemId,
    },
    updatedAt: new Date().toISOString(),
  }

  const nextItems = items.some((item) => item.id === loopItemId)
    ? items.map((item) =>
        item.id === loopItemId ? { ...item, name, updatedAt: toSave.updatedAt } : item,
      )
    : [...items, { id: loopItemId, name, updatedAt: toSave.updatedAt }]

  store[key] = { items: nextItems }
  store[loopItemDocKey(targetTheme, loopItemId)] = toSave
  await writeThemeTemplates(payload, store)
  return { success: true }
}
