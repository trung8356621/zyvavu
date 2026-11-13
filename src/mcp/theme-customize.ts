import { CURATED_FONTS, SYSTEM_FONTS } from '@/lib/theme-engine/fonts'
import { BUILTIN_COLOR_PRESETS, BUILTIN_TYPOGRAPHY_PRESETS, themeCustomizeTokenSchema, validateThemeImportDocument } from '@/lib/theme-engine/presets'
import { generateThemeCss } from '@/lib/theme-engine/styles'
import { MAX_THEME_IMPORT_BYTES } from '@/lib/theme-engine/theme-import-limit'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import { RESPONSIVE_BREAKPOINTS } from '@/lib/style-engine/responsive-style'
import { authArgs } from './auth'
import { themes } from './catalog'
import { fields, number, options, string } from './shape'
import {
  createThemeCustomize,
  getThemeCustomize,
  listThemeCustomize,
  updateThemeCustomize,
  validateThemeCustomize,
} from './theme-customize-live'
import { bundled, define, theme, themeArgs, ToolError } from './tool-contract'

export const tokenSemantics = {
  baseline: 'Effective values come from the selected theme base and its scoped overrides.',
  overrides: 'The application merges theme overrides by token group. Authenticated live overrides use Theme Customize tools.',
  typography: 'The heading font role inherits the theme font when no heading font is configured.',
  responsive: 'Theme tokens are shared across viewports. Per-breakpoint overrides belong to Theme Builder widget styles.',
}

export const themeCustomizeSchema = {
  version: 1,
  tokens: themeCustomizeTokenSchema,
  importFile: {
    format: 'UTF-8 JSON',
    maxBytes: MAX_THEME_IMPORT_BYTES,
    required: ['tokens'],
    optional: ['themeId'],
    additionalProperties: false,
    themeId: 'Optional source reference. Ignored for destination; import always writes to the selected Theme ID.',
    merge: 'Import changes only supplied token fields. Omitted groups, fields and typography role properties are preserved.',
  },
  schemaRules: 'For a string, trim if specified, then apply maxLength, enum, and any one of patterns using the given ECMAScript flags.',
  inheritance: tokenSemantics,
  responsive: { themeTokenOverrides: false, widgetBreakpoints: RESPONSIVE_BREAKPOINTS },
  slots: 'Existing theme-level widget-slot CSS is managed manually in Theme Customizer and excluded from token import.',
  legacyAliases: { 'layout.contentAlignment': 'layout.alignment', 'layout.spacing': 'layout.pageSpacing' },
}

export function cssTokens(config: ThemeConfig) {
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
function describeTheme({ id, name, label, description, version, templates }: typeof themes[number]) {
  return { id, name, label, description, version, source: 'bundled', contexts: Object.keys(templates) }
}

const stage0Assessment = { type: 'object' as const }
const tokensObject = { type: 'object' as const }
const authFields = authArgs()

export const customizeTools = {
  zyvavu_get_theme_customize_schema: define(
    'Read the authoritative Theme Customize import schema without authentication or an installed theme.',
    fields({}),
    () => themeCustomizeSchema,
  ),
  zyvavu_validate_theme_import: define(
    'Validate a parsed theme.json document against the import contract without reading or writing a theme.',
    fields({ themeId: string, document: { type: 'object' } }, ['themeId', 'document']),
    (args) => Buffer.byteLength(JSON.stringify(args.document), 'utf8') > MAX_THEME_IMPORT_BYTES
      ? { valid: false, errors: ['theme.json must be 64 KB or smaller.'] }
      : validateThemeImportDocument(args.document, args.themeId as string),
  ),
  zyvavu_list_themes: define('List repository-bundled themes.', fields({ source: bundled }), (args) => {
    if (args.source === 'live') throw new ToolError('ACCESS_DENIED', 'Use authenticated Theme Customize tools for live data.')
    return { themes: themes.map(describeTheme) }
  }),
  zyvavu_get_theme: define('Read bundled theme identity and supported template contexts.', fields(themeArgs, ['themeId']), (args) => describeTheme(theme(args))),
  zyvavu_get_theme_tokens: define('Read bundled theme color, typography and layout token definitions.', fields(themeArgs, ['themeId']), (args) => {
    const { id, themeConfig } = theme(args)
    return {
      themeId: id, source: 'bundled', tokens: themeConfig.tokens,
      schemaResource: 'zyvavu://catalog/theme-customize-schema',
      cssTokens: cssTokens(themeConfig),
      presets: { colors: BUILTIN_COLOR_PRESETS, typography: BUILTIN_TYPOGRAPHY_PRESETS },
      fonts: { curated: CURATED_FONTS, system: SYSTEM_FONTS },
      breakpoints: RESPONSIVE_BREAKPOINTS,
      inheritance: tokenSemantics,
    }
  }),

  zyvavu_theme_customize_list: define(
    'Authenticated list of installed Theme Customize targets and create availability.',
    fields({ ...authFields }, ['auth']),
    (args) => listThemeCustomize(args),
  ),
  zyvavu_theme_customize_get: define(
    'Authenticated read of Theme Customize tokens/revision for an explicit Theme ID.',
    fields({
      ...authFields,
      themeId: string,
      channel: options('draft', 'published'),
    }, ['auth', 'themeId']),
    (args) => getThemeCustomize(args),
  ),
  zyvavu_theme_customize_validate: define(
    'Validate proposed Theme Customize tokens without saving.',
    fields({
      ...authFields,
      tokens: tokensObject,
    }, ['auth', 'tokens']),
    (args) => validateThemeCustomize(args),
  ),
  zyvavu_theme_customize_update: define(
    'Update Theme Customize draft/published tokens for an explicit installed Theme ID after Stage 0 readiness. Default: disposable memory store. Live Payload writes require trusted auth + enabled live bridge + isolated QA theme.',
    fields({
      ...authFields,
      stage0Assessment,
      themeId: string,
      tokens: tokensObject,
      channel: options('draft', 'published'),
      expectedRevision: number,
      idempotencyKey: string,
      slots: { type: 'object' as const },
    }, ['auth', 'stage0Assessment', 'themeId', 'tokens']),
    (args) => updateThemeCustomize(args),
  ),
  zyvavu_theme_customize_create: define(
    'Create an inactive theme via createCustomTheme when trusted auth + live bridge are enabled. Theme ID = slugify(name). Preserves websiteType. Default without live bridge: CREATE_UNAVAILABLE.',
    fields({
      ...authFields,
      stage0Assessment,
      name: string,
      tokens: tokensObject,
      websiteType: options('editorial', 'corporate', 'commerce'),
      description: string,
    }, ['auth', 'stage0Assessment', 'name']),
    (args) => createThemeCustomize(args),
  ),
}
