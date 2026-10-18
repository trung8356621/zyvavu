import type { Config, Data, SlotField } from '@puckeditor/core'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { validateThemeTemplateDocument } from './validation'
import type { TemplateContext, ThemeTemplateDocument } from './types'
import { isPageContentContext } from './normalization'

export interface WidgetDesignPattern {
  id: string
  version: number
  compatibility: { builderVersion: 1; widgetTypes: string[]; capabilities?: string[] }
  widgetType: string
  name: string
  category: 'sections' | 'text' | 'layout' | 'buttons'
  preview: { kind: 'section' | 'text' | 'columns' | 'button'; label: string }
  props: { style?: UniversalStyle; distribution?: string; variant?: string }
  tokenReferences: string[]
  slots?: Record<
    string,
    { type: string; props?: Record<string, unknown>; slots?: WidgetDesignPattern['slots'] }[]
  >
}
export const WIDGET_DESIGN_PATTERNS: readonly WidgetDesignPattern[] = [
  {
    id: 'section-airy',
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: ['Section'] },
    widgetType: 'Section',
    name: 'Airy section',
    category: 'sections',
    preview: { kind: 'section', label: 'Space for your content' },
    props: {
      style: {
        background: { mode: 'color', colorToken: 'surface' },
        spacing: { padding: { token: 'lg' } },
      },
    },
    tokenReferences: ['surface', 'lg'],
  },
  {
    id: 'section-grid',
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: ['Section'] },
    widgetType: 'Section',
    name: 'Patterned section',
    category: 'sections',
    preview: { kind: 'section', label: 'A patterned backdrop' },
    props: {
      style: {
        background: {
          mode: 'color',
          colorToken: 'surface',
          pattern: { preset: 'grid', colorToken: 'primary', opacity: 0.15, scale: 'md' },
        },
        border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
      },
    },
    tokenReferences: ['surface', 'primary', 'border'],
  },
  {
    id: 'text-editorial',
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: ['TextBlock'] },
    widgetType: 'TextBlock',
    name: 'Editorial text',
    category: 'text',
    preview: { kind: 'text', label: 'A clear editorial heading' },
    props: {
      style: {
        typography: { typography: 'h2', colorToken: 'text' },
        spacing: { padding: { token: 'sm' } },
      },
    },
    tokenReferences: ['h2', 'text', 'sm'],
  },
  {
    id: 'text-card',
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: ['TextBlock'] },
    widgetType: 'TextBlock',
    name: 'Raised content card',
    category: 'text',
    preview: { kind: 'text', label: 'A focused content card' },
    props: {
      style: {
        typography: { typography: 'h3', colorToken: 'primary' },
        background: { mode: 'color', colorToken: 'surface' },
        radius: { radiusToken: 'md' },
        shadow: { shadowToken: 'shadowSoft' },
        spacing: { padding: { token: 'md' } },
      },
    },
    tokenReferences: ['h3', 'primary', 'surface', 'md', 'shadowSoft'],
  },
  {
    id: 'columns-equal',
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: ['Columns'] },
    widgetType: 'Columns',
    name: 'Balanced columns',
    category: 'layout',
    preview: { kind: 'columns', label: 'Two equal columns' },
    props: { distribution: 'equal-2', style: { spacing: { gapToken: 'md' } } },
    tokenReferences: ['md'],
  },
  {
    id: 'columns-feature',
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: ['Columns'] },
    widgetType: 'Columns',
    name: 'Feature and aside',
    category: 'layout',
    preview: { kind: 'columns', label: 'Feature with an aside' },
    props: { distribution: '2:1', style: { spacing: { gapToken: 'lg' } } },
    tokenReferences: ['lg'],
  },
]

