import type {
  ColorPreset,
  CustomPresetsStore,
  ThemeConfig,
  ThemeTokens,
  TypographyPreset,
} from './types'
import { validateThemeTokens } from './presets'
import {
  DEFAULT_THEME_ID,
  getInstalledTheme,
  normalizeThemeId,
} from './themes'
import { getPreviewThemeFromCookie, resolveActiveThemeId } from './resolver'

export const THEME_STYLE_PUBLISHED_KEY = 'theme_style_published'
export const THEME_STYLE_DRAFT_KEY = 'theme_style_draft'
export const THEME_CUSTOM_PRESETS_KEY = 'theme_custom_presets'

export function getActiveThemeConfig(themeId?: string): ThemeConfig {
  const theme = getInstalledTheme(themeId)
  return JSON.parse(JSON.stringify(theme.themeConfig)) as ThemeConfig
}

/**
 * Safely deep-merges theme tokens and slots overrides onto a base ThemeConfig.
 */
export function mergeThemeConfig(base: ThemeConfig, override?: Partial<ThemeConfig>): ThemeConfig {
  if (!override) return JSON.parse(JSON.stringify(base))
  return {
    ...base,
    ...override,
    tokens: {
      ...base.tokens,
      ...(override.tokens || {}),
      colors: {
        ...base.tokens?.colors,
        ...(override.tokens?.colors || {}),
      },
      typography: {
        ...base.tokens?.typography,
        ...(override.tokens?.typography || {}),
      },
      spacing: {
        ...base.tokens?.spacing,
        ...(override.tokens?.spacing || {}),
      },
      layout: {
        ...base.tokens?.layout,
        ...(override.tokens?.layout || {}),
      },
      radius: {
        ...base.tokens?.radius,
        ...(override.tokens?.radius || {}),
      },
    },
    slots: {
      ...base.slots,
      ...(override.slots || {}),
    },
  }
}

/**
 * Resolves the currently published ThemeConfig from payload-preferences,
 * safely merged onto the bundled theme.json for the specified themeId.
 */
