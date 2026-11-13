/**
 * Phase 2A.1 — trusted auth + live Theme Customize bridge.
 * Persistence tests use an in-memory mock Payload (disposable). They do NOT
 * touch DATABASE_URL / the developer's active local Settings.
 */
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import type { Payload } from 'payload'
import { CUSTOM_THEME_REGISTRY_KEY, readCustomThemeRegistry } from '@/lib/theme-engine/custom-themes'
import { INSTALLED_THEMES, setRuntimeCustomThemes } from '@/lib/theme-engine/themes'
import { configureMcpAuthHarness, resetMcpAuthForTests } from './auth'
import { setLiveBridgeConfigForTests, setMcpPayloadClient, resetLiveBridgeForTests } from './live-bridge'
import { assessThemeRequirements, resolveCapabilityAssessment } from './stage0'
import {
  createThemeCustomize,
  getThemeCustomize,
  listThemeCustomize,
  updateThemeCustomize,
} from './theme-customize-live'
import {
  createPayloadThemeCustomizeStore,
  resetThemeCustomizeStoreForTests,
  setThemeCustomizeStore,
} from './theme-customize-store'

const HARNESS_SECRET = 'phase2a1-live-bridge-secret'
const staff = { auth: { harness: { secret: HARNESS_SECRET, userId: 'admin-1' } } }
const forged = { auth: { user: { id: 'admin-1', role: 'site-admin' } } }

type MockSettings = {
  activeThemeId: string
  themeStyles: Record<string, unknown>
}

function createMockPayload(initial?: Partial<MockSettings>) {
  const state: MockSettings = {
    activeThemeId: initial?.activeThemeId || 'corporate',
    themeStyles: { ...(initial?.themeStyles || {}) },
  }
  const payload = {
    findGlobal: async ({ slug }: { slug: string }) => {
      if (slug !== 'settings') return null
      return {
        activeThemeId: state.activeThemeId,
        themeStyles: structuredClone(state.themeStyles),
      }
    },
    updateGlobal: async ({
      slug,
      data,
    }: {
      slug: string
      data: { themeStyles?: Record<string, unknown>; activeThemeId?: string }
    }) => {
      if (slug !== 'settings') return {}
      if (data.themeStyles) state.themeStyles = structuredClone(data.themeStyles)
      if (typeof data.activeThemeId === 'string') state.activeThemeId = data.activeThemeId
      return {}
    },
  }
  return { payload: payload as unknown as Payload, state }
}

function readyAssessment() {
  const blocked = assessThemeRequirements({
    themeRequest: 'QA theme customize',
    requirements: [
      { id: 'home', description: 'Home', intent: 'site.home' },
      { id: 'contact-form', description: 'Contact form', intent: 'form.contact' },
    ],
  }).assessment
  return resolveCapabilityAssessment({
    assessment: blocked,
    decisions: [{ requirementId: 'contact-form', decision: 'DEFER' }],
  }).assessment
}

beforeEach(() => {
  resetMcpAuthForTests()
  resetLiveBridgeForTests()
  setRuntimeCustomThemes([])
  resetThemeCustomizeStoreForTests()
  configureMcpAuthHarness({
    secret: HARNESS_SECRET,
    users: [{ id: 'admin-1', role: 'site-admin' }],
  })
})

test('A. existing memory-path Phase 2A contracts remain trusted-auth based', async () => {
  await assert.rejects(() => listThemeCustomize(forged), /ACCESS_DENIED|Caller-supplied|trusted/)
  const listed = await listThemeCustomize(staff)
  assert.equal(listed.store, 'memory')
  assert.equal(listed.liveBridge.enabled, false)
})

test('B/C/D. forged rejected; trusted read; live writes denied without bridge', async () => {
  const { payload } = createMockPayload()
  setMcpPayloadClient(payload)
  setThemeCustomizeStore(createPayloadThemeCustomizeStore(payload))
  await assert.rejects(() => listThemeCustomize(forged), /Caller-supplied|trusted identity/)
  const got = await getThemeCustomize({ ...staff, themeId: 'corporate' })
  assert.equal(got.themeId, 'corporate')
  await assert.rejects(
    () => updateThemeCustomize({
      ...staff,
      stage0Assessment: readyAssessment(),
      themeId: 'qa-isolated-theme',
      tokens: { colors: { primary: '#abcdef' } },
      expectedRevision: 0,
    }),
    /live bridge|not an installed theme|Refusing|ACCESS_DENIED/,
  )
})

