import type { Data } from '@puckeditor/core'
import { PATTERN_SLOTS } from './patterns/json'
import type { ThemeComponentData } from './types'

type SlotDocument = {
  content?: ThemeComponentData[]
  zones?: Record<string, ThemeComponentData[]>
  root?: Data['root']
}

function walkSlotTree(
  nodes: ThemeComponentData[] | undefined,
  visit: (node: ThemeComponentData) => void,
) {
  for (const node of nodes || []) {
    if (!node || typeof node !== 'object') continue
    visit(node)
    const slots = PATTERN_SLOTS[node.type] || []
    for (const slot of slots) {
      const children = node.props?.[slot]
      if (Array.isArray(children)) walkSlotTree(children as ThemeComponentData[], visit)
    }
    for (const [key, value] of Object.entries(node.props || {})) {
      if (slots.includes(key as never)) continue
      if (
        Array.isArray(value) &&
        value.some((v) => v && typeof v === 'object' && 'type' in v && 'props' in v)
      ) {
        walkSlotTree(value as ThemeComponentData[], visit)
      }
    }
  }
}

/**
 * Collapse legacy DropZone `zones` into Puck inline slot props.
 *
 * Root cause of Duplicate Widget ID: the same logical nodes can exist as
 * `props[slot]` AND `zones[id:slot]` (or in synthetic validation zones) after
 * editor edits against zone-backed templates. Validation walks both stores.
 *
 * Inline slots are authoritative when populated; otherwise zone content is
 * copied into the matching slot prop. Migrated / redundant zone keys are
 * removed. Does not invent IDs.
 */
export function canonicalizeZonesToSlots<
  T extends { content?: ThemeComponentData[]; zones?: Record<string, ThemeComponentData[]> },
>(data: T): T {
  if (!data || typeof data !== 'object') return data

  const copy = structuredClone(data) as T
  const zones: Record<string, ThemeComponentData[]> = { ...(copy.zones || {}) }
  ;(copy as { zones?: Record<string, ThemeComponentData[]> }).zones = zones

  const migrateNode = (node: ThemeComponentData) => {
    if (!node?.props || typeof node.props !== 'object') return
    const slots = PATTERN_SLOTS[node.type] || []
    const id = typeof node.props.id === 'string' ? node.props.id : ''

    for (const slot of slots) {
      const zoneKey = id ? `${id}:${slot}` : ''
      const zoneItems = zoneKey ? zones[zoneKey] : undefined
      const inline = node.props[slot]
      const hasInline = Array.isArray(inline)

      if (hasInline && (inline as ThemeComponentData[]).length > 0) {
        if (zoneKey) delete zones[zoneKey]
        for (const child of inline as ThemeComponentData[]) migrateNode(child)
        continue
      }

      if (Array.isArray(zoneItems)) {
        node.props[slot] = zoneItems
        if (zoneKey) delete zones[zoneKey]
        for (const child of zoneItems) migrateNode(child)
        continue
      }

      if (hasInline) {
        for (const child of inline as ThemeComponentData[]) migrateNode(child)
      }
    }

    for (const [key, value] of Object.entries(node.props)) {
      if (slots.includes(key as never)) continue
      if (
        Array.isArray(value) &&
        value.some((v) => v && typeof v === 'object' && 'type' in v && 'props' in v)
      ) {
        for (const child of value as ThemeComponentData[]) migrateNode(child)
      }
    }
  }

  for (const node of copy.content || []) migrateNode(node)
  for (const items of Object.values(zones)) {
    if (Array.isArray(items)) for (const item of items) migrateNode(item)
  }

  // Drop residual zone entries whose IDs already exist in the slot tree
  // (covers synthetic validation zones and dual-store leftovers after clone).
  const seen = new Set<string>()
  walkSlotTree(copy.content, (node) => {
    if (typeof node.props?.id === 'string' && node.props.id) seen.add(node.props.id)
  })

  for (const [zoneKey, items] of Object.entries(zones)) {
    if (!Array.isArray(items)) {
      delete zones[zoneKey]
      continue
    }
    const kept: ThemeComponentData[] = []
    for (const item of items) {
      const id = item?.props?.id
      if (typeof id === 'string' && id && seen.has(id)) continue
      kept.push(item)
      walkSlotTree([item], (node) => {
        if (typeof node.props?.id === 'string' && node.props.id) seen.add(node.props.id)
      })
    }
    if (kept.length) zones[zoneKey] = kept
    else delete zones[zoneKey]
  }

  return copy
}

/** Resolve slot children for editor preview — prefers inline props, then zones. */
export function resolveSlotItems(
  data: SlotDocument | null | undefined,
  ownerId: string | undefined,
  slotName: string,
): ThemeComponentData[] {
  if (!data || !ownerId) return []

  const find = (nodes: ThemeComponentData[] | undefined): ThemeComponentData | null => {
    for (const node of nodes || []) {
      if (node?.props?.id === ownerId) return node
      for (const value of Object.values(node?.props || {})) {
        if (
          Array.isArray(value) &&
          value.some((v) => v && typeof v === 'object' && 'type' in v && 'props' in v)
        ) {
          const nested = find(value as ThemeComponentData[])
          if (nested) return nested
        }
      }
    }
    return null
  }

  const owner = find(data.content) || find(Object.values(data.zones || {}).flat())

  const inline = owner?.props?.[slotName]
  if (Array.isArray(inline) && inline.length > 0) return inline as ThemeComponentData[]

  const zoneItems = data.zones?.[`${ownerId}:${slotName}`]
  if (Array.isArray(zoneItems)) return zoneItems
  if (Array.isArray(inline)) return inline as ThemeComponentData[]
  return []
}
