import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { Payload, PayloadRequest } from 'payload'
import { isSiteStaff } from '@/access/roles'
import { validateTemplate } from '@/mcp/validate'
import { readCustomThemeRegistry } from './custom-themes'
import { ensureCustomThemesRegistered } from './register-custom-themes'
import { saveLoopItemTemplate, resolveLoopItemTemplate } from './loop-item-templates'
import { createTemplateVersion, isVersionableTemplateContext } from './template-versions'
import { resolveThemeTemplate, saveThemeTemplateOverride } from './resolver'
import { resolveDraftThemeConfig } from './styles'
import { MAX_TEMPLATE_IMPORT_BYTES } from './theme-import-limit'
import { listBundledThemeIds, normalizeThemeId } from './themes'
import type {
  TemplateImportDestination,
  TemplateImportEnvelope,
  TemplateImportPreviewSummary,
} from './template-import-types'
import type { TemplateContext, ThemeTemplateDocument } from './types'
import { validateThemeTemplateDocument } from './validation'
import { ensureWidgetIdsInTree } from './widget-ids'

export type {
  TemplateImportDestination,
  TemplateImportEnvelope,
  TemplateImportPreviewSummary,
} from './template-import-types'

class ImportError extends Error {
  constructor(readonly status: number, readonly errors: string[]) {
    super(errors[0])
  }
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const TEMPLATE_CONTEXTS = new Set<TemplateContext>([
  'single', 'page', 'home', 'header', 'footer', 'category', 'product', 'loopItem',
])

function isThemeCustomizeFile(value: unknown): boolean {
  if (!object(value) || !Object.hasOwn(value, 'tokens')) return false
  return Object.keys(value).every((key) => key === 'themeId' || key === 'tokens')
}

function isBareDocument(value: unknown): value is ThemeTemplateDocument {
  return object(value)
    && typeof value.version === 'number'
    && typeof value.template === 'string'
    && Array.isArray(value.content)
}

export function parseTemplateImportFile(raw: unknown): TemplateImportEnvelope {
  if (isThemeCustomizeFile(raw)) {
    throw new ImportError(400, ['Đây là file Theme Customize. Hãy import ở Step 1.'])
  }
  if (isBareDocument(raw)) {
    return { document: raw }
  }
  if (!object(raw) || !Object.hasOwn(raw, 'document')) {
    throw new ImportError(400, [
      'The file must be a Puck template document or { themeId?, template?, document }.',
    ])
  }
  const allowed = new Set(['themeId', 'template', 'loopItemId', 'versionId', 'document'])
  const unexpected = Object.keys(raw).filter((key) => !allowed.has(key))
  if (unexpected.length) {
    throw new ImportError(400, [`Unsupported fields: ${unexpected.join(', ')}.`])
  }
  if (!isBareDocument(raw.document)) {
    throw new ImportError(400, ['document must be a Puck template with version, template, and content.'])
  }
  const themeId = Object.hasOwn(raw, 'themeId')
    ? (typeof raw.themeId === 'string' ? raw.themeId : null)
    : undefined
  if (themeId === null) throw new ImportError(400, ['themeId must be a string when present.'])
  const template = Object.hasOwn(raw, 'template')
    ? (typeof raw.template === 'string' && TEMPLATE_CONTEXTS.has(raw.template as TemplateContext)
      ? raw.template as TemplateContext
      : null)
    : undefined
  if (template === null) throw new ImportError(400, ['template must be a known Template type when present.'])
  const loopItemId = Object.hasOwn(raw, 'loopItemId')
    ? (typeof raw.loopItemId === 'string' && raw.loopItemId.trim() ? raw.loopItemId.trim() : null)
    : undefined
  if (loopItemId === null) throw new ImportError(400, ['loopItemId must be a non-empty string when present.'])
  const versionId = Object.hasOwn(raw, 'versionId')
    ? (typeof raw.versionId === 'string' && raw.versionId.trim() ? raw.versionId.trim() : null)
    : undefined
  if (versionId === null) throw new ImportError(400, ['versionId must be a non-empty string when present.'])
  return {
    ...(themeId !== undefined ? { themeId } : {}),
    ...(template !== undefined ? { template } : {}),
    ...(loopItemId !== undefined ? { loopItemId } : {}),
    ...(versionId !== undefined ? { versionId } : {}),
    document: raw.document,
  }
}

function destinationLabel(template: TemplateContext, loopItemId?: string) {
  if (template === 'loopItem') return loopItemId ? `Loop Item (${loopItemId})` : 'Loop Item'
  const labels: Record<string, string> = {
    header: 'Header', home: 'Home', single: 'Single Post', page: 'Page',
    category: 'Category', footer: 'Footer', product: 'Product',
  }
  return labels[template] ?? template
}

function countWidgets(nodes: unknown): number {
  if (!Array.isArray(nodes)) return 0
  return nodes.reduce((total, node) => {
    if (!object(node)) return total
    let nested = 0
    for (const value of Object.values(node.props && object(node.props) ? node.props : {})) {
      nested += countWidgets(value)
    }
    if (object(node.zones)) {
      for (const value of Object.values(node.zones)) nested += countWidgets(value)
    }
    return total + 1 + nested
  }, 0)
}

function importRevision(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value, (_key, entry) =>
    object(entry) ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]])) : entry,
  )).digest('hex')
}

