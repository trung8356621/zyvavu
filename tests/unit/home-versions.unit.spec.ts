// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  LEGACY_HOME_VERSION_ID,
  createHomeVersion,
  listHomeVersions,
  resolveHomeVersion,
  resolvePrimaryHomeDocument,
  saveHomeVersion,
  setPrimaryHomeVersion,
} from '@/lib/theme-engine/home-versions'
import { homeVersionDocKey, homeVersionIndexKey, legacyHomeDocKey } from '@/lib/theme-engine/home-versions-types'
import { INSTALLED_THEMES, setRuntimeCustomThemes } from '@/lib/theme-engine/themes'
import { customRecordToInstalled } from '@/lib/theme-engine/custom-themes'
import type { Payload } from 'payload'

const themeId = 'mcp-blog-test-2'
const homeDoc = structuredClone(INSTALLED_THEMES.corporate.templates.home)

function setup(seed: Record<string, unknown> = {}) {
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
  const settings = {
    themeTemplates: { ...seed } as Record<string, unknown>,
  }
  const payload = {
    findGlobal: vi.fn(async () => structuredClone(settings)),
    updateGlobal: vi.fn(async (args: { data?: { themeTemplates?: Record<string, unknown> } }) => {
      if (args?.data?.themeTemplates && typeof args.data.themeTemplates === 'object') {
        settings.themeTemplates = { ...args.data.themeTemplates }
      }
      return settings
    }),
  }
  return { settings, payload: payload as unknown as Payload, updateGlobal: payload.updateGlobal }
}

describe('Home versions compat', () => {
  it('lists synthetic v1 without writing when only legacy/bundled Home exists', async () => {
    const { settings, payload } = setup({
      [legacyHomeDocKey(themeId)]: { ...homeDoc, updatedAt: '2026-01-01T00:00:00.000Z' },
    })
    const listed = await listHomeVersions(payload, themeId)
    expect(listed.synthetic).toBe(true)
    expect(listed.index.primaryId).toBe(LEGACY_HOME_VERSION_ID)
    expect(listed.index.items[0].name).toBe('Home v1')
    expect(payload.updateGlobal).not.toHaveBeenCalled()
    expect(Object.keys(settings.themeTemplates)).toEqual([legacyHomeDocKey(themeId)])
  })

  it('resolves Primary from legacy override without materializing an index', async () => {
    const { payload } = setup({
      [legacyHomeDocKey(themeId)]: homeDoc,
    })
    const primary = await resolvePrimaryHomeDocument(payload, themeId)
    expect(primary).toBeNull() // no index → frontend falls through legacy resolveThemeTemplate path
    const v1 = await resolveHomeVersion(payload, LEGACY_HOME_VERSION_ID, themeId)
    expect(v1?.content).toEqual(homeDoc.content)
  })

  it('clones a new version without changing Primary and preserves widget ids', async () => {
    const { settings, payload } = setup({
      [legacyHomeDocKey(themeId)]: homeDoc,
    })
    const created = await createHomeVersion(payload, {
      themeId,
      document: homeDoc,
      sourceVersionId: LEGACY_HOME_VERSION_ID,
    })
    expect(created.success).toBe(true)
    if (!created.success) return
    expect(created.meta.id).toBe('v2')
    expect(created.document.content[0].props.id).toBe(homeDoc.content[0].props.id)
    expect(Object.keys(settings.themeTemplates)).toEqual(expect.arrayContaining([
      legacyHomeDocKey(themeId),
      homeVersionIndexKey(themeId),
      homeVersionDocKey(themeId, 'v2'),
    ]))
    const index = settings.themeTemplates[homeVersionIndexKey(themeId)] as any
    expect(index.primaryId).toBe(LEGACY_HOME_VERSION_ID)
    expect(settings.themeTemplates[homeVersionDocKey(themeId, 'v2')]).toBeTruthy()
    expect(settings.themeTemplates[legacyHomeDocKey(themeId)]).toMatchObject({ template: 'home' })
  })

  it('saves v1 to legacy key and set-primary switches without deleting the previous version', async () => {
    const { settings, payload } = setup({
      [legacyHomeDocKey(themeId)]: homeDoc,
    })
    const saved = await saveHomeVersion(payload, LEGACY_HOME_VERSION_ID, {
      ...homeDoc,
      root: { props: { title: 'Edited' } },
    }, themeId)
    expect(saved.success).toBe(true)
    expect(saved.meta?.id).toBe(LEGACY_HOME_VERSION_ID)
    expect((settings.themeTemplates[legacyHomeDocKey(themeId)] as any)?.root?.props?.title).toBe('Edited')

    const created = await createHomeVersion(payload, { themeId, document: homeDoc })
    expect(created.success).toBe(true)
    if (!created.success) return
    const primary = await setPrimaryHomeVersion(payload, created.meta.id, themeId)
    expect(primary.success).toBe(true)
    expect(primary.index?.primaryId).toBe(created.meta.id)
    expect(settings.themeTemplates[legacyHomeDocKey(themeId)]).toBeTruthy()
    expect(settings.themeTemplates[homeVersionDocKey(themeId, created.meta.id)]).toBeTruthy()
  })
})
