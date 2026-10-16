import { DEFAULT_SCHEMA_ADAPTERS } from './adapters'
import type {
  GraphValidationResult,
  SchemaAdapter,
  SchemaEntityIds,
  SchemaGraph,
  SchemaNode,
  SeoPageContext,
} from './types'
import { buildAbsoluteUrl } from './utils'

/**
 * Computes deterministic, stable entity @id URLs for a given SEO Page Context.
 */
export function buildSchemaEntityIds(context: SeoPageContext): SchemaEntityIds {
  const homeUrl = buildAbsoluteUrl(context.site.siteUrl, '/')
  const canonicalUrl = context.canonicalUrl

  const entityId = (fragment: string, baseUrl?: string): string => {
    const cleanFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment
    const base = baseUrl || canonicalUrl || homeUrl
    return `${base}#${cleanFragment}`
  }

  return {
    organizationId: `${homeUrl}#organization`,
    websiteId: `${homeUrl}#website`,
    logoId: `${homeUrl}#logo`,
    webpageId: canonicalUrl ? `${canonicalUrl}#webpage` : undefined,
    breadcrumbId: canonicalUrl ? `${canonicalUrl}#breadcrumb` : undefined,
    primaryImageId: canonicalUrl ? `${canonicalUrl}#primaryimage` : undefined,
    articleId: canonicalUrl ? `${canonicalUrl}#article` : undefined,
    entityId,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isPureIdRef(value: unknown): value is { '@id': string } {
  if (!isPlainObject(value)) return false
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === '@id' && typeof value['@id'] === 'string' && Boolean(value['@id'].trim())
}

/**
 * Recursively strips empty strings, null, undefined, and empty arrays/objects from a schema value.
 */
function sanitizeSchemaValue(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  }
  if (Array.isArray(value)) {
    const cleaned = value.map(sanitizeSchemaValue).filter((item) => item !== undefined)
    return cleaned.length > 0 ? cleaned : undefined
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      const cleanedVal = sanitizeSchemaValue(val)
      if (cleanedVal !== undefined) {
        result[key] = cleanedVal
      }
    }
    const keys = Object.keys(result)
    if (keys.length === 0) return undefined
    // Reject bare node with only @type and no other properties
    if (keys.length === 1 && keys[0] === '@type') return undefined
    return result
  }
  return value
}

/**
 * Removes any pure { '@id': '...' } reference whose target @id does not exist in existingIds.
 */
function pruneDanglingReferences(value: unknown, existingIds: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => pruneDanglingReferences(item, existingIds))
      .filter((item) => item !== undefined)
    return filtered.length > 0 ? filtered : undefined
  }

  if (isPlainObject(value)) {
    if (isPureIdRef(value)) {
      return existingIds.has(value['@id']) ? value : undefined
    }
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === '@id' || key === '@type') {
        result[key] = val
        continue
      }
      const pruned = pruneDanglingReferences(val, existingIds)
      if (pruned !== undefined) {
        result[key] = pruned
      }
    }
    const keys = Object.keys(result)
    if (keys.length === 0 || (keys.length === 1 && keys[0] === '@type')) {
      return undefined
    }
    return result
  }

  return value
}

function mergeSchemaNodes(existing: SchemaNode, incoming: SchemaNode): SchemaNode {
  const merged: SchemaNode = { ...existing }
  for (const [key, val] of Object.entries(incoming)) {
    if (val === undefined) continue
    if (key === '@type' && existing['@type'] && existing['@type'] !== val) {
      const types = new Set<string>([
        ...(Array.isArray(existing['@type']) ? existing['@type'] : [existing['@type']]),
        ...(Array.isArray(val) ? (val as string[]) : [String(val)]),
      ])
      merged['@type'] = types.size === 1 ? Array.from(types)[0] : Array.from(types)
    } else if (!(key in merged)) {
      merged[key] = val
    }
  }
  return merged
}

export class EntityGraphBuilder {
  private readonly adapters: SchemaAdapter[]

  constructor(adapters: readonly SchemaAdapter[] = DEFAULT_SCHEMA_ADAPTERS) {
    this.adapters = [...adapters]
  }

  public registerAdapter(adapter: SchemaAdapter): this {
    const idx = this.adapters.findIndex((a) => a.name === adapter.name)
    if (idx >= 0) {
      this.adapters[idx] = adapter
    } else {
      this.adapters.push(adapter)
    }
    return this
  }

