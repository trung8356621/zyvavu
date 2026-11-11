export type { IconCatalog, IconCatalogEntry, IconRef, IconRenderProps, IconSource } from './types'
export {
  getBuiltInCatalog,
  getBuiltInCategories,
  getIconCatalogVersion,
  getLucideCatalog,
  searchBuiltInIcons,
} from './catalog'
export { CUSTOM_ICON_CATALOG, CUSTOM_ICON_SVGS, getCustomIconSvg, isCustomIconName } from './custom-icons'
export {
  applySvgCurrentColor,
  isSvgMimeType,
  looksLikeSvgMarkup,
  sanitizeSvgMarkup,
} from './sanitize-svg'
export { IconRenderer } from './IconRenderer'
export { IconRendererStatic } from './IconRendererStatic'
