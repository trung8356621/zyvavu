import { getWidgetManifest } from './widget-registry-manifests'
import { SYSTEM_PATTERNS } from './patterns/catalog'
import { instantiatePatternJSON, validatePatternJSON, type PatternJSON } from './patterns/json'
import type { Config, Data, SlotField } from '@puckeditor/core'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { validateThemeTemplateDocument } from './validation'
import type { TemplateContext, ThemeTemplateDocument } from './types'
import { isPageContentContext } from './normalization'

export interface WidgetDesignPattern {
  canonical?: PatternJSON
  id: string
  version: number
  compatibility: { builderVersion: 1; widgetTypes: string[]; capabilities?: string[] }
  widgetType: string
  name: string
  category: string
  preview: { kind: 'section' | 'text' | 'columns' | 'button' | 'media'; label: string }
  props: {
    style?: UniversalStyle
    distribution?: string
    variant?: string
    aspectRatio?: string
    rounded?: boolean
  }
  tokenReferences: string[]
  slots?: Record<
    string,
    { type: string; props?: Record<string, unknown>; slots?: WidgetDesignPattern['slots'] }[]
  >
}
export function designPatternFromJSON(canonical: PatternJSON): WidgetDesignPattern {
  const root = canonical.payload.content[0]
  const { style, distribution, variant, aspectRatio, rounded } = root.props
  const props = Object.fromEntries(
    Object.entries({ style, distribution, variant, aspectRatio, rounded }).filter(
      ([, value]) => value !== undefined,
    ),
  )
  return {
    canonical,
    id: canonical.id,
    version: canonical.version,
    widgetType: canonical.widgetType,
    name: canonical.name,
    category: canonical.category,
    compatibility: { builderVersion: 1, widgetTypes: [canonical.widgetType] },
    preview: {
      kind:
        canonical.widgetType === 'Section'
          ? 'section'
          : canonical.widgetType === 'Columns'
            ? 'columns'
            : canonical.widgetType === 'FeaturedMedia'
              ? 'media'
              : 'text',
      label: canonical.name,
    },
    props,
    tokenReferences: canonical.theme.tokens,
  }
}
export const WIDGET_DESIGN_PATTERNS: readonly WidgetDesignPattern[] =
  SYSTEM_PATTERNS.map(designPatternFromJSON)

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
  if (
    Object.keys(pattern.props).some(
      (key) => !['style', 'distribution', 'variant', 'aspectRatio', 'rounded'].includes(key),
    )
  )
    throw new Error('Pattern props must be presentation-only')
  const validation = validateUniversalStyle(pattern.props.style)
  if (!validation.valid) throw new Error(validation.errors.join('; '))
  let record = pattern.canonical
  if (!record) {
    let index = 0
    const expand = (
      type: string,
      props: Record<string, unknown>,
      slots?: WidgetDesignPattern['slots'],
    ): any => {
      const result = {
        type,
        props: {
          ...structuredClone(getWidgetManifest(type)?.defaultProps || {}),
          ...props,
          id: `${pattern.id}-${index++}`,
        } as Record<string, unknown>,
      }
      for (const [slot, children] of Object.entries(slots || {}))
        result.props[slot] = children.map((child) =>
          expand(child.type, child.props || {}, child.slots),
        )
      return result
    }
    record = {
      schemaVersion: 1,
      id: pattern.id,
      name: pattern.name,
      description: pattern.name,
      category: pattern.category,
      widgetType: pattern.widgetType,
      source: 'theme',
      version: pattern.version,
      payload: { content: [expand(pattern.widgetType, pattern.props, pattern.slots)], zones: {} },
      theme: { tokens: pattern.tokenReferences },
    }
  }
  validatePatternJSON(record)
  patternRegistry.set(pattern.id, designPatternFromJSON(structuredClone(record)))
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
  if (pattern.canonical) return instantiatePatternJSON(pattern.canonical, config, newId)
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
        if (pattern.props.aspectRatio !== undefined) props.aspectRatio = pattern.props.aspectRatio
        if (pattern.props.rounded !== undefined) props.rounded = pattern.props.rounded
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
