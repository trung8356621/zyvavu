import { describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import {
  buildThemeBuilderPrompt,
  buildThemeCustomizePrompt,
  themeBuilderHref,
  themeCustomizerHref,
} from '@/lib/theme-engine/create-theme-prompts'
import {
  createCustomTheme,
  CUSTOM_THEME_REGISTRY_KEY,
  readCustomThemeRegistry,
  writeCustomThemeRegistry,
} from '@/lib/theme-engine/custom-themes'
import { themeIdFromName } from '@/lib/theme-engine/theme-identity'
import { DEFAULT_BUILDER_MODE, DEFAULT_BUILDER_TEMPLATE } from '@/lib/theme-engine/builder-navigation'
import {
  getAllInstalledThemes,
  INSTALLED_THEMES,
  isValidThemeId,
  listBundledThemeIds,
  setRuntimeCustomThemes,
} from '@/lib/theme-engine/themes'
import { customRecordToInstalled } from '@/lib/theme-engine/custom-themes'
import {
  normalizeWebsiteType,
  WEBSITE_TYPES,
  websiteTypeLabel,
} from '@/lib/theme-engine/website-type'
import {
  buildCustomizeDraftPreview,
  fetchCustomizeDraftComplete,
  interpretCustomizeDraftCheck,
} from '@/lib/theme-engine/wizard-customize-completion'

describe('Create Theme wizard contracts', () => {
  it('A/B/C. generates slug from theme name', () => {
    expect(themeIdFromName('Corporate Clean')).toBe('corporate-clean')
    expect(themeIdFromName('Nhà Hàng Việt')).toBe('nha-hang-viet')
  })

  it('Website Type: supports three selectable types without affecting Theme ID', () => {
    expect([...WEBSITE_TYPES]).toEqual(['editorial', 'corporate', 'commerce'])
    expect(websiteTypeLabel('editorial')).toBe('Blog / Editorial')
    expect(websiteTypeLabel('corporate')).toBe('Corporate / Business')
    expect(websiteTypeLabel('commerce')).toBe('Commerce / Store')
    expect(themeIdFromName('Fresh Store')).toBe('fresh-store')
    expect(normalizeWebsiteType(undefined)).toBe('corporate')
    expect(normalizeWebsiteType('legacy-unknown')).toBe('corporate')
  })

  it('D. rejects duplicate slug against occupied ids', async () => {
    const payload = {
      findGlobal: async (_args: unknown) => ({ themeStyles: {} }),
      updateGlobal: async (_args: unknown) => ({}),
    }
    const result = await createCustomTheme(
      payload as unknown as Payload,
      { name: 'Corporate' },
      listBundledThemeIds(),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toMatch(/already taken/)
    }
  })

  it('E/F. create remains inactive and does not touch bundled themes', async () => {
    const before = structuredClone(INSTALLED_THEMES.corporate.themeConfig.tokens.colors.primary)
    let saved: Record<string, unknown> | null = null
    const payload = {
      findGlobal: async (_args: unknown) => ({ themeStyles: {} }),
      updateGlobal: async (args: unknown) => {
        const data = (args as { data: { themeStyles: Record<string, unknown> } }).data
        saved = data.themeStyles
        return {}
      },
    }
    const result = await createCustomTheme(
      payload as unknown as Payload,
      { name: 'Fresh Brand Theme', description: 'QA theme', websiteType: 'commerce' },
      listBundledThemeIds(),
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.activated).toBe(false)
      expect(result.theme.id).toBe('fresh-brand-theme')
      expect(result.theme.websiteType).toBe('commerce')
      expect(saved).toBeTruthy()
      expect(saved?.[CUSTOM_THEME_REGISTRY_KEY]).toBeTruthy()
      const registry = readCustomThemeRegistry(saved)
      expect(registry).toHaveLength(1)
      expect(registry[0].id).toBe('fresh-brand-theme')
      expect(registry[0].websiteType).toBe('commerce')
    }
    expect(INSTALLED_THEMES.corporate.themeConfig.tokens.colors.primary).toBe(before)
  })

  it('G/H. manual editor hrefs use stable Theme ID', () => {
    expect(themeCustomizerHref('fresh-brand-theme')).toBe(
      '/admin/theme-customizer?theme=fresh-brand-theme',
    )
    expect(themeBuilderHref('fresh-brand-theme')).toBe(
      '/admin/theme-builder?theme=fresh-brand-theme',
    )
  })

  it('I/J/K. prompts include identity, website type, and Stage 0 gate', () => {
    const customize = buildThemeCustomizePrompt({
      themeId: 'fresh-brand-theme',
      themeName: 'Fresh Brand Theme',
      websiteType: 'editorial',
      styleDescription: 'Navy and white',
    })
    expect(customize).toContain('Theme ID: fresh-brand-theme')
    expect(customize).toContain('Fresh Brand Theme')
    expect(customize).toContain('Website Type: editorial')
    expect(customize).toContain('Reading-focused typography')
    expect(customize).toMatch(/Do NOT invent a fixed palette solely from Website Type/i)
    expect(customize).toContain('zyvavu_theme_customize_validate')
    expect(customize).toContain('file named `theme.json`')
    expect(customize).toContain('If MCP does not expose the actual schema, report that blocker and stop.')
    expect(customize).toContain('Never claim the JSON artifact has been imported or saved.')
    expect(customize).toContain('zyvavu_get_theme_customize_schema')
    expect(customize).toContain('zyvavu_validate_theme_import')
    expect(customize).toContain('colors, typography (body and heading font families, base metrics, h1–h6 and p1–p3), spacing, layout, and radius')
    expect(customize).toContain('For each omitted group, report its name and reason outside the JSON.')
    expect(customize).not.toContain('OpenAI')
    expect(customize).not.toContain('fetch(')

    const builder = buildThemeBuilderPrompt({
      themeId: 'fresh-brand-theme',
      themeName: 'Fresh Brand Theme',
      websiteType: 'commerce',
      websiteRequirements: 'Home About Contact',
    })
    expect(builder).toContain('Theme ID: fresh-brand-theme')
    expect(builder).toContain('Website Type: commerce')
    expect(builder).toContain('Stage 0')
    expect(builder).toContain('BLOCKED')
    expect(builder).toContain('zyvavu_assess_theme_requirements')
    expect(builder).toMatch(/Stage 0 remains mandatory/i)
    expect(builder).toMatch(/Do not change Theme Customize tokens/i)
    expect(builder).toMatch(/UNSUPPORTED/i)
    expect(builder).toMatch(/never assume Products collection, Cart, Checkout, or Payment exist/i)
  })

  it('L. copy prompt helpers are pure (no completion side effects)', () => {
    const first = buildThemeCustomizePrompt({
      themeId: 'a',
      themeName: 'A',
      styleDescription: 'x',
    })
    const second = buildThemeCustomizePrompt({
      themeId: 'a',
      themeName: 'A',
      styleDescription: 'x',
    })
    expect(first).toBe(second)
  })

  it('defaults the wizard to a Home-only prompt with stable theme and document identity', () => {
    const ctx = {
      themeId: 'mcp-blog-test-2',
      themeName: 'MCP Blog Test 2',
      websiteType: 'editorial',
      websiteRequirements: 'Featured stories and latest posts.',
    }
    expect(DEFAULT_BUILDER_MODE).toBe('single')
    expect(DEFAULT_BUILDER_TEMPLATE).toBe('home')
    const single = buildThemeBuilderPrompt(ctx, { mode: DEFAULT_BUILDER_MODE, template: DEFAULT_BUILDER_TEMPLATE })
    expect(single).toContain('Template identity: mcp-blog-test-2/home')
    expect(single).toContain('Website Type: editorial')
    expect(single).toContain('Featured stories and latest posts.')
    expect(single).toContain('STOP if readiness is BLOCKED')
    expect(single).toContain('Reuse existing Header/Footer')
    expect(single).toContain('exactly one Puck document')
    expect(single).toContain('Theme Builder')
    expect(single).toContain('Nhập Template JSON')
    expect(single).toContain('NEW version id')
    expect(single).toContain('"themeId": "mcp-blog-test-2"')
    expect(single).toContain('"template": "home"')
    expect(single).toContain('versionId')
    expect(single).toContain('document.content')
    expect(single).toContain('Theme Customize `{ themeId, tokens }`')
    expect(single).toContain('512 KB')
    expect(single).not.toMatch(/Category|Single Post|Website Type suggestions/)
    expect(themeBuilderHref(ctx.themeId, 'home')).toBe('/admin/theme-builder?theme=mcp-blog-test-2&template=home')
    expect(themeBuilderHref(ctx.themeId, {
      template: 'home',
      templateVersion: 'v2',
    })).toBe('/admin/theme-builder?theme=mcp-blog-test-2&template=home&templateVersion=v2')
    expect(themeBuilderHref(ctx.themeId, {
      template: 'single',
      openVersionImport: true,
    })).toBe('/admin/theme-builder?theme=mcp-blog-test-2&template=single&action=import-version')
    expect(themeBuilderHref(ctx.themeId, 'loopItem', 'story-card')).toBe(
      '/admin/theme-builder?theme=mcp-blog-test-2&template=loopItem&loopItem=story-card',
    )
    const full = buildThemeBuilderPrompt(ctx, { mode: 'full' })
    expect(full).toContain('one consolidated Stage 0 assessment')
    expect(full).toContain('validate it separately')
    expect(full).toContain('ONE UTF-8 JSON file per approved template')
    expect(full).toContain('Nhập Template JSON')
    expect(full).toContain('status per template')
    expect(full).toContain('if any required template failed or remains unsaved')
  })

  it('M. no external AI API surface in prompt builders', () => {
    const text = buildThemeBuilderPrompt({ themeId: 'x', themeName: 'X' })
    expect(text).not.toMatch(/api\.openai|openrouter|generativelanguage|Authorization: Bearer/i)
  })

  it('N/O. registry write preserves unrelated themeStyles keys', () => {
    const next = writeCustomThemeRegistry(
      {
        theme_style_corporate_draft: { tokens: { colors: { primary: '#111111' } } },
      },
      [
        {
          id: 'fresh-brand-theme',
          label: 'Fresh Brand Theme',
          description: 'QA',
          version: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          baseThemeId: 'corporate',
          themeConfig: INSTALLED_THEMES.corporate.themeConfig,
          preview: INSTALLED_THEMES.corporate.preview,
        },
      ],
    )
    expect(next.theme_style_corporate_draft).toEqual({
      tokens: { colors: { primary: '#111111' } },
    })
    expect(isValidThemeId('fresh-brand-theme')).toBe(false)
    setRuntimeCustomThemes([
      customRecordToInstalled({
        id: 'fresh-brand-theme',
        label: 'Fresh Brand Theme',
        description: 'QA',
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        baseThemeId: 'corporate',
        themeConfig: INSTALLED_THEMES.corporate.themeConfig,
        preview: INSTALLED_THEMES.corporate.preview,
      }),
    ])
    expect(isValidThemeId('fresh-brand-theme')).toBe(true)
    expect(getAllInstalledThemes().some((theme) => theme.id === 'fresh-brand-theme')).toBe(true)
    setRuntimeCustomThemes([])
  })

  it('Step 1 completion is derived from verified draft check, not sessionStorage', () => {
    const preview = buildCustomizeDraftPreview({
      revision: 3,
      tokens: {
        colors: { primary: '#116B65', background: '#FAF7F0', surface: '#FFFDF8', text: '#14283F', border: '#E4DED2' },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontFamilyHeading: 'Lora, Georgia, serif',
          baseFontSize: '18px',
          h1: { size: '44px', weight: '700' },
        },
        spacing: { sm: '8px', md: '16px' },
        layout: { containerWidth: '1120px' },
        radius: { md: '8px' },
      },
    })
    expect(preview).toMatchObject({
      revision: 3,
      colors: [
        { token: 'background', value: '#FAF7F0' },
        { token: 'surface', value: '#FFFDF8' },
        { token: 'primary', value: '#116B65' },
        { token: 'text', value: '#14283F' },
        { token: 'border', value: '#E4DED2' },
      ],
      typography: {
        headingFont: 'Lora, Georgia, serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        baseFontSize: '18px',
        samples: [{ token: 'h1', summary: '44px / 700' }],
      },
      spacing: [
        { token: 'sm', value: '8px' },
        { token: 'md', value: '16px' },
      ],
      layout: [{ token: 'containerWidth', value: '1120px' }],
      radius: [{ token: 'md', value: '8px' }],
    })
    expect(buildCustomizeDraftPreview(null)).toBeNull()
    expect(buildCustomizeDraftPreview({ tokens: undefined })).toBeNull()
    expect(interpretCustomizeDraftCheck({ ok: true, success: true, preview: preview! })).toEqual({
      complete: true,
      preview,
    })
    expect(interpretCustomizeDraftCheck({
      ok: false,
      success: false,
      errors: ['Save a draft in Theme Customizer first.'],
    })).toEqual({
      complete: false,
      errors: ['Save a draft in Theme Customizer first.'],
    })
    expect(interpretCustomizeDraftCheck({ ok: true, success: false })).toEqual({ complete: false })
  })

  it('fetchCustomizeDraftComplete scopes by Theme ID and never treats network failure as complete', async () => {
    const calls: string[] = []
    const original = globalThis.fetch
    const preview = {
      revision: 3,
      updatedAt: null,
      colors: [{ token: 'primary', value: '#116B65' }],
      typography: { samples: [] },
      spacing: [],
      layout: [],
      radius: [],
    }
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      const url = String(input)
      if (url.includes('themeId=mcp-blog-test-2')) {
        return new Response(JSON.stringify({ success: true, preview }), { status: 200 })
      }
      if (url.includes('themeId=empty-theme')) {
        return new Response(JSON.stringify({
          success: false,
          errors: ['Save a draft in Theme Customizer first.'],
        }), { status: 409 })
      }
      return new Response(JSON.stringify({ success: false }), { status: 500 })
    }) as typeof fetch
    try {
      await expect(fetchCustomizeDraftComplete('mcp-blog-test-2')).resolves.toEqual({
        complete: true,
        preview,
      })
      await expect(fetchCustomizeDraftComplete('empty-theme')).resolves.toEqual({
        complete: false,
        errors: ['Save a draft in Theme Customizer first.'],
      })
      await expect(fetchCustomizeDraftComplete('wrong-theme')).resolves.toEqual({ complete: false })
      expect(calls.every((url) => url.includes('/api/theme-customizer/import?'))).toBe(true)
      expect(calls[0]).toContain('themeId=mcp-blog-test-2')
      expect(calls[0]).toContain('action=check-draft')
      expect(calls[1]).toContain('themeId=empty-theme')
      expect(calls[2]).toContain('themeId=wrong-theme')
      expect(calls[2]).not.toContain('themeId=mcp-blog-test-2')
    } finally {
      globalThis.fetch = original
    }
  })

  it('H. older custom themes without websiteType remain loadable', () => {
    const legacy = readCustomThemeRegistry({
      [CUSTOM_THEME_REGISTRY_KEY]: {
        themes: [
          {
            id: 'legacy-custom',
            label: 'Legacy Custom',
            description: 'pre-websiteType',
            version: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            baseThemeId: 'corporate',
            themeConfig: INSTALLED_THEMES.corporate.themeConfig,
            preview: INSTALLED_THEMES.corporate.preview,
          },
        ],
      },
    })
    expect(legacy).toHaveLength(1)
    expect(legacy[0].websiteType).toBeUndefined()
    expect(normalizeWebsiteType(legacy[0].websiteType)).toBe('corporate')
    const installed = customRecordToInstalled(legacy[0])
    expect(installed.id).toBe('legacy-custom')
  })
})
