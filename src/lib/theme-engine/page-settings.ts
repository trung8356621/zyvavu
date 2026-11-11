import type { CSSProperties } from 'react'
import type { PageSettings, PageSettingsLayout, TemplateContext, ThemeTokens } from './types'
import { calculateContrastRatio, resolveContrastForegroundToken } from './presets'
export type { PageLayoutContextType } from './page-layout-context'

export function normalizePageBackgroundImageURL(value?: string): string | undefined {
  const url = value?.trim()
  if (!url || /[\s"'\\]/.test(url)) return undefined
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url
  } catch {
    return undefined
  }
}

export function resolvePageForeground(settings?: PageSettings, tokens?: ThemeTokens) {
  const bg = settings?.background
  const backgroundToken = bg?.type === 'palette' && bg.token ? bg.token : 'background'
  const explicitText = settings?.text?.colorToken
  const colors: Record<string, string | undefined> = tokens?.colors || {}
  const background = colors[backgroundToken] || (backgroundToken === 'background' ? '#ffffff' : undefined)
  const themeText = colors.text || '#17201f'
  const automaticToken = background
    ? resolveContrastForegroundToken(background, themeText, colors.background || '#ffffff')
    : undefined
  const color = explicitText || backgroundToken === 'background'
    ? resolveColorToken(explicitText || 'text', '#17201f')
    : `var(--zyvavu-theme-foreground-on-${tokenToKebab(backgroundToken)}, var(--zyvavu-theme-text, #17201f))`
  const foreground = explicitText ? colors[explicitText] || (explicitText === 'text' ? themeText : undefined)
    : colors[automaticToken || 'text'] || (automaticToken === 'background' ? '#ffffff' : themeText)
  const hasImage = bg?.type === 'image' && normalizePageBackgroundImageURL(bg.imageUrl)
  return {
    color,
    warning: !hasImage && foreground && background
      ? calculateContrastRatio(foreground, background).warning
      : undefined,
  }
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  background: {
    type: 'theme',
  },
  text: {
    typography: 'p1',
    colorToken: 'text',
  },
  layout: {
    containerWidth: 'inherit',
    spacing: 'inherit',
    alignment: 'inherit',
  },
}

/**
 * Normalization helper: distinguishes between legacy system-generated boilerplate defaults
 * and genuine user customizations.
 *
 * System defaults were automatically written as:
 *   { containerWidth: 'containerWidth', spacing: 'md', alignment: 'left' }
 * without an explicit isOverride flag.
 */
export function isLegacySystemDefaultLayout(layout?: PageSettingsLayout): boolean {
  if (!layout) return true
  if (layout.isOverride) return false
  if (layout.inheritTheme !== undefined) return layout.inheritTheme

  const isDefaultWidth = !layout.containerWidth || layout.containerWidth === 'inherit' || layout.containerWidth === 'containerWidth'
  const isDefaultSpacing = !layout.spacing || layout.spacing === 'inherit' || layout.spacing === 'md'
  const isDefaultAlign = !layout.alignment || layout.alignment === 'inherit' || layout.alignment === 'left'

  return isDefaultWidth && isDefaultSpacing && isDefaultAlign
}

/**
 * Resolves effective layout values through the inheritance hierarchy:
 * Theme Configuration -> Page Settings (when overridden)
 */
export function resolveEffectivePageLayout(
  pageSettings?: PageSettings,
  themeTokens?: ThemeTokens,
): {
  containerWidth: string
  alignment: 'left' | 'center' | 'right'
  spacing: string
  isOverridden: {
    containerWidth: boolean
    alignment: boolean
    spacing: boolean
  }
} {
  const layout = pageSettings?.layout
  const isLegacy = isLegacySystemDefaultLayout(layout)

  const hasContainerOverride =
    !isLegacy &&
    Boolean(layout?.containerWidth && layout.containerWidth !== 'inherit')

  const hasAlignOverride =
    !isLegacy &&
    Boolean(layout?.alignment && layout.alignment !== 'inherit')

  const hasSpacingOverride =
    !isLegacy &&
    Boolean(layout?.spacing && layout.spacing !== 'inherit')

  const themeAlign = (themeTokens?.layout?.alignment || themeTokens?.layout?.contentAlignment || 'left') as 'left' | 'center' | 'right'
  const themeSpacing = themeTokens?.layout?.pageSpacing || themeTokens?.layout?.spacing || 'md'

  return {
    containerWidth: hasContainerOverride ? (layout!.containerWidth as string) : 'containerWidth',
    alignment: hasAlignOverride ? (layout!.alignment as 'left' | 'center' | 'right') : themeAlign,
    spacing: hasSpacingOverride ? (layout!.spacing as string) : themeSpacing,
    isOverridden: {
      containerWidth: hasContainerOverride,
      alignment: hasAlignOverride,
      spacing: hasSpacingOverride,
    },
  }
}

/**
 * Converts camelCase or kebab token to kebab-case CSS variable name.
 */
export function tokenToKebab(token: string): string {
  return token
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-+/, '')
}