async function readBody(request: PayloadRequest) {
  const reader = request.body?.getReader()
  if (!reader) throw new ImportError(400, ['Choose a Template JSON file.'])
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_TEMPLATE_IMPORT_BYTES) {
        await reader.cancel()
        throw new ImportError(413, ['Template JSON must be 512 KB or smaller.'])
      }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode()) as unknown
  } catch (error) {
    if (error instanceof ImportError) throw error
    throw new ImportError(400, ['Invalid UTF-8 JSON file.'])
  } finally {
    reader.releaseLock()
  }
}

async function readStoredOverride(
  payload: Payload,
  themeId: string,
  template: TemplateContext,
  loopItemId: string | undefined,
  req?: Partial<PayloadRequest>,
): Promise<ThemeTemplateDocument | null> {
  if (template === 'loopItem') {
    if (!loopItemId) return null
    return (await resolveLoopItemTemplate(payload, loopItemId, themeId)) ?? null
  }
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
  const store = object(settings.themeTemplates) ? settings.themeTemplates : {}
  const key = `theme_template_${themeId}_${template}`
  const doc = store[key]
  return object(doc) && Array.isArray(doc.content) ? doc as ThemeTemplateDocument : null
}

async function assertTarget(
  payload: Payload,
  themeId: string,
  template: TemplateContext,
  loopItemId: string | undefined,
) {
  await ensureCustomThemesRegistered(payload)
  const bundled = listBundledThemeIds()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(themeId) || themeId === 'default') {
    throw new ImportError(400, ['Select a valid custom theme.'])
  }
  if (bundled.includes(themeId)) {
    throw new ImportError(400, ['Import targets an inactive custom theme from the wizard.'])
  }
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
  const styles = object(settings.themeStyles) ? settings.themeStyles : {}
  const registry = readCustomThemeRegistry(styles)
  if (!registry.some((theme) => theme.id === themeId)) {
    throw new ImportError(404, ['Selected custom theme was not found.'])
  }
  if (!TEMPLATE_CONTEXTS.has(template) || template === 'product') {
    throw new ImportError(400, ['Unsupported Template type for import.'])
  }
  if (template === 'loopItem' && !loopItemId) {
    throw new ImportError(400, ['Select a Loop Item template before importing.'])
  }
  return {
    themeId: normalizeThemeId(themeId),
    template,
    loopItemId,
    label: destinationLabel(template, loopItemId),
    mode: isVersionableTemplateContext(template) ? 'version-create' : 'override',
  } satisfies TemplateImportDestination
}

function matchEnvelope(
  envelope: TemplateImportEnvelope,
  destination: TemplateImportDestination,
) {
  // File themeId is a source reference only — destination is locked by the import query.
  if (envelope.template !== undefined && envelope.template !== destination.template) {
    throw new ImportError(400, [
      `Sai loại template: file là "${envelope.template}" nhưng đích đang mở là "${destination.template}".`,
    ])
  }
  if (envelope.document.template !== destination.template) {
    throw new ImportError(400, [
      `Sai loại template: document.template là "${envelope.document.template}" nhưng đích đang mở là "${destination.template}".`,
    ])
  }
  if (destination.template === 'loopItem') {
    const fileLoop = envelope.loopItemId
      ?? (typeof envelope.document.metadata?.loopItemId === 'string'
        ? envelope.document.metadata.loopItemId
        : undefined)
    if (fileLoop && fileLoop !== destination.loopItemId) {
      throw new ImportError(400, [
        `File Loop Item "${fileLoop}" does not match destination "${destination.loopItemId}".`,
      ])
    }
  }
  // Home versionId in the file is a source reference only — never a write target.
}

