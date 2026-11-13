import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { Payload, PayloadRequest } from 'payload'
import { isSiteStaff } from '@/access/roles'
import { readCustomThemeRegistry } from './custom-themes'
import { validateThemeImportDocument, validateThemeTokens } from './presets'
import { ACTIVE_THEME_KEY } from './resolver'
import { mergeThemeConfig, saveThemeStyleOverride } from './styles'
import { MAX_THEME_IMPORT_BYTES } from './theme-import-limit'
import { DEFAULT_THEME_ID, listBundledThemeIds } from './themes'
import type { ThemeConfig, ThemeTokens } from './types'
import { buildCustomizeDraftPreview } from './wizard-customize-completion'

class ImportError extends Error {
  constructor(readonly status: number, readonly errors: string[]) {
    super(errors[0])
  }
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

async function readImport(request: PayloadRequest, themeId: string) {
  const reader = request.body?.getReader()
  if (!reader) throw new ImportError(400, ['Choose a theme.json file.'])
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let text = ''
  let file: unknown
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_THEME_IMPORT_BYTES) {
        await reader.cancel()
        throw new ImportError(413, ['theme.json must be 64 KB or smaller.'])
      }
      text += decoder.decode(value, { stream: true })
    }
    file = JSON.parse(text + decoder.decode())
  } catch (error) {
    if (error instanceof ImportError) throw error
    throw new ImportError(400, ['Invalid UTF-8 JSON file.'])
  } finally {
    reader.releaseLock()
  }
  const validation = validateThemeImportDocument(file, themeId)
  if (!validation.valid) throw new ImportError(400, validation.errors)
  return (file as { tokens: ThemeTokens }).tokens
}

async function readTarget(payload: Payload, themeId: string, req?: Partial<PayloadRequest>) {
  const bundled = listBundledThemeIds()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(themeId) || themeId === 'default' || bundled.includes(themeId)) {
    throw new ImportError(400, ['Select an inactive custom theme.'])
  }
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
  const styles = object(settings.themeStyles) ? settings.themeStyles : {}
  const registry = readCustomThemeRegistry(styles)
  const target = registry.find((theme) => theme.id === themeId)
  if (!target) throw new ImportError(404, ['Selected custom theme was not found.'])

  let activeThemeId = typeof settings.activeThemeId === 'string'
    ? settings.activeThemeId.trim().toLowerCase()
    : undefined
  if (activeThemeId === 'default') activeThemeId = DEFAULT_THEME_ID
  if (!activeThemeId || !(bundled.includes(activeThemeId) ||
    registry.some((theme) => theme.id === activeThemeId))) {
    const prefs = await payload.find({
      collection: 'payload-preferences',
      where: { key: { equals: ACTIVE_THEME_KEY } },
      limit: 1,
      overrideAccess: true,
      req,
    })
    const legacy = prefs.docs[0]?.value
    const legacyId = typeof legacy === 'string' ? legacy : object(legacy) ? legacy.themeId : null
    activeThemeId = typeof legacyId === 'string' ? legacyId.trim().toLowerCase() : undefined
  }
  if (activeThemeId === themeId) {
    throw new ImportError(409, ['The active theme cannot be changed by import.'])
  }

  const draft = styles[`theme_style_${themeId}_draft`] as Partial<ThemeConfig> | undefined
  const published = styles[`theme_style_${themeId}_published`] as Partial<ThemeConfig> | undefined
  const current = mergeThemeConfig(target.themeConfig, draft ?? published)
  return { themeId, draft, published, current }
}

type TokenChange = { field: string; before: string | null; after: string }

function changesToTokens(current: Record<string, unknown>, patch: Record<string, unknown>, prefix = ''): TokenChange[] {
  return Object.entries(patch).flatMap(([key, value]) => {
    const field = prefix + key
    const before = current[key]
    if (object(value)) return changesToTokens(object(before) ? before : {}, value, field + '.')
    if (typeof value !== 'string' || value === before) return []
    return [{ field, before: typeof before === 'string' ? before : null, after: value }]
  })
}

function importRevision(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value, (_key, entry) =>
    object(entry) ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]])) : entry,
  )).digest('hex')
}