export async function resolveActiveThemeConfig(
  payload?: any,
  themeId?: string,
): Promise<ThemeConfig> {
  const preview = await getPreviewThemeFromCookie()
  const targetTheme = normalizeThemeId(themeId || preview || (await resolveActiveThemeId(payload)))
  const base = getActiveThemeConfig(targetTheme)
  if (!payload) return base

  try {
    // 1. Check scoped published key: theme_style_${targetTheme}_published
    const scopedKey = `theme_style_${targetTheme}_published`
    const pref = await payload
      .find({
        collection: 'payload-preferences',
        where: { key: { equals: scopedKey } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    const override = pref?.docs?.[0]?.value as Partial<ThemeConfig> | undefined
    if (override && typeof override === 'object') {
      const validation = validateThemeTokens(override.tokens)
      if (validation.valid) {
        return mergeThemeConfig(base, override)
      }
    }

    // 2. If targetTheme is corporate, check legacy un-scoped published key
    if (targetTheme === 'corporate') {
      const legacyPref = await payload
        .find({
          collection: 'payload-preferences',
          where: { key: { equals: THEME_STYLE_PUBLISHED_KEY } },
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null)

      const legacyOverride = legacyPref?.docs?.[0]?.value as Partial<ThemeConfig> | undefined
      if (legacyOverride && typeof legacyOverride === 'object') {
        const validation = validateThemeTokens(legacyOverride.tokens)
        if (validation.valid) {
          return mergeThemeConfig(base, legacyOverride)
        }
      }
    }
  } catch {
    // Fail-safe to base theme
  }

  return base
}

/**
 * Resolves the current draft ThemeConfig for the customizer.
 * Hierarchy: Draft override -> Published override -> Bundled theme default.
 */
export async function resolveDraftThemeConfig(
  payload?: any,
  themeId?: string,
): Promise<ThemeConfig> {
  const preview = await getPreviewThemeFromCookie()
  const targetTheme = normalizeThemeId(themeId || preview || (await resolveActiveThemeId(payload)))
  const base = getActiveThemeConfig(targetTheme)
  if (!payload) return base

  try {
    // 1. Check scoped draft key: theme_style_${targetTheme}_draft
    const scopedKey = `theme_style_${targetTheme}_draft`
    const draftPref = await payload
      .find({
        collection: 'payload-preferences',
        where: { key: { equals: scopedKey } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    const draftOverride = draftPref?.docs?.[0]?.value as Partial<ThemeConfig> | undefined
    if (draftOverride && typeof draftOverride === 'object') {
      const validation = validateThemeTokens(draftOverride.tokens)
      if (validation.valid) {
        return mergeThemeConfig(base, draftOverride)
      }
    }

    // 2. If targetTheme is corporate, check legacy un-scoped draft key
    if (targetTheme === 'corporate') {
      const legacyPref = await payload
        .find({
          collection: 'payload-preferences',
          where: { key: { equals: THEME_STYLE_DRAFT_KEY } },
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null)

      const legacyOverride = legacyPref?.docs?.[0]?.value as Partial<ThemeConfig> | undefined
      if (legacyOverride && typeof legacyOverride === 'object') {
        const validation = validateThemeTokens(legacyOverride.tokens)
        if (validation.valid) {
          return mergeThemeConfig(base, legacyOverride)
        }
      }
    }
  } catch {
    // fallback
  }

  // Fallback to published
  return resolveActiveThemeConfig(payload, targetTheme)
}

/**
 * Resolves saved custom user presets from storage.
 * User presets are site-wide and available across all themes.
 */
export async function resolveCustomPresets(payload?: any): Promise<CustomPresetsStore> {
  const defaultStore: CustomPresetsStore = { colors: [], typography: [] }
  if (!payload) return defaultStore

  try {
    const pref = await payload
      .find({
        collection: 'payload-preferences',
        where: { key: { equals: THEME_CUSTOM_PRESETS_KEY } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    const val = pref?.docs?.[0]?.value as CustomPresetsStore | undefined
    if (val && typeof val === 'object') {
      return {
        colors: Array.isArray(val.colors) ? val.colors : [],
        typography: Array.isArray(val.typography) ? val.typography : [],
      }
    }
  } catch {
    // safe fallback
  }

  return defaultStore
}

/**
 * Persists draft or published style overrides to payload-preferences scoped by theme ID.
 */
export async function saveThemeStyleOverride(
  payload: any,
  tokens: Partial<ThemeTokens>,
  isPublished: boolean,
  slots?: Record<string, Record<string, string>>,
  themeId?: string,
): Promise<{ success: boolean; errors?: string[] }> {
  const validation = validateThemeTokens(tokens)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const targetTheme = normalizeThemeId(themeId || (await resolveActiveThemeId(payload)))
  const scopedKey = isPublished
    ? `theme_style_${targetTheme}_published`
    : `theme_style_${targetTheme}_draft`

  const overrideData: Partial<ThemeConfig> = {
    tokens: tokens as ThemeTokens,
    ...(slots ? { slots } : {}),
  }

  try {
    const existing = await payload
      .find({
        collection: 'payload-preferences',
        where: { key: { equals: scopedKey } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    if (existing?.docs?.length) {
      await payload.update({
        collection: 'payload-preferences',
        id: existing.docs[0].id,
        data: { value: overrideData },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'payload-preferences',
        data: { key: scopedKey, value: overrideData },
        overrideAccess: true,
      })
    }

    // When publishing, also sync draft for this theme so customizer sees clean state
    if (isPublished) {
      const draftKey = `theme_style_${targetTheme}_draft`
      const draftExisting = await payload
        .find({
          collection: 'payload-preferences',
          where: { key: { equals: draftKey } },
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null)

      if (draftExisting?.docs?.length) {
        await payload.update({
          collection: 'payload-preferences',
          id: draftExisting.docs[0].id,
          data: { value: overrideData },
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'payload-preferences',
          data: { key: draftKey, value: overrideData },
          overrideAccess: true,
        })
      }
    }

    // If corporate, also sync legacy keys for backwards compatibility
    if (targetTheme === 'corporate') {
      const legacyKey = isPublished ? THEME_STYLE_PUBLISHED_KEY : THEME_STYLE_DRAFT_KEY
      const legacyExisting = await payload
        .find({
          collection: 'payload-preferences',
          where: { key: { equals: legacyKey } },
          limit: 1,
          overrideAccess: true,
        })
        .catch(() => null)

      if (legacyExisting?.docs?.length) {
        await payload.update({
          collection: 'payload-preferences',
          id: legacyExisting.docs[0].id,
          data: { value: overrideData },
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'payload-preferences',
          data: { key: legacyKey, value: overrideData },
          overrideAccess: true,
        })
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, errors: [err?.message || 'Failed to save theme styles.'] }
  }
}

/**
 * Saves or updates a custom color or typography preset.
 */
export async function saveCustomPreset(
  payload: any,
  type: 'colors' | 'typography',
  preset: ColorPreset | TypographyPreset,
): Promise<{ success: boolean; errors?: string[] }> {
  if (!preset || !preset.name?.trim()) {
    return { success: false, errors: ['Preset name is required.'] }
  }

  const currentStore = await resolveCustomPresets(payload)
  const store: CustomPresetsStore = {
    colors: [...currentStore.colors],
    typography: [...currentStore.typography],
  }

  const id = preset.id || `custom-${Date.now()}`
  const entry = { ...preset, id, isCustom: true }

  if (type === 'colors') {
    const idx = store.colors.findIndex((p) => p.id === id)
    if (idx >= 0) {
      store.colors[idx] = entry as ColorPreset
    } else {
      store.colors.push(entry as ColorPreset)
    }
  } else {
    const idx = store.typography.findIndex((p) => p.id === id)
    if (idx >= 0) {
      store.typography[idx] = entry as TypographyPreset
    } else {
      store.typography.push(entry as TypographyPreset)
    }
  }

  try {
    const existing = await payload
      .find({
        collection: 'payload-preferences',
        where: { key: { equals: THEME_CUSTOM_PRESETS_KEY } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    if (existing?.docs?.length) {
      await payload.update({
        collection: 'payload-preferences',
        id: existing.docs[0].id,
        data: { value: store },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'payload-preferences',
        data: { key: THEME_CUSTOM_PRESETS_KEY, value: store },
        overrideAccess: true,
      })
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, errors: [err?.message || 'Failed to save preset.'] }
  }
}

/**
 * Deletes a custom preset by ID.
 */
export async function deleteCustomPreset(
  payload: any,
  type: 'colors' | 'typography',
  id: string,
): Promise<{ success: boolean; errors?: string[] }> {
  const currentStore = await resolveCustomPresets(payload)
  const store: CustomPresetsStore = {
    colors: currentStore.colors.filter((p) => (type === 'colors' ? p.id !== id : true)),
    typography: currentStore.typography.filter((p) => (type === 'typography' ? p.id !== id : true)),
  }

  try {
    const existing = await payload
      .find({
        collection: 'payload-preferences',
        where: { key: { equals: THEME_CUSTOM_PRESETS_KEY } },
        limit: 1,
        overrideAccess: true,
      })
      .catch(() => null)

    if (existing?.docs?.length) {
      await payload.update({
        collection: 'payload-preferences',
        id: existing.docs[0].id,
        data: { value: store },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'payload-preferences',
        data: { key: THEME_CUSTOM_PRESETS_KEY, value: store },
        overrideAccess: true,
      })
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, errors: [err?.message || 'Failed to delete preset.'] }
  }
}

/**
 * Generates controlled CSS string from Theme tokens and style slots.
 * Safe for injection in <style> tag without arbitrary HTML or scripts.
 */
export function generateThemeCss(themeConfig?: ThemeConfig): string {
  const config = themeConfig || getActiveThemeConfig()
  const { tokens, slots } = config

  const cssVars: string[] = []

  // 1. Color variables
  if (tokens?.colors) {
    for (const [key, val] of Object.entries(tokens.colors)) {
      if (typeof val === 'string' && val.trim()) {
        const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
        cssVars.push(`--zyvavu-theme-color-${kebabKey}: ${val};`)
        if (key === 'primary') cssVars.push(`--zyvavu-theme-primary: ${val};`)
        if (key === 'background') cssVars.push(`--zyvavu-theme-background: ${val};`)
        if (key === 'surface') cssVars.push(`--zyvavu-theme-surface: ${val};`)
        if (key === 'text') cssVars.push(`--zyvavu-theme-text: ${val};`)
        if (key === 'textMuted') cssVars.push(`--zyvavu-theme-text-muted: ${val};`)
        if (key === 'border') cssVars.push(`--zyvavu-theme-border: ${val};`)
        if (key === 'accent') cssVars.push(`--zyvavu-theme-accent: ${val};`)
      }
    }

    // Header specific tokens with fallback to surface / text / border
    const headerBg = tokens.colors.headerBackground || tokens.colors.surface || '#ffffff'
    const headerText = tokens.colors.headerText || tokens.colors.text || '#17201f'
    const headerBorder = tokens.colors.headerBorder || tokens.colors.border || '#dfe5e2'
    cssVars.push(`--zyvavu-theme-header-background: ${headerBg};`)
    cssVars.push(`--zyvavu-theme-header-text: ${headerText};`)
    cssVars.push(`--zyvavu-theme-header-border: ${headerBorder};`)

    // Legacy fallback variables for public compatibility
    cssVars.push(`--zyvavu-surface: var(--zyvavu-theme-surface, #ffffff);`)
    cssVars.push(`--zyvavu-text: var(--zyvavu-theme-text, #17201f);`)
    cssVars.push(`--zyvavu-border: var(--zyvavu-theme-border, #dfe5e2);`)
    cssVars.push(`--zyvavu-background: var(--zyvavu-theme-background, #ffffff);`)
    cssVars.push(`--zyvavu-primary: var(--zyvavu-theme-primary, #0e6b66);`)
  }

  // 2. Layout & Container
  if (tokens?.layout?.containerWidth) {
    cssVars.push(`--zyvavu-theme-container: ${tokens.layout.containerWidth};`)
  }
  if (tokens?.layout?.narrowWidth) {
    cssVars.push(`--zyvavu-theme-container-narrow: ${tokens.layout.narrowWidth};`)
  }

  // 3. Spacing
  if (tokens?.spacing) {
    for (const [key, val] of Object.entries(tokens.spacing)) {
      if (typeof val === 'string' && val.trim()) {
        cssVars.push(`--zyvavu-theme-spacing-${key}: ${val};`)
      }
    }
  }

  // 4. Radius
  if (tokens?.radius) {
    for (const [key, val] of Object.entries(tokens.radius)) {
      if (typeof val === 'string' && val.trim()) {
        cssVars.push(`--zyvavu-theme-radius-${key}: ${val};`)
      }
    }
  }

  // 5. Typography variables
  if (tokens?.typography) {
    const typo = tokens.typography
    if (typo.fontFamily) {
      cssVars.push(`--zyvavu-theme-font: ${typo.fontFamily};`)
    }
    if (typo.fontFamilyHeading) {
      cssVars.push(`--zyvavu-theme-font-heading: ${typo.fontFamilyHeading};`)
    }
    if (typo.baseFontSize) {
      cssVars.push(`--zyvavu-theme-font-size-base: ${typo.baseFontSize};`)
    }
    if (typo.baseLineHeight) {
      cssVars.push(`--zyvavu-theme-line-height-base: ${typo.baseLineHeight};`)
    }

    const headingKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3'] as const
    for (const h of headingKeys) {
      const spec = typo[h]
      if (spec && typeof spec === 'object') {
        if (spec.size) cssVars.push(`--zyvavu-theme-${h}-size: ${spec.size};`)
        if (spec.lineHeight) cssVars.push(`--zyvavu-theme-${h}-line-height: ${spec.lineHeight};`)
        if (spec.weight) cssVars.push(`--zyvavu-theme-${h}-weight: ${spec.weight};`)
        if (spec.letterSpacing) cssVars.push(`--zyvavu-theme-${h}-letter-spacing: ${spec.letterSpacing};`)
      }
    }
  }

  const slotRules: string[] = []

  // Compile controlled widget slots
  if (slots) {
    for (const [widgetName, widgetSlots] of Object.entries(slots)) {
      const kebabWidget = widgetName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/^-+/, '')
      for (const [slotName, styleString] of Object.entries(widgetSlots)) {
        if (typeof styleString === 'string' && styleString.trim()) {
          const sanitizedStyle = styleString.replace(/<\/?[^>]+(>|$)/g, '')
          const kebabSlot = slotName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
          const selector =
            slotName === 'root'
              ? `.zyvavu-widget-${kebabWidget}`
              : `.zyvavu-widget-${kebabWidget}__${slotName}, .zyvavu-widget-${kebabWidget}__${kebabSlot}, .zyvavu-widget-${kebabWidget} .${slotName}, .zyvavu-widget-${kebabWidget} .${kebabSlot}`
          slotRules.push(`${selector} { ${sanitizedStyle} }`)
        }
      }
    }
  }

  return `
:root {
  ${cssVars.join('\n  ')}
}

body {
  font-family: var(--zyvavu-theme-font, system-ui, -apple-system, sans-serif);
  color: var(--zyvavu-theme-text, #17201f);
  background-color: var(--zyvavu-theme-background, #ffffff);
  font-size: var(--zyvavu-theme-font-size-base, 18px);
  line-height: var(--zyvavu-theme-line-height-base, 1.75);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--zyvavu-theme-font-heading, var(--zyvavu-theme-font, inherit));
  color: var(--zyvavu-theme-text, inherit);
}

h1 {
  font-size: var(--zyvavu-theme-h1-size, 44px);
  line-height: var(--zyvavu-theme-h1-line-height, 1.2);
  font-weight: var(--zyvavu-theme-h1-weight, 700);
  letter-spacing: var(--zyvavu-theme-h1-letter-spacing, normal);
}

h2 {
  font-size: var(--zyvavu-theme-h2-size, 32px);
  line-height: var(--zyvavu-theme-h2-line-height, 1.3);
  font-weight: var(--zyvavu-theme-h2-weight, 600);
  letter-spacing: var(--zyvavu-theme-h2-letter-spacing, normal);
}

h3 {
  font-size: var(--zyvavu-theme-h3-size, 24px);
  line-height: var(--zyvavu-theme-h3-line-height, 1.4);
  font-weight: var(--zyvavu-theme-h3-weight, 600);
  letter-spacing: var(--zyvavu-theme-h3-letter-spacing, normal);
}

h4 {
  font-size: var(--zyvavu-theme-h4-size, 20px);
  line-height: var(--zyvavu-theme-h4-line-height, 1.4);
  font-weight: var(--zyvavu-theme-h4-weight, 600);
  letter-spacing: var(--zyvavu-theme-h4-letter-spacing, normal);
}

h5 {
  font-size: var(--zyvavu-theme-h5-size, 16px);
  line-height: var(--zyvavu-theme-h5-line-height, 1.5);
  font-weight: var(--zyvavu-theme-h5-weight, 600);
  letter-spacing: var(--zyvavu-theme-h5-letter-spacing, normal);
}

h6 {
  font-size: var(--zyvavu-theme-h6-size, 14px);
  line-height: var(--zyvavu-theme-h6-line-height, 1.5);
  font-weight: var(--zyvavu-theme-h6-weight, 600);
  letter-spacing: var(--zyvavu-theme-h6-letter-spacing, normal);
}

.zyvavu-theme-container {
  max-width: var(--zyvavu-theme-container, 1200px);
  margin-left: auto;
  margin-right: auto;
  padding-left: 24px;
  padding-right: 24px;
  box-sizing: border-box;
}

.zyvavu-theme-container--narrow {
  max-width: var(--zyvavu-theme-container-narrow, 800px);
}

${slotRules.join('\n')}
`.trim()
}
