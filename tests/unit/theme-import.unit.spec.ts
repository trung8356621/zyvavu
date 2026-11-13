// @vitest-environment node
import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { CUSTOM_THEME_REGISTRY_KEY } from '@/lib/theme-engine/custom-themes'
import { handleThemeImport } from '@/lib/theme-engine/theme-import'
import { MAX_THEME_IMPORT_BYTES } from '@/lib/theme-engine/theme-import-limit'
import { INSTALLED_THEMES } from '@/lib/theme-engine/themes'
import { generateThemeCss } from '@/lib/theme-engine/styles'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { validateThemeImportDocument } from '@/lib/theme-engine/presets'
import type { ThemeTokens } from '@/lib/theme-engine/types'

const themeId = 'mcp-blog-test-2'
const draftKey = `theme_style_${themeId}_draft`
const patch = {
  themeId,
  tokens: {
    colors: { background: '#FAF7F0' },
    typography: { fontFamilyHeading: "'Source Serif 4', serif", h1: { weight: '600' } },
    layout: { pageSpacing: 'lg' },
  },
}

function setup() {
  const settings = {
    activeThemeId: 'corporate',
    themeStyles: {
      [CUSTOM_THEME_REGISTRY_KEY]: {
        themes: [{ id: themeId, websiteType: 'editorial', themeConfig: INSTALLED_THEMES.corporate.themeConfig }],
      },
      theme_style_corporate_draft: { tokens: { colors: { primary: '#FFFFFF' } } },
      [draftKey]: { tokens: { colors: { primary: '#123456' } }, slots: { Header: { root: 'margin: 0' } }, revision: 1 },
      [`theme_style_${themeId}_published`]: { tokens: { colors: { text: '#333333' } } },
    } as Record<string, unknown>,
    themeTemplates: { [`theme_template_${themeId}_home`]: { content: ['existing Puck content'] } },
  }
  let pending: typeof settings.themeStyles | undefined
  const db = {
    beginTransaction: vi.fn(async () => 'import-txn'),
    commitTransaction: vi.fn(async () => {
      if (pending) settings.themeStyles = pending
      pending = undefined
    }),
    rollbackTransaction: vi.fn(async () => { pending = undefined }),
  }
  const payload = {
    db,
    findGlobal: vi.fn(async ({ req }: { req?: { transactionID?: string } }) =>
      structuredClone({ ...settings, themeStyles: req?.transactionID && pending ? pending : settings.themeStyles }),
    ),
    find: vi.fn(async () => ({ docs: [] as Array<{ value: unknown }> })),
    updateGlobal: vi.fn(async ({ data }: { data: { themeStyles: typeof settings.themeStyles } }) => {
      pending = structuredClone(data.themeStyles)
    }),
  }
  const send = (action: string, body: unknown = patch, id = themeId, revision?: string, role = 'site-admin') => {
    const query = new URLSearchParams({ themeId: id, action })
    if (revision) query.set('revision', revision)
    const request = new Request(`http://localhost/api/theme-customizer/import?${query}`, {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
    return handleThemeImport(Object.assign(request, { payload, user: { role } }) as unknown as PayloadRequest)
  }
  return { settings, db, payload, send }
}

describe('Theme Customize JSON import', () => {
  it('previews and saves only the selected draft, preserving metadata, Puck, and untouched tokens', async () => {
    const { settings, db, payload, send } = setup()
    const before = structuredClone(settings)
    const preview = await (await send('preview')).json()
    expect(preview.changes).toContainEqual({ field: 'colors.background', before: '#ffffff', after: '#FAF7F0' })
    expect(payload.updateGlobal).not.toHaveBeenCalled()

    const response = await send('save', patch, themeId, preview.revision)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, revision: expect.any(String) })
    expect(db.beginTransaction).toHaveBeenCalledWith({ isolationLevel: 'serializable' })
    expect(payload.findGlobal.mock.lastCall?.[0].req).toBeUndefined()
    expect(settings.themeStyles[draftKey]).toMatchObject({
      revision: 2,
      slots: { Header: { root: 'margin: 0' } },
      tokens: { colors: { primary: '#123456', background: '#FAF7F0' }, typography: { h1: { size: '44px', weight: '600' } } },
    })
    expect({ ...settings, themeStyles: { ...settings.themeStyles, [draftKey]: before.themeStyles[draftKey] } }).toEqual(before)
  })

  it('round-trips an Industrial configuration through the shared import contract and emits preset colors', async () => {
    const { settings, send } = setup()
    const industrial = INSTALLED_THEMES.industrial.themeConfig
    const tokens = structuredClone(industrial.tokens)
    tokens.typography.h1 = { ...tokens.typography.h1!, color: '#234567' }
    const file = { themeId, tokens }
    expect(validateThemeImportDocument(file, themeId)).toEqual({ valid: true, errors: [] })
    const { revision } = await (await send('preview', file)).json()
    expect((await send('save', file, themeId, revision)).status).toBe(200)
    const stored = (settings.themeStyles[draftKey] as { tokens: ThemeTokens }).tokens
    expect(stored).toMatchObject(tokens)
    expect(generateThemeCss({ ...industrial, tokens: stored })).toContain('--zyvavu-theme-h1-color: #234567;')
    expect(resolveWidgetStyles({ typography: { typography: 'h1' } }).color).toBe(
      'var(--zyvavu-theme-h1-color, inherit)',
    )
  })

  it.each([
    ['mismatched themeId', { ...patch, themeId: 'cyberpunk-product-test' }],
    ['missing themeId', { tokens: patch.tokens }],
  ])('accepts %s and still targets the locked destination', async (_name, body) => {
    const { settings, payload, send } = setup()
    const preview = await (await send('preview', body)).json()
    expect(preview.success).toBe(true)
    expect((await send('save', body, themeId, preview.revision)).status).toBe(200)
    expect(settings.themeStyles[draftKey]).toMatchObject({
      tokens: { colors: { background: '#FAF7F0' } },
    })
    expect(settings.activeThemeId).toBe('corporate')
    expect(payload.updateGlobal).toHaveBeenCalled()
  })

  it.each([
    ['invalid JSON', '{'],
    ['non-object tokens', { tokens: [] }],
    ['unknown token group', { tokens: { widgetDefinitions: {} } }],
    ['unknown token field', { tokens: { colors: { unsupported: '#fff' } } }],
    ['unknown typography field', { tokens: { typography: { h1: { css: 'red' } } } }],
    ['non-string themeId', { ...patch, themeId: 42 }],
    ['theme metadata', { ...patch, websiteType: 'commerce' }],
    ['Puck document', { root: {}, content: [], zones: {} }],
    ['script in font', { tokens: { typography: { fontFamily: '<script>alert(1)</script>' } } }],
    ['CSS injection', { tokens: { typography: { baseLineHeight: '1; background: url(https://example.test)' } } }],
    ['prototype key', '{"tokens":{"colors":{"__proto__":"#fff"}}}'],
  ])('rejects %s before saving', async (_name, body) => {
    const { payload, send } = setup()
    expect((await send('preview', body)).status).toBe(400)
    expect(payload.updateGlobal).not.toHaveBeenCalled()
  })

  it('enforces the size limit and staff authentication', async () => {
    const { payload, send } = setup()
    expect((await send('preview', ' '.repeat(MAX_THEME_IMPORT_BYTES + 1))).status).toBe(413)
    expect((await send('preview', patch, themeId, undefined, 'editor')).status).toBe(403)
    expect(payload.findGlobal).not.toHaveBeenCalled()
  })

  it('protects the active theme, bundled themes, and unregistered IDs', async () => {
    const { settings, payload, send } = setup()
    const preview = await (await send('preview')).json()
    settings.activeThemeId = themeId
    expect((await send('save', patch, themeId, preview.revision)).status).toBe(409)
    expect((await send('preview', { tokens: patch.tokens }, 'corporate')).status).toBe(400)
    expect((await send('preview', { tokens: patch.tokens }, 'unknown-theme')).status).toBe(404)
    expect(payload.updateGlobal).not.toHaveBeenCalled()
  })

  it('requires a preview revision and rejects stale or changed imports', async () => {
    const { settings, db, payload, send } = setup()
    const { revision } = await (await send('preview')).json()
    expect((await send('save')).status).toBe(400)
    expect((await send('save', { tokens: { colors: { primary: '#000' } } }, themeId, revision)).status).toBe(409)
    settings.themeStyles[draftKey] = { tokens: { colors: { primary: '#000' } }, revision: 2 }
    expect((await send('save', patch, themeId, revision)).status).toBe(409)
    expect(db.rollbackTransaction).toHaveBeenCalledTimes(2)
    expect(payload.updateGlobal).not.toHaveBeenCalled()
  })

  it('rolls back if the saved draft differs before commit', async () => {
    const { db, payload, send } = setup()
    const { revision } = await (await send('preview')).json()
    payload.updateGlobal.mockResolvedValueOnce(undefined)
    const response = await send('save', patch, themeId, revision)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ success: false })
    expect(db.commitTransaction).not.toHaveBeenCalled()
    expect(db.rollbackTransaction).toHaveBeenCalled()
  })

  it('reports failure if the committed draft cannot be read back', async () => {
    const { db, send } = setup()
    const { revision } = await (await send('preview')).json()
    db.commitTransaction.mockResolvedValueOnce(undefined)
    const response = await send('save', patch, themeId, revision)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ success: false })
  })

  it('check-draft: recognizes a valid saved draft for the selected Theme ID only', async () => {
    const { settings, payload, send } = setup()
    const ok = await send('check-draft')
    expect(ok.status).toBe(200)
    const body = await ok.json()
    expect(body.success).toBe(true)
    expect(body.preview).toMatchObject({
      revision: 1,
      colors: expect.arrayContaining([{ token: 'primary', value: '#123456' }]),
    })
    expect(payload.updateGlobal).not.toHaveBeenCalled()

    delete settings.themeStyles[draftKey]
    expect((await send('check-draft')).status).toBe(409)

    settings.themeStyles[draftKey] = { tokens: { colors: { primary: 'not-a-color' } } }
    expect((await send('check-draft')).status).toBe(409)

    expect((await send('check-draft', undefined, 'other-custom')).status).toBe(404)
    expect((await send('check-draft', undefined, 'corporate')).status).toBe(400)
    expect(payload.updateGlobal).not.toHaveBeenCalled()
    expect(settings.activeThemeId).toBe('corporate')
  })

  it('import save success then check-draft remains complete without mutating tokens again', async () => {
    const { settings, payload, send } = setup()
    const { revision } = await (await send('preview')).json()
    expect((await send('save', patch, themeId, revision)).status).toBe(200)
    const afterSave = structuredClone(settings.themeStyles[draftKey])
    payload.updateGlobal.mockClear()
    expect((await send('check-draft')).status).toBe(200)
    expect(settings.themeStyles[draftKey]).toEqual(afterSave)
    expect(payload.updateGlobal).not.toHaveBeenCalled()
  })
})
