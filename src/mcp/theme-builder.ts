import { getStyleModalDomains } from '@/lib/style-engine/domains'
import { resolveEffectiveTypography } from '@/lib/style-engine/effective-typography'
import type { TemplateContext } from '@/lib/theme-engine/types'
import { getDomains, manifests, responsive, widgetContract } from './catalog'
import { fields, options, string } from './shape'
import { styleShapes, unsupportedStyles } from './style'
import { bundled, contextArgs, define, theme, themeArgs, ToolError } from './tool-contract'
export function widget(type: unknown) {
  const contract = typeof type === 'string' ? widgetContract(type) : undefined
  if (!contract) throw new ToolError('NOT_FOUND', 'Widget is absent from the application registry.')
  const settings = Object.fromEntries(
    [...contract.required, ...contract.optional].map((key) => {
      const value = contract.defaults[key]
      const choices = contract.enums[key]
      const type = key === 'id' ? 'string'
        : key === 'style' || key === 'lock' ? 'object'
        : contract.slots.includes(key) || Array.isArray(value) ? 'array'
        : key === 'mediaId' || key === 'posterMediaId' ? ['string', 'number']
        : choices ? typeof choices[0]
        : typeof value
      return [key, { type, required: contract.required.includes(key) }]
    }),
  )
  return { ...contract, settings }
}
export const getStyleSchema = () => ({
  overrideSchema: fields(styleShapes), responsive,
  unsupported: unsupportedStyles,
  effectiveDefaults: { status: 'PARTIAL', verified: ['typography'], remaining: 'UNRESOLVED' },
})


export const builderWidgets = () => Object.keys(manifests).map(widget)

export const builderTools = {
  zyvavu_list_templates: define('List bundled templates for one theme.', fields(themeArgs, ['themeId']), (args) => {
    const { id, templates } = theme(args)
    return { themeId: id, source: 'bundled', templates: Object.entries(templates).map(([context, document]) => ({ context, version: document.version })) }
  }),
  zyvavu_get_template: define('Read the bundled Puck document for one theme and context.', fields(contextArgs, ['themeId', 'context']), (args) => {
    const selected = theme(args)
    const context = args.context as TemplateContext
    if (!Object.hasOwn(selected.templates, context))
      throw new ToolError('NOT_FOUND', 'Bundled template does not exist for this context.')
    return {
      themeId: args.themeId,
      source: 'bundled',
      document: selected.templates[context as keyof typeof selected.templates],
    }
  }),
  zyvavu_get_widget_schema: define('Read one widget’s props, contexts, nesting, links, media and style capabilities.', fields({ type: string }, ['type']), (args) => widget(args.type)),
  zyvavu_get_style_schema: define('Read Phase 1 style override shapes and optionally resolve existing effective typography for a widget.', fields({
    type: string, variant: string, themeId: string, source: bundled, htmlTag: options('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'),
  }), (args) => {
    const selectedTheme = args.source === 'live' || args.themeId !== undefined ? theme(args) : undefined
    if (!args.type) {
      if (args.themeId || args.htmlTag || args.variant) throw new ToolError('INVALID_ARGUMENTS', 'Provide a widget type for widget-specific style discovery.')
      return getStyleSchema()
    }
    const contract = widget(args.type)
    const style = getStyleSchema()
    const themeConfig = selectedTheme?.themeConfig
    const variant = typeof args.variant === 'string' ? args.variant : undefined
    const styleDomains = getDomains(contract.type, variant)
    const effectiveTypography = themeConfig && styleDomains.includes('typography')
      ? resolveEffectiveTypography({ themeConfig, widgetType: contract.type, htmlTag: (args.htmlTag ?? contract.defaults.tag) as string | undefined })
      : undefined
    return {
      ...style,
      styleDomains,
      styleControls: getStyleModalDomains(contract.type, variant),
      ...(effectiveTypography ? { effectiveTypography } : {}),
    }
  }),
}
