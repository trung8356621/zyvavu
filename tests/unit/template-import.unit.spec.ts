// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { CUSTOM_THEME_REGISTRY_KEY } from '@/lib/theme-engine/custom-themes'
import {
  handleTemplateImport,
  parseTemplateImportFile,
} from '@/lib/theme-engine/template-import'
import { MAX_TEMPLATE_IMPORT_BYTES } from '@/lib/theme-engine/theme-import-limit'
import { INSTALLED_THEMES } from '@/lib/theme-engine/themes'

const themeId = 'mcp-blog-test-2'
const templateKey = `theme_template_${themeId}_home`
const homeDoc = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../src/themes/corporate/templates/home.json'),
    'utf8',
  ),
)

function setup(existing?: unknown) {
  const settings = {
    activeThemeId: 'corporate',
    themeStyles: {
      [CUSTOM_THEME_REGISTRY_KEY]: {
        themes: [{
          id: themeId,
          websiteType: 'editorial',
          themeConfig: INSTALLED_THEMES.corporate.themeConfig,
          label: 'MCP Blog Test 2',
          version: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          baseThemeId: 'corporate',
          preview: INSTALLED_THEMES.corporate.preview,
        }],
      },
    } as Record<string, unknown>,
    themeTemplates: {
      ...(existing ? { [templateKey]: existing } : {}),
    } as Record<string, unknown>,
  }
  let pendingTemplates: typeof settings.themeTemplates | undefined
  const db = {
    beginTransaction: vi.fn(async () => 'template-import-txn'),
    commitTransaction: vi.fn(async () => {
      if (pendingTemplates) settings.themeTemplates = pendingTemplates
      pendingTemplates = undefined
    }),
    rollbackTransaction: vi.fn(async () => { pendingTemplates = undefined }),
  }
  const payload = {
    db,
    findGlobal: vi.fn(async ({ req }: { req?: { transactionID?: string } }) =>
      structuredClone({
        ...settings,
        themeTemplates: req?.transactionID && pendingTemplates
          ? pendingTemplates
          : settings.themeTemplates,
      }),
    ),
    find: vi.fn(async () => ({ docs: [] as Array<{ value: unknown }> })),
    updateGlobal: vi.fn(async ({ data }: { data: { themeTemplates: typeof settings.themeTemplates } }) => {
      pendingTemplates = structuredClone(data.themeTemplates)
    }),
  }
  const send = (
    action: string,
    body: unknown = { themeId, template: 'home', document: homeDoc },
    revision?: string,
    extras: Record<string, string> = {},
  ) => {
    const query = new URLSearchParams({ themeId, template: 'home', action, ...extras })
    if (revision) query.set('revision', revision)
    const request = new Request(`http://localhost/api/theme-builder/import?${query}`, {
      method: 'POST',
      body: action === 'status' ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    })
    return handleTemplateImport(Object.assign(request, {
      payload,
      user: { role: 'site-admin' },
    }) as unknown as PayloadRequest)
  }
  return { settings, db, payload, send }
}

describe('parseTemplateImportFile', () => {
  it('rejects Theme Customize theme.json with the Step 1 message', () => {
    expect(() => parseTemplateImportFile({ themeId, tokens: { colors: { primary: '#111' } } }))
      .toThrow('Đây là file Theme Customize. Hãy import ở Step 1.')
  })

  it('accepts envelope and bare Puck documents', () => {
    expect(parseTemplateImportFile(homeDoc).document.template).toBe('home')
    expect(parseTemplateImportFile({ themeId, template: 'home', document: homeDoc })).toMatchObject({
      themeId,
      template: 'home',
    })
  })
})

