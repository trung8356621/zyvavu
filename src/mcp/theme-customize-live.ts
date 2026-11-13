import { CURATED_FONTS, SYSTEM_FONTS } from '@/lib/theme-engine/fonts'
import { BUILTIN_COLOR_PRESETS, BUILTIN_TYPOGRAPHY_PRESETS, validateThemeTokens } from '@/lib/theme-engine/presets'
import { RESPONSIVE_BREAKPOINTS } from '@/lib/style-engine/responsive-style'
import { createCustomTheme } from '@/lib/theme-engine/custom-themes'
import { ensureCustomThemesRegistered } from '@/lib/theme-engine/register-custom-themes'
import { resolveActiveThemeId } from '@/lib/theme-engine/resolver'
import { generateThemeCss, mergeThemeConfig } from '@/lib/theme-engine/styles'
import { getInstalledTheme, listBundledThemeIds } from '@/lib/theme-engine/themes'
import { isWebsiteType, type WebsiteType } from '@/lib/theme-engine/website-type'
import type { ThemeConfig, ThemeTokens } from '@/lib/theme-engine/types'
import { readAuth, redactPrincipal } from './auth'
import { assertIsolatedWriteTarget, getMcpPayloadClient, resolveLiveBridgeConfig } from './live-bridge'
import { object, type RecordValue } from './shape'
import { assertStage0Handoff } from './stage0/handoff'
import {
  assertThemeIdAvailable,
  describeInstalledThemes,
  listKnownThemeIds,
  requireInstalledThemeId,
  themeIdFromName,
} from './theme-identity'
import { getThemeCustomizeStore, type ThemeStyleChannel } from './theme-customize-store'
import { ToolError } from './tool-contract'

const tokenSemantics = {
  baseline: 'Token values come from the selected theme base plus Theme Customize overrides.',
  overrides: 'Draft/published overrides are scoped by stable Theme ID.',
  typography: 'The heading font role inherits the theme font when no heading font is configured.',
  responsive: 'Theme tokens are shared across viewports. Per-breakpoint overrides belong to Theme Builder widget styles.',
}

function cssTokens(config: ThemeConfig) {
  const root = generateThemeCss(config).match(/:root\s*\{([^}]*)\}/)?.[1] ?? ''
  const declarations = new Map(
    [...root.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => [name, value.trim()]),
  )
  function resolve(value: string, visited = new Set<string>()): string | null {
    const alias = /^var\((--[\w-]+)(?:,\s*([^()]+))?\)$/.exec(value)
    if (!alias) return value.includes('var(') ? null : value
    const [, name, fallback] = alias
    if (visited.has(name)) return null
    visited.add(name)
    const target = declarations.get(name) ?? fallback
    return target === undefined ? null : resolve(target.trim(), visited)
  }
  return Object.fromEntries(
    [...declarations].map(([name, value]) => [name, { value, resolvedValue: resolve(value) }]),
  )
}

function requireStage0(args: RecordValue) {
  return assertStage0Handoff(args.stage0Assessment, { requireCurrentSnapshot: true })
}

function channelOf(args: RecordValue): ThemeStyleChannel {
  return args.channel === 'published' ? 'published' : 'draft'
}

function tokensOf(args: RecordValue): Partial<ThemeTokens> {
  if (!object(args.tokens)) {
    throw new ToolError('INVALID_ARGUMENTS', 'tokens object is required.')
  }
  return args.tokens as Partial<ThemeTokens>
}

export async function listThemeCustomize(args: RecordValue) {
  const principal = await readAuth(args)
  const bridge = resolveLiveBridgeConfig()
  const payload = getMcpPayloadClient()
  if (payload && bridge.enabled) {
    await ensureCustomThemesRegistered(payload)
  }
  const themes = describeInstalledThemes()
  return {
    principal: redactPrincipal(principal),
    themes,
    store: getThemeCustomizeStore().kind,
    liveBridge: {
      enabled: bridge.enabled,
      reason: bridge.reason,
    },
    notes: {
      themeIdImmutable: true,
      createStatus: bridge.enabled ? 'AVAILABLE' : 'UNAVAILABLE',
      createReason: bridge.enabled
        ? 'Trusted auth + live bridge: createCustomTheme is available for inactive themes.'
        : 'Live create requires trusted auth and ZYVAVU_MCP_LIVE_WRITES with a bound Payload client.',
    },
  }
}