const patternRegistry = new Map(WIDGET_DESIGN_PATTERNS.map((pattern) => [pattern.id, pattern]))
/** Extension point for theme/user catalogs; no token ownership or persisted theme mutation. */
export function registerWidgetDesignPattern(pattern: WidgetDesignPattern) {
  if (!/^[a-z][a-z0-9-]*$/.test(pattern.id) || patternRegistry.has(pattern.id))
    throw new Error('Pattern ID must be stable and unique')
  if (
    pattern.version < 1 ||
    pattern.compatibility.builderVersion !== 1 ||
    !pattern.compatibility.widgetTypes.includes(pattern.widgetType)
  )
    throw new Error('Unsupported pattern version or compatibility')
  if (Object.keys(pattern.props).some((key) => !['style', 'distribution', 'variant'].includes(key)))
    throw new Error('Pattern props must be presentation-only')
  const validation = validateUniversalStyle(pattern.props.style)
  if (!validation.valid) throw new Error(validation.errors.join('; '))
  patternRegistry.set(pattern.id, structuredClone(pattern))
}
export function getWidgetDesignPatterns(): readonly WidgetDesignPattern[] {
  return [...patternRegistry.values()]
}

export function walkPatternDocument(data: Data, config: Config, visit: (item: any) => void) {
  const walk = (items: any[], parentType?: string, slot?: string) => {
    for (const item of items) {
      if (!item?.props?.id || !config.components[item.type])
        throw new Error('Invalid or unavailable pattern widget')
      if (parentType) {
        const field = config.components[parentType]?.fields?.[slot!] as SlotField | undefined
        if (!field || field.type !== 'slot') throw new Error('Invalid nested slot')
        if (
          (field.allow && !field.allow.includes(item.type)) ||
          field.disallow?.includes(item.type) ||
          item.type === 'Section'
        )
          throw new Error('Widget is not allowed in this slot')
      }
      visit(item)
      for (const [name, field] of Object.entries(config.components[item.type]?.fields || {})) {
        if (field.type === 'slot' && item.props[name] !== undefined) {
          if (!Array.isArray(item.props[name])) throw new Error('Slot must contain a widget array')
          walk(item.props[name], item.type, name)
        }
      }
    }
  }
  walk(data.content || [])
  for (const [zone, items] of Object.entries(data.zones || {})) {
    const separator = zone.lastIndexOf(':')
    const ownerId = zone.slice(0, separator)
    let owner: any
    const find = (list: any[]) => {
      for (const item of list) {
        if (item.props?.id === ownerId) owner = item
        for (const [key, field] of Object.entries(config.components[item.type]?.fields || {}))
          if (field.type === 'slot' && Array.isArray(item.props?.[key])) find(item.props[key])
      }
    }
    find(data.content || [])
    for (const list of Object.values(data.zones || {})) find(list)
    if (!owner) throw new Error('Slot owner is unavailable')
    walk(items, owner.type, zone.slice(separator + 1))
  }
}

function expandedDocument(
  data: Data,
  context: TemplateContext,
  config: Config,
): ThemeTemplateDocument {
  const nodes: any[] = []
  walkPatternDocument(data, config, (node) => nodes.push(node))
  const rootIds = new Set(data.content.map((node) => node.props.id))
  return {
    version: 1,
    template: context,
    root: data.root,
    content: data.content,
    zones: { 'pattern-validation:content': nodes.filter((node) => !rootIds.has(node.props.id)) },
  } as ThemeTemplateDocument
}

export function validatePatternOperation(
  next: Data,
  previous: Data,
  context: TemplateContext,
  config: Config,
) {
  const ids = new Set<string>()
  walkPatternDocument(next, config, (node) => {
    if (ids.has(node.props.id)) throw new Error('Duplicate widget ID')
    ids.add(node.props.id)
    const result = validateUniversalStyle(node.props.style)
    if (!result.valid) throw new Error(result.errors.join('; '))
  })
  const result = validateThemeTemplateDocument(
    expandedDocument(next, context, config),
    context,
    expandedDocument(previous, context, config),
  )
  if (!result.valid) throw new Error(result.errors.join('; '))
}