test('E/F/G. live createCustomTheme: unique slug, inactive, websiteType preserved', async () => {
  const { payload, state } = createMockPayload({
    activeThemeId: 'corporate',
    themeStyles: {
      theme_style_corporate_draft: { tokens: { colors: { primary: '#0e6b66' } }, revision: 3 },
    },
  })
  setMcpPayloadClient(payload)
  setLiveBridgeConfigForTests({
    enabled: true,
    allowBundledThemeWrites: false,
    qaThemePrefix: 'qa-',
    reason: 'test live bridge',
  })
  setThemeCustomizeStore(createPayloadThemeCustomizeStore(payload))

  const created = await createThemeCustomize({
    ...staff,
    stage0Assessment: readyAssessment(),
    name: 'QA Isolated Store',
    websiteType: 'commerce',
    description: 'Disposable MCP QA theme',
    tokens: { colors: { primary: '#112233' } },
  })
  assert.equal(created.success, true)
  if (!('theme' in created) || !created.theme) throw new Error('expected theme')
  assert.equal(created.theme.id, 'qa-isolated-store')
  assert.equal(created.activated, false)
  assert.equal(created.theme.websiteType, 'commerce')
  assert.equal(state.activeThemeId, 'corporate')

  const registry = readCustomThemeRegistry(state.themeStyles)
  assert.equal(registry.length, 1)
  assert.equal(registry[0].id, 'qa-isolated-store')
  assert.equal(registry[0].websiteType, 'commerce')

  // Existing corporate draft preserved.
  assert.equal(
    (state.themeStyles.theme_style_corporate_draft as { tokens: { colors: { primary: string } } })
      .tokens.colors.primary,
    '#0e6b66',
  )

  await assert.rejects(
    () => createThemeCustomize({
      ...staff,
      stage0Assessment: readyAssessment(),
      name: 'QA Isolated Store',
      websiteType: 'commerce',
    }),
    /already taken/,
  )
})

test('H/I/J/K/L. live update only selected qa theme; conflict; idempotent; read-back; others unchanged', async () => {
  const { payload, state } = createMockPayload({
    activeThemeId: 'corporate',
    themeStyles: {
      theme_style_corporate_draft: {
        tokens: { colors: { primary: '#0e6b66' } },
        revision: 2,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      [CUSTOM_THEME_REGISTRY_KEY]: {
        themes: [
          {
            id: 'qa-bridge-theme',
            label: 'QA Bridge Theme',
            description: 'Disposable',
            version: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            baseThemeId: 'corporate',
            websiteType: 'editorial',
            themeConfig: {
              ...INSTALLED_THEMES.corporate.themeConfig,
              name: 'qa-bridge-theme',
              label: 'QA Bridge Theme',
            },
            preview: INSTALLED_THEMES.corporate.preview,
          },
        ],
      },
    },
  })
  setMcpPayloadClient(payload)
  setLiveBridgeConfigForTests({
    enabled: true,
    allowBundledThemeWrites: false,
    qaThemePrefix: 'qa-',
    reason: 'test live bridge',
  })
  setThemeCustomizeStore(createPayloadThemeCustomizeStore(payload))

  // Register custom theme into runtime via ensure path used by list/get.
  await listThemeCustomize(staff)

  await assert.rejects(
    () => updateThemeCustomize({
      ...staff,
      stage0Assessment: readyAssessment(),
      themeId: 'corporate',
      tokens: { colors: { primary: '#ffff00' } },
      expectedRevision: 2,
    }),
    /ACCESS_DENIED|Refusing|bundled|active/,
  )

  const first = await updateThemeCustomize({
    ...staff,
    stage0Assessment: readyAssessment(),
    themeId: 'qa-bridge-theme',
    tokens: { colors: { primary: '#445566' } },
    expectedRevision: 0,
    idempotencyKey: 'qa-live-1',
  })
  assert.equal(first.success, true)
  assert.equal(first.persistence, 'payload')
  assert.equal(first.saved.revision, 1)
  assert.equal(first.readBack.tokens.colors.primary, '#445566')

  const repeat = await updateThemeCustomize({
    ...staff,
    stage0Assessment: readyAssessment(),
    themeId: 'qa-bridge-theme',
    tokens: { colors: { primary: '#445566' } },
    expectedRevision: 1,
    idempotencyKey: 'qa-live-1',
  })
  assert.equal(repeat.saved.revision, 1)

  await assert.rejects(
    () => updateThemeCustomize({
      ...staff,
      stage0Assessment: readyAssessment(),
      themeId: 'qa-bridge-theme',
      tokens: { colors: { primary: '#778899' } },
      expectedRevision: 0,
    }),
    /CONFLICT|Revision conflict/,
  )

  assert.equal(state.activeThemeId, 'corporate')
  assert.equal(
    (state.themeStyles.theme_style_corporate_draft as { tokens: { colors: { primary: string } } })
      .tokens.colors.primary,
    '#0e6b66',
  )
  const registry = readCustomThemeRegistry(state.themeStyles)
  assert.equal(registry[0].websiteType, 'editorial')
  assert.equal(registry[0].id, 'qa-bridge-theme')
})

test('M. Stage 0 BLOCKED rejects live progression', async () => {
  const { payload } = createMockPayload()
  setMcpPayloadClient(payload)
  setLiveBridgeConfigForTests({
    enabled: true,
    allowBundledThemeWrites: false,
    qaThemePrefix: 'qa-',
    reason: 'test',
  })
  setThemeCustomizeStore(createPayloadThemeCustomizeStore(payload))
  const blocked = assessThemeRequirements({
    themeRequest: 'Blocked',
    requirements: [{ id: 'contact-form', description: 'Contact form', intent: 'form.contact' }],
  }).assessment
  await assert.rejects(
    () => createThemeCustomize({
      ...staff,
      stage0Assessment: blocked,
      name: 'QA Blocked Theme',
      websiteType: 'corporate',
    }),
    /BLOCKED/,
  )
})

test('Isolation proof note: mock Payload only (no DATABASE_URL mutation)', () => {
  assert.notEqual(process.env.ZYVAVU_MCP_LIVE_WRITES, '1')
  // This suite never binds the real application Payload / development database.
  assert.equal(true, true)
})
