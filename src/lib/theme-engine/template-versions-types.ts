import type { TemplateContext } from './types'

export type TemplateVersionMeta = {
  id: string
  name: string
  updatedAt?: string
}

export type TemplateVersionIndex = {
  /** Version currently used for this theme + template context on the frontend. */
  primaryId: string
  items: TemplateVersionMeta[]
}

/** Stable first-version id for legacy override / bundled templates. */
export const LEGACY_TEMPLATE_VERSION_ID = 'v1'

/** Contexts that share the Template Versions model in Theme Builder. */
export const VERSIONABLE_TEMPLATE_CONTEXTS = [
  'home',
  'single',
  'page',
  'category',
  'header',
  'footer',
] as const satisfies readonly TemplateContext[]

export type VersionableTemplateContext = (typeof VERSIONABLE_TEMPLATE_CONTEXTS)[number]

export function isVersionableTemplateContext(value: string): value is VersionableTemplateContext {
  return (VERSIONABLE_TEMPLATE_CONTEXTS as readonly string[]).includes(value)
}

export function templateVersionIndexKey(themeId: string, context: VersionableTemplateContext) {
  // Preserve the Home index key already written by the previous Home Versions rollout.
  if (context === 'home') return `theme_home_versions_${themeId}`
  return `theme_template_versions_${themeId}_${context}`
}

export function templateVersionDocKey(
  themeId: string,
  context: VersionableTemplateContext,
  versionId: string,
) {
  return `theme_template_${themeId}_${context}_${versionId}`
}

export function legacyTemplateDocKey(themeId: string, context: VersionableTemplateContext) {
  return `theme_template_${themeId}_${context}`
}

export function templateVersionLabel(context: VersionableTemplateContext): string {
  const labels: Record<VersionableTemplateContext, string> = {
    home: 'Home',
    single: 'Single Post',
    page: 'Page',
    category: 'Category',
    header: 'Header',
    footer: 'Footer',
  }
  return labels[context]
}

export function setActiveVersionLabel(context: VersionableTemplateContext): string {
  return context === 'home' ? 'Dùng làm trang chủ' : 'Đặt làm bản đang dùng'
}