async function prepareImport(
  payload: Payload,
  destination: TemplateImportDestination,
  envelope: TemplateImportEnvelope,
  req?: Partial<PayloadRequest>,
) {
  matchEnvelope(envelope, destination)
  const existingOverride = destination.mode === 'version-create'
    ? null
    : await readStoredOverride(
      payload, destination.themeId, destination.template, destination.loopItemId, req,
    )
  const currentDoc = destination.mode === 'version-create'
    ? null
    : destination.template === 'loopItem'
      ? existingOverride
      : await resolveThemeTemplate(payload, destination.template, destination.themeId)
  const themeConfig = await resolveDraftThemeConfig(payload, destination.themeId)

  const idPass = ensureWidgetIdsInTree(
    JSON.parse(JSON.stringify(envelope.document.content || [])),
  )
  if (idPass.errors.length) throw new ImportError(400, idPass.errors)
  const normalizedDocument: ThemeTemplateDocument = {
    ...envelope.document,
    content: idPass.nodes,
    template: destination.template,
  }

  const proposal = validateTemplate(normalizedDocument, destination.template, themeConfig)
  if (!proposal.valid) {
    throw new ImportError(400, proposal.errors.map((issue) =>
      `${issue.path}: ${issue.message}`,
    ))
  }
  const policy = validateThemeTemplateDocument(
    normalizedDocument, destination.template, currentDoc,
  )
  if (!policy.valid) throw new ImportError(400, policy.errors)

  const document: ThemeTemplateDocument = {
    ...normalizedDocument,
    template: destination.template,
    ...(destination.template === 'loopItem' && destination.loopItemId
      ? {
          metadata: {
            ...(normalizedDocument.metadata || {}),
            loopItemId: destination.loopItemId,
          },
        }
      : {}),
  }
  const destinationWithSource: TemplateImportDestination = {
    ...destination,
    ...(envelope.versionId ? { sourceVersionId: envelope.versionId } : {}),
  }
  const revision = importRevision([
    destination.themeId,
    destination.template,
    destination.loopItemId ?? null,
    destination.mode,
    existingOverride,
    document,
  ])
  const preview: TemplateImportPreviewSummary = {
    destination: destinationWithSource,
    replacesExisting: destination.mode === 'override' && Boolean(existingOverride),
    widgetCount: countWidgets(document.content) + countWidgets(
      document.zones ? Object.values(document.zones).flat() : [],
    ),
    updatedAt: typeof existingOverride?.updatedAt === 'string' ? existingOverride.updatedAt : undefined,
  }
  return { document, existingOverride, revision, preview }
}

async function persistImport(
  payload: Payload,
  destination: TemplateImportDestination,
  document: ThemeTemplateDocument,
  user: PayloadRequest['user'],
  req?: Partial<PayloadRequest>,
): Promise<
  | { success: true; created?: Awaited<ReturnType<typeof createTemplateVersion>> & { success: true } }
  | { success: false; errors?: string[] }
> {
  if (destination.mode === 'version-create') {
    const created = await createTemplateVersion(payload, {
      themeId: destination.themeId,
      context: destination.template,
      document,
      sourceVersionId: destination.sourceVersionId,
    }, req)
    if (!created.success) return { success: false, errors: created.errors }
    return { success: true, created }
  }
  if (destination.template === 'loopItem' && destination.loopItemId) {
    return saveLoopItemTemplate(payload, destination.loopItemId, document, destination.themeId)
  }
  return saveThemeTemplateOverride(
    payload, destination.template, document, user, destination.themeId, req,
  )
}

function resolveImportTemplate(
  queryTemplate: string,
  envelope: TemplateImportEnvelope,
): TemplateContext {
  const fromEnvelope = envelope.template
  const fromDocument = envelope.document.template
  if (fromEnvelope && fromDocument && fromEnvelope !== fromDocument) {
    throw new ImportError(400, [
      `Sai loại template: envelope là "${fromEnvelope}" nhưng document.template là "${fromDocument}".`,
    ])
  }
  const derived = fromEnvelope ?? fromDocument
  if (queryTemplate) {
    if (!TEMPLATE_CONTEXTS.has(queryTemplate as TemplateContext)) {
      throw new ImportError(400, ['Unsupported Template type for import.'])
    }
    return queryTemplate as TemplateContext
  }
  if (!derived || !TEMPLATE_CONTEXTS.has(derived)) {
    throw new ImportError(400, [
      'Thiếu loại template trong file. Full Theme import cần `template` hoặc `document.template`.',
    ])
  }
  return derived
}