export async function getThemeCustomize(args: RecordValue) {
  const principal = await readAuth(args)
  const payload = getMcpPayloadClient()
  const bridge = resolveLiveBridgeConfig()
  if (payload && bridge.enabled) {
    await ensureCustomThemesRegistered(payload)
  }
  const themeId = requireInstalledThemeId(args.themeId)
  const channel = channelOf(args)
  const installed = getInstalledTheme(themeId)
  const store = getThemeCustomizeStore()
  const override = await store.read(themeId, channel)
  const base = installed.themeConfig
  const effective = override
    ? mergeThemeConfig(base, {
        tokens: override.tokens as ThemeTokens,
        ...(override.slots ? { slots: override.slots } : {}),
      })
    : base
  return {
    principal: redactPrincipal(principal),
    themeId,
    channel,
    source: override ? store.kind : 'bundled',
    identity: {
      id: installed.id,
      label: installed.label,
      name: installed.name,
      themeIdImmutable: true,
    },
    revision: override?.revision ?? 0,
    updatedAt: override?.updatedAt || null,
    tokens: effective.tokens,
    schemaResource: 'zyvavu://catalog/theme-customize-schema',
    cssTokens: cssTokens(effective),
    presets: { colors: BUILTIN_COLOR_PRESETS, typography: BUILTIN_TYPOGRAPHY_PRESETS },
    fonts: { curated: CURATED_FONTS, system: SYSTEM_FONTS },
    breakpoints: RESPONSIVE_BREAKPOINTS,
    inheritance: tokenSemantics,
    override: override
      ? { present: true, revision: override.revision, updatedAt: override.updatedAt }
      : { present: false, revision: 0, updatedAt: null },
  }
}

export async function validateThemeCustomize(args: RecordValue) {
  await readAuth(args)
  const tokens = tokensOf(args)
  const validation = validateThemeTokens(tokens, { strict: true })
  return {
    valid: validation.valid,
    errors: validation.errors,
    wcag: 'Theme Customize owns WCAG AA checks; MCP validates token shape/types only.',
  }
}

export async function updateThemeCustomize(args: RecordValue) {
  const principal = await readAuth(args)
  const handoff = requireStage0(args)
  const themeId = requireInstalledThemeId(args.themeId)
  const channel = channelOf(args)
  const tokens = tokensOf(args)
  const validation = validateThemeTokens(tokens, { strict: true })
  if (!validation.valid) {
    throw new ToolError(
      'INVALID_ARGUMENTS',
      'Theme tokens failed validation.',
      validation.errors.map((message) => ({
        path: '$.tokens',
        code: 'INVALID_TOKENS',
        message,
      })),
    )
  }

  const store = getThemeCustomizeStore()
  const bridge = resolveLiveBridgeConfig()
  const payload = getMcpPayloadClient()

  if (store.kind === 'payload') {
    if (!bridge.enabled || !payload) {
      throw new ToolError(
        'ACCESS_DENIED',
        'Payload Theme Customize writes require trusted auth and an enabled live bridge (ZYVAVU_MCP_LIVE_WRITES=1 + bound Payload).',
      )
    }
    const activeThemeId = await resolveActiveThemeId(payload).catch(() => null)
    try {
      assertIsolatedWriteTarget({ themeId, activeThemeId, operation: 'update' })
    } catch (error) {
      throw new ToolError(
        'ACCESS_DENIED',
        error instanceof Error ? error.message : 'Live write target is not isolated.',
      )
    }

    const expectedRevision = typeof args.expectedRevision === 'number' ? args.expectedRevision : undefined
    const idempotencyKey = typeof args.idempotencyKey === 'string' ? args.idempotencyKey : undefined
    const slots = object(args.slots) ? (args.slots as Record<string, Record<string, string>>) : undefined
    // Single write path: payload store uses Settings.themeStyles keys compatible with Theme Customize /
    // saveThemeStyleOverride. The application token validator already checked the proposal.
    const saved = await store.write(themeId, channel, {
      tokens,
      slots,
      expectedRevision,
      idempotencyKey,
    })

    const readBack = await getThemeCustomize({
      auth: args.auth,
      themeId,
      channel,
    })
    return {
      success: true,
      principal: redactPrincipal(principal),
      stage0: handoff,
      persistence: 'payload',
      saved: {
        themeId: saved.themeId,
        channel: saved.channel,
        revision: saved.revision,
        updatedAt: saved.updatedAt,
      },
      readBack,
    }
  }

  // Disposable memory path (default QA isolation — never touches Settings).
  const expectedRevision = typeof args.expectedRevision === 'number' ? args.expectedRevision : undefined
  const idempotencyKey = typeof args.idempotencyKey === 'string' ? args.idempotencyKey : undefined
  const slots = object(args.slots) ? (args.slots as Record<string, Record<string, string>>) : undefined
  const saved = await store.write(themeId, channel, {
    tokens,
    slots,
    expectedRevision,
    idempotencyKey,
  })
  const readBack = await getThemeCustomize({
    auth: args.auth,
    themeId,
    channel,
  })
  return {
    success: true,
    principal: redactPrincipal(principal),
    stage0: handoff,
    persistence: 'memory',
    saved: {
      themeId: saved.themeId,
      channel: saved.channel,
      revision: saved.revision,
      updatedAt: saved.updatedAt,
    },
    readBack,
  }
}

