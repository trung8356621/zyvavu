import type { TemplateContext } from './types'
import { buildLoopItemEditorUrl } from './loop-item-document'
import {
  VERSIONABLE_TEMPLATE_CONTEXTS,
  type VersionableTemplateContext,
} from './template-versions-types'

export const THEME_BUILDER_TEMPLATE_OPTIONS: { label: string; value: TemplateContext; badge?: string }[] = [
  { label: 'Header', value: 'header' },
  { label: 'Home', value: 'home' },
  { label: 'Single Post', value: 'single' },
  { label: 'Page', value: 'page' },
  { label: 'Category', value: 'category' },
  { label: 'Footer', value: 'footer' },
  { label: 'Loop Item', value: 'loopItem' },
  { label: 'Product (Contract)', value: 'product', badge: 'Pending' },
]

export const VERSIONABLE_BUILDER_TEMPLATE_OPTIONS = THEME_BUILDER_TEMPLATE_OPTIONS.filter(
  ({ value, badge }) => !badge && VERSIONABLE_TEMPLATE_CONTEXTS.includes(value as VersionableTemplateContext),
)

export const DEFAULT_BUILDER_MODE = 'single' as const
export const DEFAULT_BUILDER_TEMPLATE = 'home' as const

/** Query value that opens Builder on "Tạo phiên bản mới" (Nhập JSON ready). */
export const BUILDER_ACTION_IMPORT_VERSION = 'import-version'

export type BuilderScope =
  | { mode: 'full'; themeId: string }
  | { mode: 'single'; themeId: string; template: TemplateContext; loopItemId?: string }

export type ThemeBuilderHrefOptions = {
  template?: TemplateContext
  loopItemId?: string
  templateVersion?: string
  /** Open create-version modal so the user can pick Nhập JSON immediately. */
  openVersionImport?: boolean
}

function isHrefOptions(value: unknown): value is ThemeBuilderHrefOptions {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function themeBuilderHref(
  themeId: string,
  templateOrOptions?: TemplateContext | ThemeBuilderHrefOptions,
  loopItemId?: string,
): string {
  const options: ThemeBuilderHrefOptions = isHrefOptions(templateOrOptions)
    ? templateOrOptions
    : {
        ...(templateOrOptions ? { template: templateOrOptions } : {}),
        ...(loopItemId ? { loopItemId } : {}),
      }
  const template = options.template
  if (template === 'loopItem' && options.loopItemId) {
    return buildLoopItemEditorUrl(themeId, options.loopItemId)
  }
  const query = new URLSearchParams({ theme: themeId })
  if (template) query.set('template', template)
  if (options.loopItemId) query.set('loopItem', options.loopItemId)
  if (options.templateVersion) query.set('templateVersion', options.templateVersion)
  if (options.openVersionImport) query.set('action', BUILDER_ACTION_IMPORT_VERSION)
  return `/admin/theme-builder?${query}`
}
