// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { CUSTOM_THEME_REGISTRY_KEY } from '@/lib/theme-engine/custom-themes'
import { resolveActiveThemeId, resolveThemeTemplate } from '@/lib/theme-engine/resolver'
import { INSTALLED_THEMES, setRuntimeCustomThemes } from '@/lib/theme-engine/themes'
import { homeVersionDocKey, homeVersionIndexKey } from '@/lib/theme-engine/home-versions-types'

const themeId = 'mcp-blog-test-2'
const lumaDoc = {
  ...structuredClone(INSTALLED_THEMES.corporate.templates.home),
  root: { props: { title: 'LUMA One' } },
  content: [{ type: 'Section', props: { id: 'luma-section' }, children: [] }],
}

function payloadWithCustomActive(seed: Record<string, unknown> = {}) {
  const settings = {
    activeThemeId: themeId,
    themeTemplates: { ...seed },
    themeStyles: {
      [CUSTOM_THEME_REGISTRY_KEY]: {
        themes: [
          {
            id: themeId,
            label: 'MCP Blog Test 2',
            description: '',
            version: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            baseThemeId: 'corporate',
            websiteType: 'editorial',
            themeConfig: INSTALLED_THEMES.corporate.themeConfig,
            preview: INSTALLED_THEMES.corporate.preview,
          },
        ],
      },
    },
  }
  const payload = {
    findGlobal: vi.fn(async () => structuredClone(settings)),
    find: vi.fn(async () => ({ docs: [] })),
    updateGlobal: vi.fn(async () => settings),
  }
  return { payload: payload as unknown as Payload, settings }
}

describe('custom theme frontend resolve', () => {
  beforeEach(() => {
    setRuntimeCustomThemes([])
  })

  it('resolveActiveThemeId loads custom registry before validating activeThemeId', async () => {
    const { payload } = payloadWithCustomActive()
    await expect(resolveActiveThemeId(payload)).resolves.toBe(themeId)
  })

  it('resolveThemeTemplate returns Primary Home v3 for active custom theme', async () => {
    const { payload } = payloadWithCustomActive({
      [homeVersionIndexKey(themeId)]: {
        primaryId: 'v3',
        items: [
          { id: 'v1', name: 'Home v1' },
          { id: 'v3', name: 'Home v3' },
        ],
      },
      [homeVersionDocKey(themeId, 'v3')]: lumaDoc,
    })

    const doc = await resolveThemeTemplate(payload, 'home')
    expect(doc.root?.props?.title).toBe('LUMA One')
  })
})
