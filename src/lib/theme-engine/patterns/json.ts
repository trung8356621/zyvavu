import { atomManifests } from '@/widgets/atoms/manifests'
import { validateFixedBinding } from '../widget-contracts'
import type { Data, Config } from '@puckeditor/core'
import type { ThemeComponentData, TemplateContext } from '../types'
import { getWidgetManifest } from '../widget-registry-manifests'
import { validateUniversalStyle } from '@/lib/style-engine/validation'

// Serialization/preview allowlist for existing renderers, not another widget registration.
export const PATTERN_SLOTS: Record<string, readonly string[]> = {
  ...Object.fromEntries(Object.keys(atomManifests).map((type) => [type, []])),
  Section: ['content'],
  Columns: ['column1', 'column2', 'column3', 'column4'],
  CollectionLoop: ['itemTemplate'],
  Header: [
    'topBarLeft',
    'topBarCenter',
    'topBarRight',
    'mainHeaderLeft',
    'mainHeaderCenter',
    'mainHeaderRight',
    'bottomBarLeft',
    'bottomBarCenter',
    'bottomBarRight',
  ],
  Footer: ['footerContent'],
  TextBlock: [],
  PostTitle: [],
  PostContent: [],
  PostMeta: [],
  FeaturedMedia: [],
  CategoryHeader: [],
  RecentPosts: [],
  ItemTitle: [],
  ItemExcerpt: [],
  ItemImage: [],
  ItemLink: [],
  HeaderBrand: [],
  HeaderNav: [],
  HeaderAction: [],
  HeaderTopBarText: [],
}
export type PatternSource = 'system' | 'theme' | 'user'
export type PatternJSON = {
  schemaVersion: 1
  id: string
  name: string
  description: string
  category: string
  widgetType: string
  source: PatternSource
  version: number
  context?: TemplateContext
  payload: { content: ThemeComponentData[]; zones: Record<string, ThemeComponentData[]> }
  theme: { tokens: string[]; themeId?: string }
  thumbnail?: {
    url?: string
    version: number
    hash?: string
    status?: 'pending' | 'ready' | 'failed'
    message?: string
  }
}
const RUNTIME_KEYS = new Set([
  'puck',
  'dataContext',
  '__reactFiber',
  '__reactProps',
  '$$typeof',
  '__proto__',
  'prototype',
  'constructor',
  'dangerouslySetInnerHTML',
])
export function assertJSON(value: unknown, depth = 0): void {
  if (depth > 64) throw new Error('Pattern JSON is too deeply nested')
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (
    !value ||
    typeof value !== 'object' ||
    (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)
  )
    throw new Error('Patterns accept plain JSON only; runtime values are forbidden')
  for (const [key, child] of Object.entries(value)) {
    if (RUNTIME_KEYS.has(key) || /^on[A-Z]/.test(key))
      throw new Error(`Runtime or unsafe field: ${key}`)
    if (
      /url$|href$|src$/i.test(key) &&
      typeof child === 'string' &&
      /^(?:javascript|data|vbscript):/i.test(child.trim())
    )
      throw new Error('Unsafe pattern URL')
    assertJSON(child, depth + 1)
  }
}
export function validatePatternJSON(input: unknown): asserts input is PatternJSON {
  assertJSON(input)
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Pattern must be a JSON object')
  const p = input as PatternJSON
  if (JSON.stringify(p).length > 262144) throw new Error('Pattern exceeds 256 KB')
  if (
    p.schemaVersion !== 1 ||
    !Number.isInteger(p.version) ||
    p.version < 1 ||
    typeof p.id !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/i.test(p.id)
  )
    throw new Error('Unsupported pattern identity or schema version')
  if (
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    p.name.length > 120 ||
    typeof p.description !== 'string' ||
    p.description.length > 1000 ||
    typeof p.category !== 'string' ||
    p.category.length > 80
  )
    throw new Error('Invalid pattern metadata')
  if (
    !['system', 'theme', 'user'].includes(p.source) ||
    !p.theme ||
    !Array.isArray(p.theme.tokens) ||
    p.theme.tokens.length > 128 ||
    p.theme.tokens.some((token) => typeof token !== 'string' || !/^[a-z][a-z0-9-]*$/i.test(token))
  )
    throw new Error('Invalid source or token compatibility')
  if (
    !p.payload ||
    !Array.isArray(p.payload.content) ||
    p.payload.content.length !== 1 ||
    !p.payload.zones ||
    Object.keys(p.payload.zones).length
  )
    throw new Error('Canonical patterns require one rooted Puck subtree with inline Slot arrays')
  if (p.payload.content[0].type !== p.widgetType)
    throw new Error('Pattern type does not match its payload')
  const ids = new Set<string>()
  let count = 0
  const walk = (nodes: ThemeComponentData[], depth: number, parent?: string, slot?: string) => {
    if (depth > 8) throw new Error('Pattern exceeds 8 widget levels')
    for (const node of nodes) {
      if (
        ++count > 100 ||
        !node ||
        !Object.hasOwn(PATTERN_SLOTS, node.type) ||
        !getWidgetManifest(node.type) ||
        !node.props ||
        typeof node.props.id !== 'string' ||
        !node.props.id ||
        ids.has(node.props.id)
      )
        throw new Error('Unsupported widget, duplicate ID, or more than 100 widgets')
      if (parent && (node.type === 'Section' || !PATTERN_SLOTS[parent]?.includes(slot!)))
        throw new Error('Invalid nested Slot structure')
      const bindingErrors = validateFixedBinding(node)
      if (bindingErrors.length) throw new Error(bindingErrors.join('; '))
      ids.add(node.props.id)
      const style = validateUniversalStyle(node.props.style)
      if (!style.valid) throw new Error(style.errors.join('; '))
      for (const key of PATTERN_SLOTS[node.type]) {
        if (node.props[key] !== undefined && !Array.isArray(node.props[key]))
          throw new Error(`Slot ${key} must be a Puck array`)
        walk(node.props[key] || [], depth + 1, node.type, key)
      }
      for (const [key, value] of Object.entries(node.props)) {
        if (
          !PATTERN_SLOTS[node.type].includes(key) &&
          Array.isArray(value) &&
          value.some(
            (entry) => entry && typeof entry === 'object' && 'type' in entry && 'props' in entry,
          )
        )
          throw new Error('Widget tree found outside a supported Slot')
      }
    }
  }
  walk(p.payload.content, 1)
}
export function collectPatternTokens(value: unknown): string[] {
  const tokens = new Set<string>()
  const walk = (item: unknown) => {
    if (!item || typeof item !== 'object') return
    for (const [key, child] of Object.entries(item)) {
      if (
        (/Token$/.test(key) ||
          key === 'typography' ||
          key === 'token' ||
          key === 'spacing' ||
          key === 'radius') &&
        typeof child === 'string' &&
        /^[a-z][a-z0-9-]*$/i.test(child)
      )
        tokens.add(child)
      else walk(child)
    }
  }
  walk(value)
  return [...tokens].sort()
}
export function serializeSelectedPattern(
  data: Data,
  id: string,
  metadata: Pick<PatternJSON, 'id' | 'name' | 'description' | 'category'> & {
    context?: TemplateContext
  },
): PatternJSON {
  let target: ThemeComponentData | undefined
  const find = (nodes: ThemeComponentData[]) => {
    for (const node of nodes) {
      if (node.props.id === id) target = node
      for (const key of PATTERN_SLOTS[node.type] || [])
        if (Array.isArray(node.props[key])) find(node.props[key])
    }
  }
  find(data.content)
  Object.values(data.zones || {}).forEach(find)
  if (!target) throw new Error('Selected widget is unavailable')
  const seen = new Set<string>()
  const expand = (node: ThemeComponentData, depth = 1): ThemeComponentData => {
    if (depth > 8 || seen.has(node.props.id))
      throw new Error('Cyclic or too deeply nested Slot structure')
    seen.add(node.props.id)
    const props = { ...node.props }
    for (const key of PATTERN_SLOTS[node.type] || []) {
      const inline = props[key]
      const zone = data.zones?.[`${props.id}:${key}`]
      if (inline?.length && zone?.length) throw new Error('Ambiguous inline and legacy Slot data')
      if (zone || inline)
        props[key] = (zone || inline || []).map((child: ThemeComponentData) =>
          expand(child, depth + 1),
        )
    }
    return { type: node.type, props }
  }
  const payload = { content: [expand(target)], zones: {} }
  const result: PatternJSON = {
    schemaVersion: 1,
    ...metadata,
    source: 'user',
    version: 1,
    widgetType: target.type,
    payload,
    theme: { tokens: collectPatternTokens(payload) },
  }
  validatePatternJSON(result)
  return JSON.parse(JSON.stringify(result))
}
export function instantiatePatternJSON(
  record: PatternJSON,
  config: Config,
  newId: () => string,
): ThemeComponentData {
  validatePatternJSON(record)
  const copy = JSON.parse(JSON.stringify(record.payload.content[0])) as ThemeComponentData
  const walk = (node: ThemeComponentData) => {
    if (!config.components[node.type])
      throw new Error(`Widget ${node.type} is unavailable in this template`)
    node.props.id = newId()
    for (const slot of PATTERN_SLOTS[node.type]) {
      const field = config.components[node.type].fields?.[slot] as
        { type: string; allow?: string[]; disallow?: string[] } | undefined
      for (const child of node.props[slot] || []) {
        if (
          field?.type !== 'slot' ||
          field.disallow?.includes(child.type) ||
          (field.allow && !field.allow.includes(child.type))
        )
          throw new Error('Pattern contains an incompatible Slot child')
        walk(child)
      }
    }
  }
  walk(copy)
  return copy
}
export const SIMPLE_PATTERN_TYPES = [
  'Heading',
  'Text',
  'Button',
  'DocumentTitle',
  'DocumentDate',
  'DocumentCategory',
  'CategoryTitle',
  'CategoryDescription',
  'TextBlock',
  'PostTitle',
  'HeaderAction',
  'HeaderTopBarText',
  'ItemTitle',
  'ItemExcerpt',
  'ItemLink',
]
export function isComplexPattern(record: PatternJSON) {
  return (
    !SIMPLE_PATTERN_TYPES.includes(record.widgetType) ||
    PATTERN_SLOTS[record.widgetType]?.some((slot) => record.payload.content[0].props[slot]?.length)
  )
}

/** Read-only bridge from native Puck inline Slots to the existing SSR zone consumer. */
export function inlineSlotsToZones<
  T extends { content: ThemeComponentData[]; zones?: Record<string, ThemeComponentData[]> },
>(data: T): T {
  const zones = { ...data.zones }
  const seen = new Set<string>()
  const walk = (nodes: ThemeComponentData[]) => {
    for (const node of nodes) {
      if (seen.has(node.props.id)) continue
      seen.add(node.props.id)
      for (const slot of PATTERN_SLOTS[node.type] || []) {
        const inline = node.props[slot]
        const key = `${node.props.id}:${slot}`
        if (Array.isArray(inline) && (inline.length || !zones[key]?.length)) zones[key] = inline
        if (zones[key]) walk(zones[key])
      }
    }
  }
  walk(data.content)
  Object.values(data.zones || {}).forEach(walk)
  return { ...data, zones }
}