/**
 * Resolves a semantic color token ID into a reliable CSS variable reference with fallback.
 */
export function resolveColorToken(token?: string, fallback?: string): string | undefined {
  if (!token || typeof token !== 'string') return fallback
  const clean = token.trim()
  if (!clean) return fallback

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(clean)) return clean
  if (clean === 'white' || clean === 'black') return `var(--zyvavu-theme-color-${clean}, ${clean})`

  const kebab = tokenToKebab(clean)

  if (clean === 'transparent' || clean === 'none') {
    return 'transparent'
  }
  if (clean === 'primary') {
    return 'var(--zyvavu-theme-primary, var(--zyvavu-theme-color-primary, #0e6b66))'
  }
  if (clean === 'background') {
    return 'var(--zyvavu-theme-background, var(--zyvavu-theme-color-background, #ffffff))'
  }
  if (clean === 'surface') {
    return 'var(--zyvavu-theme-surface, var(--zyvavu-theme-color-surface, #ffffff))'
  }
  if (clean === 'text') {
    return 'var(--zyvavu-theme-text, var(--zyvavu-theme-color-text, #17201f))'
  }
  if (clean === 'textMuted') {
    return 'var(--zyvavu-theme-text-muted, var(--zyvavu-theme-color-text-muted, #5f7370))'
  }
  if (clean === 'border') {
    return 'var(--zyvavu-theme-border, var(--zyvavu-theme-color-border, #dfe5e2))'
  }
  if (clean === 'accent') {
    return 'var(--zyvavu-theme-accent, var(--zyvavu-theme-color-accent, #2ec4b6))'
  }

  return `var(--zyvavu-theme-color-${kebab}, var(--zyvavu-theme-${clean}, ${fallback || 'inherit'}))`
}

/**
 * Resolves semantic layout container width token into CSS value.
 * Dynamically incorporates theme tokens when provided instead of static fallbacks.
 */
export function resolveContainerWidth(token?: string, themeTokens?: ThemeTokens): string {
  if (token === 'narrowWidth') {
    const fallback = themeTokens?.layout?.narrowWidth || '800px'
    return `var(--zyvavu-theme-container-narrow, ${fallback})`
  }
  if (token === 'wideWidth') {
    const fallback = themeTokens?.layout?.wideWidth || '1400px'
    return `var(--zyvavu-theme-container-wide, ${fallback})`
  }
  if (token === 'full') return '100%'

  if (token && token !== 'containerWidth' && token !== 'inherit' && (token.includes('px') || token.includes('%') || token.includes('rem'))) {
    return token
  }

  const fallback = themeTokens?.layout?.containerWidth || '1200px'
  return `var(--zyvavu-theme-container, ${fallback})`
}

/**
 * Resolves semantic spacing token to CSS variable.
 */
export function resolveSpacingToken(token?: string): string | undefined {
  if (!token || token === 'none') return '0px'
  return `var(--zyvavu-theme-spacing-${token}, 16px)`
}

/**
 * Resolves semantic radius token to CSS variable.
 */
export function resolveRadiusToken(token?: string): string | undefined {
  if (!token || token === 'none') return '0px'
  return `var(--zyvavu-theme-radius-${token}, 8px)`
}

/**
 * Safely scopes and sanitizes custom CSS so rules apply strictly within the target scope,
 * preventing injection or leaking into administrative UI.
 */
export function sanitizeScopedCss(rawCss?: string, scopeSelector: string = '.zyvavu-theme-root'): string {
  if (!rawCss || typeof rawCss !== 'string') return ''

  // Strip script tags, closing style tags, or javascript: protocols
  const cleaned = rawCss
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/style>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim()

  if (!cleaned) return ''

  // Split into rule blocks
  const rules = cleaned.split('}')
  const scopedRules: string[] = []

  for (const block of rules) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const parts = trimmed.split('{')
    if (parts.length !== 2) {
      continue
    }

    const selectors = parts[0].trim()
    const declarations = parts[1].trim()

    // Handle @media, @keyframes, @supports
    if (selectors.startsWith('@media') || selectors.startsWith('@supports')) {
      scopedRules.push(`${selectors} { ${scopeSelector} { ${declarations} } }`)
      continue
    }

    if (selectors.startsWith('@keyframes') || selectors.startsWith('@font-face')) {
      // Keyframes / font-face definitions can remain top-level
      scopedRules.push(`${selectors} { ${declarations} }`)
      continue
    }

    // Prefix comma-separated selectors with scope
    const scopedSelectorList = selectors
      .split(',')
      .map((sel) => {
        const s = sel.trim()
        if (s === ':root' || s === 'body' || s === 'html') {
          return scopeSelector
        }
        if (s.startsWith('&')) {
          return `${scopeSelector}${s.slice(1)}`
        }
        return `${scopeSelector} ${s}`
      })
      .join(', ')

    scopedRules.push(`${scopedSelectorList} { ${declarations} }`)
  }

  return scopedRules.join('\n')
}