function prepareImport(target: Awaited<ReturnType<typeof readTarget>>, imported: ThemeTokens) {
  const tokens = mergeThemeConfig(target.current, { tokens: imported }).tokens
  for (const [key, value] of Object.entries(imported.typography ?? {})) {
    if (object(value)) tokens.typography[key] = { ...target.current.tokens.typography[key], ...value }
  }
  const mergedValidation = validateThemeTokens(tokens)
  if (!mergedValidation.valid) throw new ImportError(400, mergedValidation.errors)
  return {
    tokens,
    changes: changesToTokens(target.current.tokens, imported),
    revision: importRevision([target.themeId, target.draft, target.published, target.current.tokens, imported]),
  }
}

export async function handleThemeImport(request: PayloadRequest) {
  if (!isSiteStaff(request.user)) return Response.json({ success: false, errors: ['Forbidden.'] }, { status: 403 })
  const payload = request.payload
  const query = new URL(request.url ?? 'http://localhost').searchParams
  const themeId = query.get('themeId') ?? ''
  const action = query.get('action')
  let transaction: Awaited<ReturnType<Payload['db']['beginTransaction']>> = null

  try {
    if (action === 'check-draft') {
      const { draft } = await readTarget(payload, themeId)
      if (!draft?.tokens || !validateThemeTokens(draft.tokens).valid) {
        throw new ImportError(409, ['Save a draft in Theme Customizer first.'])
      }
      const preview = buildCustomizeDraftPreview(draft)
      if (!preview) {
        throw new ImportError(409, ['Save a draft in Theme Customizer first.'])
      }
      return Response.json({ success: true, preview })
    }
    if (action !== 'preview' && action !== 'save') throw new ImportError(400, ['Invalid import action.'])
    const patch = await readImport(request, themeId)
    if (action === 'preview') {
      const target = await readTarget(payload, themeId)
      const { changes, revision } = prepareImport(target, patch)
      return Response.json({ success: true, changes, revision })
    }

    const expectedRevision = query.get('revision')
    if (!expectedRevision || !/^[a-f0-9]{64}$/.test(expectedRevision)) {
      throw new ImportError(400, ['Preview and confirm the file before saving.'])
    }
    transaction = await payload.db.beginTransaction({ isolationLevel: 'serializable' })
    if (transaction == null) throw new ImportError(503, ['A database transaction is required to import a draft.'])
    const req = { ...request, transactionID: transaction }
    const target = await readTarget(payload, themeId, req)
    const { tokens, revision } = prepareImport(target, patch)
    if (revision !== expectedRevision) throw new ImportError(409, ['The draft or file changed. Preview the import again.'])

    const slots = (target.draft ?? target.published)?.slots
    const saved = await saveThemeStyleOverride(payload, tokens, false, slots, themeId, { themeId, req })
    if (!saved.success) throw new ImportError(409, ['Draft could not be saved. Preview the import again.'])
    const stored = (await readTarget(payload, themeId, req)).draft
    if (!stored || !isDeepStrictEqual(stored.tokens, tokens) || !isDeepStrictEqual(stored.slots, slots)) {
      throw new ImportError(500, ['Stored draft did not match the confirmed import.'])
    }
    await payload.db.commitTransaction(transaction)
    transaction = null
    const readBack = (await readTarget(payload, themeId)).draft
    if (!isDeepStrictEqual(readBack, stored)) {
      throw new ImportError(409, ['The committed draft could not be verified. Reopen the preview to check the current draft.'])
    }
    return Response.json({ success: true, revision: importRevision(readBack) })
  } catch (error) {
    if (transaction != null) await payload.db.rollbackTransaction(transaction)
    if (error instanceof ImportError) {
      return Response.json({ success: false, errors: error.errors }, { status: error.status })
    }
    const code = (error as { code?: string; cause?: { code?: string } } | null)?.code ??
      (error as { cause?: { code?: string } } | null)?.cause?.code
    if (code === '40001') {
      return Response.json({ success: false, errors: ['The draft changed during import. Preview it again.'] }, { status: 409 })
    }
    return Response.json({ success: false, errors: ['Unable to verify the theme draft.'] }, { status: 500 })
  }
}
