import type { ThemeComponentData, ThemeTemplateDocument } from './types'

const ID_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,127}$/i

export function isValidWidgetId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value)
}

/** Shared allocator for manual insert, Pattern, duplicate, and AI import paths. */
export function createWidgetId(prefix = 'w'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}_${rand}`
}

export function collectWidgetIds(nodes: ThemeComponentData[] | undefined, into = new Set<string>()): Set<string> {
  if (!Array.isArray(nodes)) return into
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    if (isValidWidgetId(node.props?.id)) into.add(node.props.id)
    for (const value of Object.values(node.props || {})) {
      if (Array.isArray(value) && value.some((child) => child && typeof child === 'object' && 'type' in child)) {
        collectWidgetIds(value as ThemeComponentData[], into)
      }
    }
  }
  return into
}

export function collectDocumentWidgetIds(document: ThemeTemplateDocument): Set<string> {
  const ids = collectWidgetIds(document.content)
  if (document.zones) {
    for (const zone of Object.values(document.zones)) collectWidgetIds(zone, ids)
  }
  return ids
}

/** Assign missing ids; reject duplicates. Does not rewrite valid existing ids. */
export function ensureWidgetIdsInTree(
  nodes: ThemeComponentData[],
  taken = new Set<string>(),
): { nodes: ThemeComponentData[]; errors: string[] } {
  const errors: string[] = []
  const walk = (list: ThemeComponentData[]): ThemeComponentData[] =>
    list.map((node) => {
      const props = { ...(node.props || {}) }
      if (!isValidWidgetId(props.id)) {
        let next = createWidgetId(node.type?.toLowerCase() || 'w')
        while (taken.has(next)) next = createWidgetId(node.type?.toLowerCase() || 'w')
        props.id = next
        taken.add(next)
      } else if (taken.has(props.id)) {
        errors.push(`Duplicate widget id "${props.id}"`)
      } else {
        taken.add(props.id)
      }
      const nextProps: Record<string, unknown> = { ...props }
      for (const [key, value] of Object.entries(props)) {
        if (Array.isArray(value) && value.some((child) => child && typeof child === 'object' && 'type' in child)) {
          nextProps[key] = walk(value as ThemeComponentData[])
        }
      }
      return { ...node, props: nextProps as ThemeComponentData['props'] }
    })
  return { nodes: walk(nodes), errors }
}

/** Deep-clone a subtree and allocate fresh ids for the root and every descendant. */
export function duplicateTreeWithNewIds(node: ThemeComponentData, taken = new Set<string>()): ThemeComponentData {
  const clone: ThemeComponentData = JSON.parse(JSON.stringify(node))
  const walk = (current: ThemeComponentData) => {
    let next = createWidgetId(current.type?.toLowerCase() || 'w')
    while (taken.has(next)) next = createWidgetId(current.type?.toLowerCase() || 'w')
    current.props = { ...current.props, id: next }
    taken.add(next)
    for (const [key, value] of Object.entries(current.props || {})) {
      if (Array.isArray(value) && value.some((child) => child && typeof child === 'object' && 'type' in child)) {
        for (const child of value as ThemeComponentData[]) walk(child)
      }
    }
  }
  walk(clone)
  return clone
}

export type WidgetPathSegment = {
  id: string
  type: string
  label?: string
}

/** Breadcrumb from document root to target id, including nested slot ancestors. */
export function findWidgetPath(
  document: ThemeTemplateDocument,
  widgetId: string,
): WidgetPathSegment[] | null {
  const path: WidgetPathSegment[] = []
  const walk = (nodes: ThemeComponentData[]): boolean => {
    for (const node of nodes) {
      if (!node?.props?.id) continue
      const label =
        typeof node.props.text === 'string' && node.props.text.trim()
          ? node.props.text.trim().slice(0, 40)
          : undefined
      path.push({ id: node.props.id, type: node.type, label })
      if (node.props.id === widgetId) return true
      for (const value of Object.values(node.props || {})) {
        if (Array.isArray(value) && value.some((child) => child && typeof child === 'object' && 'type' in child)) {
          if (walk(value as ThemeComponentData[])) return true
        }
      }
      path.pop()
    }
    return false
  }
  if (walk(document.content || [])) return path
  if (document.zones) {
    for (const zone of Object.values(document.zones)) {
      if (walk(zone || [])) return path
    }
  }
  return null
}

export function formatWidgetPath(args: {
  themeId: string
  template: string
  versionId?: string | null
  path: WidgetPathSegment[]
}): string {
  const scope = [
    args.themeId,
    args.template,
    ...(args.versionId ? [args.versionId] : []),
  ].join('/')
  const breadcrumb = args.path
    .map((segment) =>
      segment.label ? `${segment.type}(${JSON.stringify(segment.label)})#${segment.id}` : `${segment.type}#${segment.id}`,
    )
    .join(' > ')
  return `${scope} :: ${breadcrumb}`
}
