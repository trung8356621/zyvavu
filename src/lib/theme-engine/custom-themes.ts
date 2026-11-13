import type { Payload } from 'payload'
import type { ThemeConfig } from './types'
import {
  DEFAULT_THEME_ID,
  getInstalledTheme,
  type InstalledTheme,
  type ThemePreviewTokens,
} from './themes'
import { assertThemeName, themeIdFromName } from './theme-identity'
import {
  DEFAULT_WEBSITE_TYPE,
  isWebsiteType,
  type WebsiteType,
} from './website-type'

export const CUSTOM_THEME_REGISTRY_KEY = 'theme_custom_registry'

export type CustomThemeRecord = {
  id: string
  label: string
  description: string
  version: number
  createdAt: string
  baseThemeId: string
  /** Optional for backward compatibility with older registry rows. */
  websiteType?: WebsiteType
  themeConfig: ThemeConfig
  preview: ThemePreviewTokens
}

type RegistryPayload = {
  themes: CustomThemeRecord[]
}

function previewFromConfig(config: ThemeConfig): ThemePreviewTokens {
  const colors = config.tokens?.colors || {}
  return {
    primary: colors.primary || '#0e6b66',
    accent: colors.accent || colors.primary || '#0e6b66',
    background: colors.background || '#ffffff',
    surface: colors.surface || '#f8faf9',
    text: colors.text || '#17201f',
    headerBackground: colors.headerBackground || colors.surface || '#ffffff',
    headerText: colors.headerText || colors.text || '#17201f',
    fontFamily: config.tokens?.typography?.fontFamily || 'system-ui, sans-serif',
  }
}

export function customRecordToInstalled(record: CustomThemeRecord): InstalledTheme {
  return {
    id: record.id,
    name: record.id,
    label: record.label,
    description: record.description,
    version: record.version,
    themeConfig: JSON.parse(JSON.stringify(record.themeConfig)) as ThemeConfig,
    templates: getInstalledTheme(record.baseThemeId || DEFAULT_THEME_ID).templates,
    preview: record.preview,
  }
}

export function readCustomThemeRegistry(themeStyles: unknown): CustomThemeRecord[] {
  if (!themeStyles || typeof themeStyles !== 'object' || Array.isArray(themeStyles)) return []
  const raw = (themeStyles as Record<string, unknown>)[CUSTOM_THEME_REGISTRY_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const themes = (raw as RegistryPayload).themes
  if (!Array.isArray(themes)) return []
  return themes.filter((theme): theme is CustomThemeRecord =>
    Boolean(theme && typeof theme === 'object' && typeof theme.id === 'string' && theme.themeConfig),
  )
}

export function writeCustomThemeRegistry(
  themeStyles: Record<string, unknown>,
  themes: CustomThemeRecord[],
): Record<string, unknown> {
  return {
    ...themeStyles,
    [CUSTOM_THEME_REGISTRY_KEY]: { themes } satisfies RegistryPayload,
  }
}

export type CreateThemeInput = {
  name: string
  description?: string
  baseThemeId?: string
  websiteType?: WebsiteType
}

export type CreateThemeResult =
  | { success: true; theme: CustomThemeRecord; activated: false }
  | { success: false; message: string }

/**
 * Creates a new inactive theme identity + cloned token base.
 * Persists metadata in Settings.themeStyles[theme_custom_registry] (existing JSON; no new table).
 * Does not change activeThemeId or copy existing Puck documents.
 */
export async function createCustomTheme(
  payload: Payload,
  input: CreateThemeInput,
  occupiedIds: string[],
): Promise<CreateThemeResult> {
  let label: string
  try {
    label = assertThemeName(input.name)
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Theme Name is required.' }
  }

  let themeId: string
  try {
    themeId = themeIdFromName(label)
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Invalid Theme Name.' }
  }

  if (occupiedIds.includes(themeId)) {
    return {
      success: false,
      message: `Theme ID "${themeId}" is already taken. Choose a different Theme Name; numeric suffixes are not appended automatically.`,
    }
  }

  const baseThemeId = input.baseThemeId || DEFAULT_THEME_ID
  const base = getInstalledTheme(baseThemeId)
  const themeConfig = JSON.parse(JSON.stringify(base.themeConfig)) as ThemeConfig
  themeConfig.name = themeId
  themeConfig.label = label
  const description =
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : `Custom theme based on ${base.label}.`
  const websiteType = isWebsiteType(input.websiteType)
    ? input.websiteType
    : DEFAULT_WEBSITE_TYPE

  const record: CustomThemeRecord = {
    id: themeId,
    label,
    description,
    version: 1,
    createdAt: new Date().toISOString(),
    baseThemeId: base.id,
    websiteType,
    themeConfig,
    preview: previewFromConfig(themeConfig),
  }

  try {
    const settings = (await payload
      .findGlobal({ slug: 'settings', overrideAccess: true })
      .catch(() => null)) as { themeStyles?: Record<string, unknown> } | null
    const existingStyles =
      settings?.themeStyles && typeof settings.themeStyles === 'object' && !Array.isArray(settings.themeStyles)
        ? { ...settings.themeStyles }
        : {}
    const existing = readCustomThemeRegistry(existingStyles)
    if (existing.some((theme) => theme.id === themeId) || occupiedIds.includes(themeId)) {
      return {
        success: false,
        message: `Theme ID "${themeId}" is already taken. Choose a different Theme Name; numeric suffixes are not appended automatically.`,
      }
    }
    const nextStyles = writeCustomThemeRegistry(existingStyles, [...existing, record])
    await payload.updateGlobal({
      slug: 'settings',
      data: { themeStyles: nextStyles },
      overrideAccess: true,
    })
    return { success: true, theme: record, activated: false }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create theme.',
    }
  }
}

export async function loadCustomThemes(payload: Payload): Promise<CustomThemeRecord[]> {
  const settings = (await payload
    .findGlobal({ slug: 'settings', overrideAccess: true })
    .catch(() => null)) as { themeStyles?: unknown } | null
  return readCustomThemeRegistry(settings?.themeStyles)
}
