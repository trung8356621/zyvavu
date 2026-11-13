import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'
import { assessThemeRequirements, resolveCapabilityAssessment } from './stage0'
import { themeIdFromName } from './theme-identity'
import { createMemoryThemeCustomizeStore, resetThemeCustomizeStoreForTests } from './theme-customize-store'
import {
  createThemeCustomize,
  getThemeCustomize,
  listThemeCustomize,
  updateThemeCustomize,
  validateThemeCustomize,
} from './theme-customize-live'
import { configureMcpAuthHarness, resetMcpAuthForTests } from './auth'
import { resetLiveBridgeForTests } from './live-bridge'

const HARNESS_SECRET = 'phase2a-test-harness-secret'
const staff = { auth: { harness: { secret: HARNESS_SECRET, userId: 'user-1' } } }
const outsider = { auth: { harness: { secret: HARNESS_SECRET, userId: 'user-2' } } }
const forged = { auth: { user: { id: 'user-1', role: 'site-admin' } } }

beforeEach(() => {
  resetMcpAuthForTests()
  resetLiveBridgeForTests()
  configureMcpAuthHarness({
    secret: HARNESS_SECRET,
    users: [
      { id: 'user-1', role: 'site-admin' },
      { id: 'user-2', role: 'editor' },
    ],
  })
  resetThemeCustomizeStoreForTests()
})

function readyAssessment() {
  const blocked = assessThemeRequirements({
    themeRequest: 'Corporate theme customize',
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

function blockedAssessment() {
  return assessThemeRequirements({
    themeRequest: 'Blocked',
    requirements: [{ id: 'contact-form', description: 'Contact form', intent: 'form.contact' }],
  }).assessment
}

test('theme identity slug contract', () => {
  assert.equal(themeIdFromName('Corporate Clean'), 'corporate-clean')
  assert.equal(themeIdFromName('Nhà Hàng Việt'), 'nha-hang-viet')
})

test('B. forged caller admin role is rejected', async () => {
  await assert.rejects(() => listThemeCustomize(forged), /ACCESS_DENIED|trusted identity|Caller-supplied/)
  await assert.rejects(
    () => getThemeCustomize({ ...forged, themeId: 'corporate' }),
    /ACCESS_DENIED|trusted identity|Caller-supplied/,
  )
})

test('C/D. trusted authorized caller can read; unauthorized writes rejected', async () => {
  const listed = await listThemeCustomize(staff)
  assert.equal(listed.store, 'memory')
  assert(listed.themes.some((theme) => theme.id === 'corporate'))
  assert.equal(listed.principal.trust, 'harness')
  const got = await getThemeCustomize({ ...staff, themeId: 'corporate', channel: 'draft' })
  assert.equal(got.themeId, 'corporate')
  assert.equal(got.revision, 0)
  await assert.rejects(() => listThemeCustomize(outsider), /ACCESS_DENIED|site-admin/)
  await assert.rejects(
    () => updateThemeCustomize({
      ...outsider,
      stage0Assessment: readyAssessment(),
      themeId: 'corporate',
      tokens: { colors: { primary: '#123456' } },
      expectedRevision: 0,
    }),
    /ACCESS_DENIED|site-admin/,
  )
})

test('invalid tokens and missing theme ID rejected', async () => {
  const invalid = await validateThemeCustomize({
    ...staff,
    tokens: { colors: { primary: 'not-a-color' } },
  })
  assert.equal(invalid.valid, false)
  await assert.rejects(
    () => validateThemeCustomize({ ...staff, tokens: null }),
    /tokens object is required/,
  )
  await assert.rejects(
    () => getThemeCustomize({ ...staff }),
    /themeId is required/,
  )
})

test('F/G/J memory. update idempotency, conflict, read-back on disposable store', async () => {
  const store = resetThemeCustomizeStoreForTests()
  assert.equal(store.kind, 'memory')
  const stage0Assessment = readyAssessment()
  const tokens = { colors: { primary: '#123456' } }
  const first = await updateThemeCustomize({
    ...staff,
    stage0Assessment,
    themeId: 'industrial',
    tokens,
    expectedRevision: 0,
    idempotencyKey: 'qa-update-1',
  })
  assert.equal(first.success, true)
  assert.equal(first.persistence, 'memory')
  assert.equal(first.saved.revision, 1)
  assert.equal(first.readBack.tokens.colors.primary, '#123456')

  const repeat = await updateThemeCustomize({
    ...staff,
    stage0Assessment,
    themeId: 'industrial',
    tokens,
    expectedRevision: 1,
    idempotencyKey: 'qa-update-1',
  })
  assert.equal(repeat.saved.revision, 1)

  await assert.rejects(
    () => updateThemeCustomize({
      ...staff,
      stage0Assessment,
      themeId: 'industrial',
      tokens: { colors: { primary: '#abcdef' } },
      expectedRevision: 0,
    }),
    /CONFLICT|Revision conflict/,
  )

  const corporate = await store.read('corporate', 'draft')
  assert.equal(corporate, null)
})

test('M. Stage 0 BLOCKED cannot advance; READY_WITH_DEFERRED can update', async () => {
  await assert.rejects(
    () => updateThemeCustomize({
      ...staff,
      stage0Assessment: blockedAssessment(),
      themeId: 'editorial',
      tokens: { colors: { primary: '#111111' } },
      expectedRevision: 0,
    }),
    /BLOCKED/,
  )
  const ok = await updateThemeCustomize({
    ...staff,
    stage0Assessment: readyAssessment(),
    themeId: 'editorial',
    tokens: { colors: { primary: '#222222' } },
    expectedRevision: 0,
  })
  assert.equal(ok.saved.themeId, 'editorial')
})

test('create unavailable without live bridge + duplicate slug rejection', async () => {
  const stage0Assessment = readyAssessment()
  const prepared = await createThemeCustomize({
    ...staff,
    stage0Assessment,
    name: 'Fresh Brand Theme',
    tokens: { colors: { primary: '#010101' } },
  })
  assert.equal(prepared.success, false)
  assert.equal(prepared.code, 'CREATE_UNAVAILABLE')
  assert.equal(prepared.identity.themeId, 'fresh-brand-theme')
  assert.equal(prepared.identity.uniqueness, 'available')
  await assert.rejects(
    () => createThemeCustomize({
      ...staff,
      stage0Assessment,
      name: 'Corporate',
      tokens: { colors: { primary: '#010101' } },
    }),
    /already taken/,
  )
})

test('memory QA isolation across stores', async () => {
  const qa = createMemoryThemeCustomizeStore()
  resetThemeCustomizeStoreForTests()
  const stage0Assessment = readyAssessment()
  await updateThemeCustomize({
    ...staff,
    stage0Assessment,
    themeId: 'corporate',
    tokens: { colors: { primary: '#999999' } },
    expectedRevision: 0,
  })
  assert.equal(await qa.read('corporate', 'draft'), null)
  const active = await getThemeCustomize({ ...staff, themeId: 'corporate' })
  assert.equal(active.tokens.colors.primary, '#999999')
})