export type ResolvedPageStyles = {
  style: CSSProperties
  className: string
  scopedCss: string
}

/**
 * Resolves full CSSProperties and classes from PageSettings.
 */
export function resolvePageSettingsStyles(
  pageSettings?: PageSettings,
  themeTokens?: ThemeTokens,
  template?: TemplateContext,
  hasSections: boolean = false,
): ResolvedPageStyles {
  const settings: PageSettings = {
    ...DEFAULT_PAGE_SETTINGS,
    ...(pageSettings || {}),
  }

  const effectiveLayout = resolveEffectivePageLayout(pageSettings, themeTokens)

  const style: CSSProperties = {}
  const classNames: string[] = ['zyvavu-theme-root']

  // 1. Background
  const bg = settings.background
  const imageURL = bg?.type === 'image' ? normalizePageBackgroundImageURL(bg.imageUrl) : undefined
  if (bg) {
    if (bg.type === 'palette' && bg.token) {
      style.backgroundColor = resolveColorToken(bg.token, '#ffffff')
    } else if (imageURL) {
      style.backgroundColor = resolveColorToken('background', '#ffffff')
      style.backgroundImage = `url("${imageURL}")`
      style.backgroundPosition = bg.imagePosition || 'center'
      style.backgroundSize = bg.imageSize || 'cover'
      style.backgroundRepeat = bg.imageRepeat || 'no-repeat'
    } else {
      // Inherit theme default
      style.backgroundColor = 'var(--zyvavu-theme-background, #ffffff)'
    }
  }

  // 2. Default Text
  const foreground = resolvePageForeground(pageSettings, themeTokens)
  style.color = foreground.color
  Object.assign(style, { '--zyvavu-inherited-foreground': foreground.color })
  const typography = settings.text?.typography || DEFAULT_PAGE_SETTINGS.text?.typography
  if (typography && /^[a-z][a-z0-9-]*$/i.test(typography)) {
    classNames.push(`zyvavu-preset-${typography}`)
    const prefix = `--zyvavu-theme-${tokenToKebab(typography)}`
    style.fontSize = `var(${prefix}-size, inherit)`
    style.fontWeight = `var(${prefix}-weight, inherit)`
    style.lineHeight = `var(${prefix}-line-height, inherit)`
    style.letterSpacing = `var(${prefix}-letter-spacing, inherit)`
  }

  // 3. Layout & Spacing
  style.textAlign = effectiveLayout.isOverridden.alignment
    ? effectiveLayout.alignment
    : ('var(--zyvavu-theme-alignment, left)' as CSSProperties['textAlign'])

  // Only apply maxWidth to root container if NOT in sectioned mode or if explicitly requested,
  // preventing artificial max-width constraints on full-width sections.
  if (effectiveLayout.isOverridden.containerWidth && !hasSections) {
    style.maxWidth = resolveContainerWidth(effectiveLayout.containerWidth, themeTokens)
    style.width = '100%'
    style.marginLeft = 'auto'
    style.marginRight = 'auto'
    style.boxSizing = 'border-box'
  } else if (!hasSections && settings.layout?.containerWidth && settings.layout.containerWidth !== 'inherit') {
    style.maxWidth = resolveContainerWidth(settings.layout.containerWidth, themeTokens)
    style.width = '100%'
    style.marginLeft = 'auto'
    style.marginRight = 'auto'
    style.boxSizing = 'border-box'
  }

  if (effectiveLayout.isOverridden.spacing) {
    style.paddingLeft = resolveSpacingToken(effectiveLayout.spacing)
    style.paddingRight = resolveSpacingToken(effectiveLayout.spacing)
  }

  // 4. Custom CSS
  const scopedCss = sanitizeScopedCss(settings.customCSS, '.zyvavu-theme-root')

  return {
    style,
    className: classNames.join(' '),
    scopedCss,
  }
}