describe('Theme Builder template JSON import', () => {
  it('previews and creates a new Home version without changing Primary or publishing', async () => {
    const { settings, db, payload, send } = setup()
    const beforeTemplates = structuredClone(settings.themeTemplates)
    const preview = await (await send('preview')).json()
    expect(preview.success).toBe(true)
    expect(preview.preview.destination).toMatchObject({
      themeId, template: 'home', label: 'Home', mode: 'version-create',
    })
    expect(preview.preview.replacesExisting).toBe(false)
    expect(payload.updateGlobal).not.toHaveBeenCalled()

    const response = await send('save', {
      themeId, template: 'home', versionId: 'v1', document: homeDoc,
    }, preview.revision)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.preview.replacesExisting).toBe(false)
    expect(body.homeVersion.id).toBe('v2')
    expect(db.beginTransaction).toHaveBeenCalledWith({ isolationLevel: 'serializable' })
    expect(settings.themeTemplates[`theme_template_${themeId}_home_v2`]).toMatchObject({
      template: 'home',
      version: 1,
      content: homeDoc.content,
    })
    expect(settings.themeTemplates[`theme_home_versions_${themeId}`]).toMatchObject({
      primaryId: 'v1',
    })
    expect(beforeTemplates[templateKey]).toBeUndefined()
    expect(settings.themeTemplates[templateKey]).toBeUndefined()
  })

  it('keeps an existing Home override untouched when previewing a create-import', async () => {
    const existing = { ...homeDoc, updatedAt: '2026-01-01T00:00:00.000Z', content: [{ type: 'Section', props: { id: 'old' } }] }
    const { settings, send } = setup(existing)
    const preview = await (await send('preview', {
      themeId,
      template: 'home',
      document: homeDoc,
    })).json()
    expect(preview.preview.replacesExisting).toBe(false)
    expect(preview.preview.destination.mode).toBe('version-create')
    expect(settings.themeTemplates[templateKey]).toEqual(existing)
  })

  it('accepts mismatched or missing file themeId and still creates a version on the locked destination', async () => {
    const { settings, send } = setup()
    expect(settings.activeThemeId).toBe('corporate')

    for (const body of [
      { themeId: 'cyberpunk-product-test', template: 'home' as const, document: homeDoc },
      { template: 'home' as const, document: homeDoc },
    ]) {
      const preview = await (await send('preview', body)).json()
      expect(preview.success).toBe(true)
      expect(preview.preview.destination).toMatchObject({
        themeId, template: 'home', mode: 'version-create',
      })
      const saved = await (await send('save', body, preview.revision)).json()
      expect(saved.success).toBe(true)
      expect(saved.homeVersion?.id ?? saved.templateVersion?.id).toMatch(/^v\d+$/)
      expect(settings.themeTemplates[`theme_home_versions_${themeId}`]).toMatchObject({
        primaryId: 'v1',
      })
      expect(settings.themeTemplates[`theme_home_versions_cyberpunk-product-test`]).toBeUndefined()
      expect(settings.activeThemeId).toBe('corporate')
    }
  })

  it('rejects wrong template, invalid widgets, and oversized files', async () => {
    const { send } = setup()

    const wrongTemplate = await (await send('preview', {
      themeId,
      template: 'page',
      document: { ...homeDoc, template: 'page' },
    })).json()
    expect(wrongTemplate.errors?.[0]).toMatch(/Sai loại template/)

    const badWidget = await (await send('preview', {
      themeId,
      template: 'home',
      document: {
        version: 1,
        template: 'home',
        root: { props: {} },
        content: [{ type: 'NotARealWidget', props: { id: 'x' } }],
      },
    })).json()
    expect(badWidget.success).toBe(false)
    expect(badWidget.errors?.join(' ')).toMatch(/NotARealWidget|UNSUPPORTED|widget/i)

    const oversized = 'x'.repeat(MAX_TEMPLATE_IMPORT_BYTES + 1)
    const big = await (await send('preview', oversized)).json()
    expect(big.errors?.[0]).toMatch(/512 KB/)
  })

  it('requires destination themeId and never falls back to Active theme', async () => {
    const { settings, payload } = setup()
    expect(settings.activeThemeId).toBe('corporate')
    const query = new URLSearchParams({ template: 'home', action: 'preview' })
    const request = new Request(`http://localhost/api/theme-builder/import?${query}`, {
      method: 'POST',
      body: JSON.stringify({ themeId, template: 'home', document: homeDoc }),
    })
    const result = await (await handleTemplateImport(Object.assign(request, {
      payload,
      user: { role: 'site-admin' },
    }) as unknown as PayloadRequest)).json()
    expect(result.success).toBe(false)
    expect(result.errors?.[0]).toMatch(/Thiếu Theme ID đích/)
    expect(payload.updateGlobal).not.toHaveBeenCalled()
  })

  it('Full Theme style: derives template from the file when query omits template', async () => {
    const { settings, db, payload, send } = setup()
    const preview = await (await send(
      'preview',
      { themeId, template: 'home', versionId: 'export-v1', document: homeDoc },
      undefined,
      { template: '' },
    )).json()
    expect(preview.success).toBe(true)
    expect(preview.preview.destination).toMatchObject({
      themeId, template: 'home', mode: 'version-create',
    })
    const saved = await (await send(
      'save',
      { themeId, template: 'home', versionId: 'export-v1', document: homeDoc },
      preview.revision,
      { template: '' },
    )).json()
    expect(saved.success).toBe(true)
    expect(saved.templateVersion.id).toBe('v2')
    expect(settings.themeTemplates[`theme_home_versions_${themeId}`]).toMatchObject({
      primaryId: 'v1',
    })
    expect(db.beginTransaction).toHaveBeenCalled()
    expect(payload.updateGlobal).toHaveBeenCalled()
  })

  it('rejects Theme Customize files through the HTTP handler', async () => {
    const { send } = setup()
    const result = await (await send('preview', { themeId, tokens: { colors: { primary: '#123456' } } })).json()
    expect(result.errors?.[0]).toBe('Đây là file Theme Customize. Hãy import ở Step 1.')
  })

  it('rolls back when revision mismatches', async () => {
    const { settings, db, send } = setup()
    const preview = await (await send('preview')).json()
    const response = await send('save', { themeId, template: 'home', document: homeDoc }, 'a'.repeat(64))
    expect(response.status).toBe(409)
    expect(db.rollbackTransaction).toHaveBeenCalled()
    expect(settings.themeTemplates[templateKey]).toBeUndefined()
    expect(preview.revision).toHaveLength(64)
  })
})
