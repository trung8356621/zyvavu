/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import {
  resolveActiveThemeId,
  resolveCurrentThemeId,
  setActiveThemeId,
  resolveThemeTemplate,
  saveThemeTemplateOverride,
} from '@/lib/theme-engine/resolver'
import {
  resolveActiveThemeConfig,
  resolveDraftThemeConfig,
  saveThemeStyleOverride,
  resolveCustomPresets,
  saveCustomPreset,
} from '@/lib/theme-engine/styles'
import { getBundledTemplateForTheme } from '@/lib/theme-engine/themes'

let payload: Payload

describe('multi-theme PostgreSQL persistence & activation hotfix', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    // Ensure clean state before test run
    await payload.updateGlobal({
      slug: 'settings',
      data: {
        activeThemeId: 'corporate',
        themeTemplates: {},
        themeStyles: {},
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    // Reset back to corporate clean state and clean test overrides
    await payload.updateGlobal({
      slug: 'settings',
      data: {
        activeThemeId: 'corporate',
        themeTemplates: {},
        themeStyles: {},
      },
      overrideAccess: true,
    })
  })

  it('1 & 2: Activates Industrial Bold and verifies persistence in PostgreSQL', async () => {
    const success = await setActiveThemeId(payload, 'industrial')
    expect(success).toBe(true)

    // Direct database read via findGlobal
    const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    expect((settings as any).activeThemeId).toBe('industrial')

    // Direct SQL read from PostgreSQL settings table
    const db: any = payload.db
    const sqlRes = await db.drizzle.execute('SELECT active_theme_id FROM settings LIMIT 1')
    expect(sqlRes.rows[0].active_theme_id).toBe('industrial')
  })

  it('3 & 4: Reloads active theme and confirms Industrial remains active site-wide', async () => {
    const active = await resolveActiveThemeId(payload)
    expect(active).toBe('industrial')

    const current = await resolveCurrentThemeId(payload)
    expect(current).toBe('industrial')
  })

  it('5: Verifies public SSR uses Industrial theme configuration and templates', async () => {
    // Anonymous public visitor (isStaff = false) cannot override theme via parameters
    const publicTheme = await resolveCurrentThemeId(payload, { previewTheme: 'editorial', isStaff: false })
    expect(publicTheme).toBe('industrial')

    // Resolved template is industrial
    const homeTemplate = await resolveThemeTemplate(payload, 'home')
    expect(homeTemplate.template).toBe('home')
    const firstWidget = homeTemplate.zones?.[`${homeTemplate.content[0].props.id}:content`]?.[0] || homeTemplate.content[0]
    expect(firstWidget.props.title).toContain('HỆ THỐNG SẢN XUẤT CÔNG NGHIỆP')

    // Resolved style tokens are industrial
    const themeConfig = await resolveActiveThemeConfig(payload)
    expect(themeConfig.tokens.colors.primary).toBe('#2f6a38')
  })

  it('6 & 7: Activates Editorial Modern and verifies persistence after reload', async () => {
    const success = await setActiveThemeId(payload, 'editorial')
    expect(success).toBe(true)

    const active = await resolveActiveThemeId(payload)
    expect(active).toBe('editorial')

    const db: any = payload.db
    const sqlRes = await db.drizzle.execute('SELECT active_theme_id FROM settings LIMIT 1')
    expect(sqlRes.rows[0].active_theme_id).toBe('editorial')

    const themeConfig = await resolveActiveThemeConfig(payload)
    expect(themeConfig.tokens.colors.primary).toBe('#7c1d2e')
  })

  it('8: Verifies Theme Builder save and Theme Customizer publish persistence paths', async () => {
    // Theme Builder Save for industrial home template
    const industrialBase = getBundledTemplateForTheme('industrial', 'home')
    const customizedDoc = {
      ...industrialBase,
      content: industrialBase.content.map((item, idx) =>
        idx === 0
          ? { ...item, props: { ...item.props, title: 'Customized Industrial Showcase' } }
          : item,
      ),
    }
    const saveRes = await saveThemeTemplateOverride(payload, 'home', customizedDoc, null, 'industrial')
    if (!saveRes.success) {
      console.error('saveThemeTemplateOverride errors:', saveRes.errors)
    }
    expect(saveRes.success).toBe(true)

    // Verify template override persisted in settings
    const loadedDoc = await resolveThemeTemplate(payload, 'home', 'industrial')
    expect(loadedDoc.content[0].props.title).toBe('Customized Industrial Showcase')

    // Theme Customizer Publish for industrial
    const styleRes = await saveThemeStyleOverride(
      payload,
      { colors: { primary: '#00ffaa' } } as any,
      true,
      undefined,
      'industrial',
    )
    if (!styleRes.success) {
      console.error('saveThemeStyleOverride errors:', styleRes.errors)
    }
    expect(styleRes.success).toBe(true)

    // Verify style override persisted
    const loadedStyle = await resolveActiveThemeConfig(payload, 'industrial')
    expect(loadedStyle.tokens.colors.primary).toBe('#00ffaa')

    // Theme Customizer custom preset save
    const presetRes = await saveCustomPreset(payload, 'colors', {
      id: 'test-preset-1',
      name: 'Custom Test Palette',
      primary: '#112233',
      secondary: '#445566',
      surface: '#ffffff',
      background: '#f8f9fa',
      text: '#111827',
    } as any)
    expect(presetRes.success).toBe(true)

    const presets = await resolveCustomPresets(payload)
    expect(presets.colors.some((c) => c.name === 'Custom Test Palette')).toBe(true)
  })

  it('9: Returns to Corporate and verifies previous theme data and customizations remain intact', async () => {
    const success = await setActiveThemeId(payload, 'corporate')
    expect(success).toBe(true)

    const active = await resolveActiveThemeId(payload)
    expect(active).toBe('corporate')

    // Verify industrial customization was preserved and not overwritten
    const industrialTemplate = await resolveThemeTemplate(payload, 'home', 'industrial')
    expect(industrialTemplate.content[0].props.title).toBe('Customized Industrial Showcase')

    const industrialStyle = await resolveActiveThemeConfig(payload, 'industrial')
    expect(industrialStyle.tokens.colors.primary).toBe('#00ffaa')

    // Corporate remains clean defaults
    const corporateConfig = await resolveActiveThemeConfig(payload, 'corporate')
    expect(corporateConfig.tokens.colors.primary).toBe('#0e6b66')
  })

  it('10: Validates HTTP endpoint POST /api/themes/activate with site-staff role', async () => {
    const endpoint = payload.config.endpoints?.find(
      (e) => e.path === '/themes/activate' && e.method === 'post',
    )
    expect(endpoint).toBeDefined()

    const mockReq = {
      method: 'POST',
      user: { id: 1, role: 'site-admin' },
      payload,
      json: async () => ({ themeId: 'editorial' }),
    }

    const response = (await endpoint!.handler(mockReq as any)) as Response
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.activeTheme).toBe('editorial')

    // Check that DB now has editorial
    expect(await resolveActiveThemeId(payload)).toBe('editorial')

    // Also test forbidden without site-staff
    const anonReq = {
      method: 'POST',
      user: undefined,
      payload,
      json: async () => ({ themeId: 'industrial' }),
    }
    const forbiddenRes = (await endpoint!.handler(anonReq as any)) as Response
    expect(forbiddenRes.status).toBe(403)

    // Clean up back to corporate
    await setActiveThemeId(payload, 'corporate')
  })
})