export async function handleTemplateImport(request: PayloadRequest) {
  if (!isSiteStaff(request.user)) {
    return Response.json({ success: false, errors: ['Forbidden.'] }, { status: 403 })
  }
  const payload = request.payload
  const query = new URL(request.url ?? 'http://localhost').searchParams
  const themeId = query.get('themeId')?.trim() ?? ''
  const queryTemplate = query.get('template')?.trim() ?? ''
  const loopItemId = query.get('loopItemId')?.trim() || undefined
  const action = query.get('action')
  let transaction: Awaited<ReturnType<Payload['db']['beginTransaction']>> = null

  try {
    if (!themeId) {
      throw new ImportError(400, [
        'Thiếu Theme ID đích. Import không dùng Active theme của website.',
      ])
    }

    if (action === 'status') {
      if (!queryTemplate) {
        throw new ImportError(400, ['template query is required for status.'])
      }
      const destination = await assertTarget(
        payload, themeId, queryTemplate as TemplateContext, loopItemId,
      )
      const existing = await readStoredOverride(
        payload, destination.themeId, destination.template, destination.loopItemId,
      )
      return Response.json({
        success: true,
        preview: existing
          ? {
              destination,
              replacesExisting: true,
              widgetCount: countWidgets(existing.content),
              updatedAt: existing.updatedAt,
            } satisfies TemplateImportPreviewSummary
          : null,
      })
    }

    if (action !== 'preview' && action !== 'save') {
      throw new ImportError(400, ['Invalid import action.'])
    }
    const envelope = parseTemplateImportFile(await readBody(request))
    const template = resolveImportTemplate(queryTemplate, envelope)
    const destination = await assertTarget(payload, themeId, template, loopItemId)

    if (action === 'preview') {
      const { revision, preview } = await prepareImport(payload, destination, envelope)
      return Response.json({ success: true, revision, preview })
    }

    const expectedRevision = query.get('revision')
    if (!expectedRevision || !/^[a-f0-9]{64}$/.test(expectedRevision)) {
      throw new ImportError(400, ['Preview and confirm the file before saving.'])
    }
    transaction = await payload.db.beginTransaction({ isolationLevel: 'serializable' })
    if (transaction == null) {
      throw new ImportError(503, ['A database transaction is required to import a template.'])
    }
    const req = { ...request, transactionID: transaction }
    const prepared = await prepareImport(payload, destination, envelope, req)
    if (prepared.revision !== expectedRevision) {
      throw new ImportError(409, ['The template or file changed. Preview the import again.'])
    }
    const saved = await persistImport(
      payload, prepared.preview.destination, prepared.document, request.user, req,
    )
    if (!saved.success) {
      throw new ImportError(409, saved.errors ?? ['Template could not be saved. Preview again.'])
    }

    if (destination.mode === 'version-create' && 'created' in saved && saved.created) {
      await payload.db.commitTransaction(transaction)
      transaction = null
      return Response.json({
        success: true,
        revision: importRevision(saved.created.document),
        homeVersion: saved.created.meta,
        templateVersion: saved.created.meta,
        document: saved.created.document,
        preview: {
          destination: {
            ...prepared.preview.destination,
            label: saved.created.meta.name,
          },
          replacesExisting: false,
          widgetCount: countWidgets(saved.created.document.content),
          updatedAt: saved.created.document.updatedAt,
        } satisfies TemplateImportPreviewSummary,
      })
    }

    const stored = await readStoredOverride(
      payload, destination.themeId, destination.template, destination.loopItemId, req,
    )
    const sameCore = stored
      && stored.template === destination.template
      && stored.version === prepared.document.version
      && isDeepStrictEqual(stored.content, prepared.document.content)
      && isDeepStrictEqual(stored.root ?? {}, prepared.document.root ?? {})
    if (!sameCore) {
      throw new ImportError(500, ['Stored template did not match the confirmed import.'])
    }
    await payload.db.commitTransaction(transaction)
    transaction = null
    const readBack = await readStoredOverride(
      payload, destination.themeId, destination.template, destination.loopItemId,
    )
    return Response.json({
      success: true,
      revision: importRevision(readBack),
      preview: {
        destination,
        replacesExisting: true,
        widgetCount: countWidgets(readBack?.content ?? []),
        updatedAt: readBack?.updatedAt,
      } satisfies TemplateImportPreviewSummary,
    })
  } catch (error) {
    if (transaction != null) await payload.db.rollbackTransaction(transaction)
    if (error instanceof ImportError) {
      return Response.json({ success: false, errors: error.errors }, { status: error.status })
    }
    const code = (error as { code?: string; cause?: { code?: string } } | null)?.code ??
      (error as { cause?: { code?: string } } | null)?.cause?.code
    if (code === '40001') {
      return Response.json({
        success: false,
        errors: ['The template changed during import. Preview it again.'],
      }, { status: 409 })
    }
    return Response.json({ success: false, errors: ['Unable to import the template.'] }, { status: 500 })
  }
}