export function instantiatePattern(
  pattern: WidgetDesignPattern,
  config: Config,
  newId: () => string,
): any {
  const create = (
    type: string,
    props: Record<string, unknown> = {},
    slots?: WidgetDesignPattern['slots'],
  ): any => {
    if (!config.components[type]) throw new Error('Pattern is unavailable in this template')
    const result = {
      type,
      props: {
        ...structuredClone(config.components[type].defaultProps || {}),
        ...structuredClone(props),
        id: newId(),
      } as Record<string, any>,
    }
    for (const [slot, children] of Object.entries(slots || {})) {
      const field = config.components[type].fields?.[slot]
      if (field?.type !== 'slot') throw new Error('Pattern contains an unsupported slot')
      result.props[slot] = children.map((child) => create(child.type, child.props, child.slots))
    }
    return result
  }
  return create(pattern.widgetType, pattern.props, pattern.slots)
}

export function applyWidgetPattern(
  data: Data,
  pattern: WidgetDesignPattern,
  selectedId: string,
  config: Config,
): Data {
  let found = false
  const update = (items: any[]): any[] =>
    items.map((item) => {
      const props = { ...item.props }
      for (const [key, field] of Object.entries(config.components[item.type]?.fields || {}))
        if (field.type === 'slot' && Array.isArray(props[key])) props[key] = update(props[key])
      if (props.id === selectedId) {
        if (
          props.lock?.canEditProps === false ||
          !pattern.compatibility.widgetTypes.includes(item.type)
        )
          throw new Error('Pattern is incompatible or widget is locked')
        if (pattern.slots)
          throw new Error('Nested patterns can be inserted only; existing content is preserved')
        found = true
        // Whitelisted presentation fields only; semantic content, bindings, locks and IDs survive.
        props.style = { ...props.style, ...structuredClone(pattern.props.style || {}) }
        if (pattern.props.variant !== undefined) props.variant = pattern.props.variant
        if (pattern.props.distribution !== undefined) {
          if (Object.keys(props).some((key) => /^column[34]$/.test(key) && props[key]?.length))
            throw new Error('This pattern would hide occupied columns')
          props.distribution = pattern.props.distribution
        }
      }
      return { ...item, props }
    })
  const next = {
    ...data,
    content: update(data.content),
    zones: Object.fromEntries(
      Object.entries(data.zones || {}).map(([zone, items]) => [zone, update(items)]),
    ),
  }
  if (!found) throw new Error('Select a compatible widget first')
  return next
}

/** Uses one public Puck setData operation; slot props and legacy zones are both preserved. */
export function insertWidgetPattern(
  data: Data,
  item: any,
  context: TemplateContext,
  config: Config,
  destination?: { ownerId: string; slot: string },
  newId: () => string = () => crypto.randomUUID(),
): Data {
  if (destination) {
    let inserted = false
    const update = (items: any[]): any[] =>
      items.map((node) => {
        const props = { ...node.props }
        for (const [key, field] of Object.entries(config.components[node.type]?.fields || {}))
          if (field.type === 'slot' && Array.isArray(props[key])) props[key] = update(props[key])
        if (props.id === destination.ownerId) {
          if (props.lock?.canEditProps === false)
            throw new Error('The destination container is locked')
          const field = config.components[node.type]?.fields?.[destination.slot] as
            SlotField | undefined
          if (
            field?.type !== 'slot' ||
            item.type === 'Section' ||
            (field.allow && !field.allow.includes(item.type)) ||
            field.disallow?.includes(item.type)
          )
            throw new Error('This widget cannot be inserted in the selected slot')
          inserted = true
          const zone = `${props.id}:${destination.slot}`
          if (data.zones?.[zone]) return { ...node, props }
          props[destination.slot] = [...(props[destination.slot] || []), item]
        }
        return { ...node, props }
      })
    const next = {
      ...data,
      content: update(data.content),
      zones: Object.fromEntries(
        Object.entries(data.zones || {}).map(([zone, nodes]) => [zone, update(nodes)]),
      ),
    }
    const zone = `${destination.ownerId}:${destination.slot}`
    if (inserted && data.zones?.[zone]) next.zones[zone] = [...data.zones[zone], item]
    if (!inserted) throw new Error('Choose an available destination')
    return next
  }
  if (isPageContentContext(context) && item.type !== 'Section') {
    if (!config.components.Section) throw new Error('A Section container is required')
    item = {
      type: 'Section',
      props: { ...config.components.Section.defaultProps, id: newId(), content: [item] },
    }
  }
  return { ...data, content: [...data.content, item] }
}