  public build(context: SeoPageContext): SchemaGraph | null {
    if (context.status !== 'ok' || !context.isIndexable) {
      return null
    }

    const ids = buildSchemaEntityIds(context)
    const rawNodes: SchemaNode[] = []

    for (const adapter of this.adapters) {
      if (!adapter.supports(context)) continue
      const built = adapter.build(context, ids)
      if (!built) continue
      if (Array.isArray(built)) {
        rawNodes.push(...built)
      } else {
        rawNodes.push(built)
      }
    }

    // 1. Sanitize and deduplicate nodes by @id
    const nodesById = new Map<string, SchemaNode>()
    const anonymousNodes: SchemaNode[] = []

    for (const rawNode of rawNodes) {
      const sanitized = sanitizeSchemaValue(rawNode) as SchemaNode | undefined
      if (!sanitized || !sanitized['@type']) continue

      const nodeId = typeof sanitized['@id'] === 'string' ? sanitized['@id'] : undefined
      if (nodeId) {
        const prev = nodesById.get(nodeId)
        if (prev) {
          nodesById.set(nodeId, mergeSchemaNodes(prev, sanitized))
        } else {
          nodesById.set(nodeId, sanitized)
        }
      } else {
        anonymousNodes.push(sanitized)
      }
    }

    const existingIds = new Set<string>(nodesById.keys())

    // 2. Ensure all referenced @id entities exist (prune any dangling @id references)
    const finalNodes: SchemaNode[] = []
    for (const node of [...nodesById.values(), ...anonymousNodes]) {
      const pruned = pruneDanglingReferences(node, existingIds) as SchemaNode | undefined
      if (pruned && pruned['@type']) {
        finalNodes.push(pruned)
      }
    }

    if (finalNodes.length === 0) return null

    return {
      '@context': 'https://schema.org',
      '@graph': finalNodes,
    }
  }
}

export function buildEntityGraph(
  context: SeoPageContext,
  options?: { adapters?: readonly SchemaAdapter[] },
): SchemaGraph | null {
  const builder = new EntityGraphBuilder(options?.adapters ?? DEFAULT_SCHEMA_ADAPTERS)
  return builder.build(context)
}

/**
 * Validates a SchemaGraph for unique @id nodes and ensures every internal @id reference resolves to a node in @graph.
 */
export function validateEntityGraph(graph: SchemaGraph | null | undefined): GraphValidationResult {
  if (!graph || graph['@context'] !== 'https://schema.org' || !Array.isArray(graph['@graph'])) {
    return {
      valid: false,
      uniqueIds: [],
      duplicateIds: [],
      danglingReferences: [],
      errors: ['Graph is missing @context https://schema.org or @graph array.'],
    }
  }

  const seenIds = new Set<string>()
  const duplicateIds = new Set<string>()
  const errors: string[] = []

  for (const node of graph['@graph']) {
    if (!node || typeof node !== 'object' || !node['@type']) {
      errors.push('Graph contains a node without @type.')
      continue
    }
    if (typeof node['@id'] === 'string') {
      if (seenIds.has(node['@id'])) {
        duplicateIds.add(node['@id'])
        errors.push(`Duplicate @id found in @graph: ${node['@id']}`)
      }
      seenIds.add(node['@id'])
    }
  }

  const referencedIds = new Set<string>()

  function collectReferences(value: unknown, isTopLevelNode = false) {
    if (Array.isArray(value)) {
      for (const item of value) collectReferences(item, false)
      return
    }
    if (!isPlainObject(value)) return

    if (!isTopLevelNode && isPureIdRef(value)) {
      referencedIds.add(value['@id'])
      return
    }

    for (const [key, val] of Object.entries(value)) {
      if (key === '@id' || key === '@type') continue
      collectReferences(val, false)
    }
  }

  for (const node of graph['@graph']) {
    collectReferences(node, true)
  }

  const danglingReferences: string[] = []
  for (const refId of referencedIds) {
    if (!seenIds.has(refId)) {
      danglingReferences.push(refId)
      errors.push(`Referenced @id does not exist in @graph: ${refId}`)
    }
  }

  return {
    valid: errors.length === 0,
    uniqueIds: Array.from(seenIds),
    duplicateIds: Array.from(duplicateIds),
    danglingReferences,
    errors,
  }
}
