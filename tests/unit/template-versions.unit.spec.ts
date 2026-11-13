// @vitest-environment node
import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { CUSTOM_THEME_REGISTRY_KEY } from '@/lib/theme-engine/custom-themes'
import { customRecordToInstalled } from '@/lib/theme-engine/custom-themes'
import { handleTemplateImport } from '@/lib/theme-engine/template-import'
import {
  LEGACY_TEMPLATE_VERSION_ID,
  createTemplateVersion,
  listTemplateVersions,
  resolveTemplateVersion,
  saveTemplateVersion,
  setPrimaryTemplateVersion,
  templateVersionDocKey,
  templateVersionIndexKey,
  legacyTemplateDocKey,
} from '@/lib/theme-engine/template-versions'
import { INSTALLED_THEMES, setRuntimeCustomThemes } from '@/lib/theme-engine/themes'

const themeId = 'mcp-blog-test-2'
const homeDoc = structuredClone(INSTALLED_THEMES.corporate.templates.home)
const singleDoc = structuredClone(INSTALLED_THEMES.corporate.templates.single)

function registerTheme() {
  setRuntimeCustomThemes([
    customRecordToInstalled({
      id: themeId,
      label: 'MCP Blog Test 2',
      description: '',
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      baseThemeId: 'corporate',
      websiteType: 'editorial',
      themeConfig: INSTALLED_THEMES.corporate.themeConfig,
      preview: INSTALLED_THEMES.corporate.preview,
    }),
  ])
}

function setup(seed: Record<string, unknown> = {}) {
  registerTheme()
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
    themeTemplates: { ...seed } as Record<string, unknown>,
  }
  const payload = {
    db: {
      beginTransaction: vi.fn(async () => 'tv-txn'),
      commitTransaction: vi.fn(async () => undefined),
      rollbackTransaction: vi.fn(async () => undefined),
    },
    findGlobal: vi.fn(async () => structuredClone(settings)),
    find: vi.fn(async () => ({ docs: [] })),
    updateGlobal: vi.fn(async ({ data }: { data: { themeTemplates?: Record<string, unknown> } }) => {
      if (data.themeTemplates) settings.themeTemplates = { ...data.themeTemplates }
      return settings
    }),
  }
  return { settings, payload: payload as unknown as Payload }
}

describe('Template Versions shared model', () => {
  it('keeps Home index key compatibility and versions Single independently', async () => {
    const { settings, payload } = setup({
      [legacyTemplateDocKey(themeId, 'home')]: homeDoc,
      [legacyTemplateDocKey(themeId, 'single')]: singleDoc,
    })
    const home = await listTemplateVersions(payload, 'home', themeId)
    expect(home.synthetic).toBe(true)
    expect(home.index.primaryId).toBe(LEGACY_TEMPLATE_VERSION_ID)

    const createdHome = await createTemplateVersion(payload, {
      themeId, context: 'home', document: homeDoc, sourceVersionId: 'v1',
    })
    expect(createdHome.success).toBe(true)
    if (!createdHome.success) return
    expect(settings.themeTemplates[templateVersionIndexKey(themeId, 'home')]).toMatchObject({
      primaryId: 'v1',
    })
    expect(settings.themeTemplates[templateVersionDocKey(themeId, 'home', 'v2')]).toBeTruthy()

    const createdSingle = await createTemplateVersion(payload, {
      themeId, context: 'single', document: singleDoc, sourceVersionId: 'v1',
    })
    expect(createdSingle.success).toBe(true)
    if (!createdSingle.success) return
    expect(settings.themeTemplates[templateVersionIndexKey(themeId, 'single')]).toMatchObject({
      primaryId: 'v1',
    })
    expect(createdSingle.meta.id).toBe('v2')

    await setPrimaryTemplateVersion(payload, 'single', createdSingle.meta.id, themeId)
    expect(settings.themeTemplates[templateVersionIndexKey(themeId, 'single')]).toMatchObject({
      primaryId: 'v2',
    })
    // Home primary unchanged
    expect(settings.themeTemplates[templateVersionIndexKey(themeId, 'home')]).toMatchObject({
      primaryId: 'v1',
    })
  })

  it('refuses create without an explicit destination themeId (no Active fallback)', async () => {
    const { payload, settings } = setup()
    const created = await createTemplateVersion(payload, {
      context: 'home',
      document: homeDoc,
    })
    expect(created.success).toBe(false)
    if (created.success) return
    expect(created.errors[0]).toMatch(/Theme ID đích là bắt buộc/)
    expect(settings.themeTemplates).toEqual({})
  })

  it('rejects Single Post version create when role document.content is missing', async () => {
    const { payload } = setup()
    const bare = {
      version: 1,
      template: 'single' as const,
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 'only', content: [] } }],
      metadata: { roleContract: 1 },
    }
    const created = await createTemplateVersion(payload, {
      themeId, context: 'single', document: bare as any,
    })
    expect(created.success).toBe(false)
    if (created.success) return
    expect(created.errors.join(' ')).toMatch(/content|PostContent|document\.content|required/i)
  })

  it('import Single Post missing document.content fails without writing', async () => {
    const { settings, payload } = setup()
    const bare = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 'only', content: [] } }],
      metadata: { roleContract: 1 },
    }
    const query = new URLSearchParams({ themeId, template: 'single', action: 'preview' })
    const request = new Request(`http://localhost/api/theme-builder/import?${query}`, {
      method: 'POST',
      body: JSON.stringify({ themeId, template: 'single', document: bare }),
    })
    const response = await handleTemplateImport(Object.assign(request, {
      payload,
      user: { role: 'site-admin' },
    }) as unknown as PayloadRequest)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.errors?.join(' ')).toMatch(/content|PostContent|document\.content|required|TEMPLATE_POLICY/i)
    expect(settings.themeTemplates[templateVersionIndexKey(themeId, 'single')]).toBeUndefined()
  })

  it('saves selected Single version without flipping Primary', async () => {
    const { settings, payload } = setup({
      [legacyTemplateDocKey(themeId, 'single')]: singleDoc,
    })
    const created = await createTemplateVersion(payload, {
      themeId, context: 'single', document: singleDoc,
    })
    expect(created.success).toBe(true)
    if (!created.success) return
    const edited = {
      ...singleDoc,
      root: { props: { ...(singleDoc.root?.props || {}), title: 'v2-edit' } },
    }
    const saved = await saveTemplateVersion(payload, 'single', created.meta.id, edited, themeId)
    expect(saved.success).toBe(true)
    expect(settings.themeTemplates[templateVersionIndexKey(themeId, 'single')]).toMatchObject({
      primaryId: LEGACY_TEMPLATE_VERSION_ID,
    })
    const resolved = await resolveTemplateVersion(payload, 'single', created.meta.id, themeId)
    expect(resolved?.root?.props?.title).toBe('v2-edit')
  })
})