/**
 * Create reuses createCustomTheme when the live bridge is enabled.
 * Theme ID remains name-based; websiteType is preserved; theme stays inactive.
 */
export async function createThemeCustomize(args: RecordValue) {
  const principal = await readAuth(args)
  const handoff = requireStage0(args)
  const themeId = themeIdFromName(args.name)
  const websiteType: WebsiteType | undefined = isWebsiteType(args.websiteType)
    ? args.websiteType
    : undefined
  const tokens = object(args.tokens) ? (args.tokens as Partial<ThemeTokens>) : undefined
  const validation = tokens
    ? validateThemeTokens(tokens, { strict: true })
    : { valid: false, errors: ['tokens object is required for create preparation.'] }

  const bridge = resolveLiveBridgeConfig()
  const payload = getMcpPayloadClient()
  if (!bridge.enabled || !payload) {
    assertThemeIdAvailable(themeId, listKnownThemeIds())
    return {
      success: false,
      code: 'CREATE_UNAVAILABLE',
      message:
        'Theme Customize create requires trusted auth and an enabled live bridge (ZYVAVU_MCP_LIVE_WRITES=1 + bound Payload). Theme Creation UI is unchanged.',
      principal: redactPrincipal(principal),
      stage0: handoff,
      identity: {
        name: String(args.name).trim(),
        themeId,
        themeIdImmutable: true,
        uniqueness: 'available',
        websiteType: websiteType || null,
      },
      validation,
      next: 'Enable the live bridge against an isolated QA Payload, or use the Admin Create Theme Wizard.',
    }
  }

  await ensureCustomThemesRegistered(payload)
  const occupied = listKnownThemeIds()
  assertThemeIdAvailable(themeId, occupied)

  const activeThemeId = await resolveActiveThemeId(payload).catch(() => null)
  try {
    assertIsolatedWriteTarget({ themeId, activeThemeId, operation: 'create' })
  } catch (error) {
    throw new ToolError(
      'ACCESS_DENIED',
      error instanceof Error ? error.message : 'Create target is not isolated.',
    )
  }

  if (listBundledThemeIds().includes(themeId)) {
    throw new ToolError(
      'INVALID_ARGUMENTS',
      `Theme ID "${themeId}" is already taken. Choose a different Theme Name; numeric suffixes are not appended automatically.`,
    )
  }

  const result = await createCustomTheme(
    payload,
    {
      name: String(args.name),
      description: typeof args.description === 'string' ? args.description : undefined,
      websiteType,
    },
    occupied,
  )
  if (!result.success) {
    throw new ToolError('INVALID_ARGUMENTS', result.message)
  }

  await ensureCustomThemesRegistered(payload)

  if (tokens && validation.valid) {
    const store = getThemeCustomizeStore()
    if (store.kind === 'payload') {
      // Same Settings.themeStyles key layout as saveThemeStyleOverride; revision metadata included.
      await store.write(result.theme.id, 'draft', { tokens, expectedRevision: 0 })
    }
  }

  const readBack = await getThemeCustomize({
    auth: args.auth,
    themeId: result.theme.id,
    channel: 'draft',
  })

  return {
    success: true,
    activated: false,
    principal: redactPrincipal(principal),
    stage0: handoff,
    persistence: 'payload',
    theme: {
      id: result.theme.id,
      label: result.theme.label,
      description: result.theme.description,
      websiteType: result.theme.websiteType,
      version: result.theme.version,
    },
    identity: {
      name: result.theme.label,
      themeId: result.theme.id,
      themeIdImmutable: true,
      uniqueness: 'created',
      websiteType: result.theme.websiteType || null,
    },
    validation,
    readBack,
  }
}
