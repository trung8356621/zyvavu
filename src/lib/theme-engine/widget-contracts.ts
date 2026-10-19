import type { ThemeComponentData, ThemeTemplateDocument } from './types'

export const ATOM_TYPES = ['Heading', 'Text', 'Button', 'Image'] as const
export type AtomType = (typeof ATOM_TYPES)[number]
export const SYSTEM_BLOCKS = {
  DocumentTitle: {
    atom: 'Heading',
    binding: 'document.title',
    role: 'document.title',
    contexts: ['single', 'page'],
  },
  DocumentDate: {
    atom: 'Text',
    binding: 'document.date',
    role: 'document.date',
    contexts: ['single', 'page'],
  },
  DocumentCategory: {
    atom: 'Text',
    binding: 'document.categories',
    role: 'document.categories',
    contexts: ['single', 'page'],
  },
  DocumentFeaturedMedia: {
    atom: 'Image',
    binding: 'document.featuredMedia',
    role: 'document.media',
    contexts: ['single', 'page'],
  },
  CategoryTitle: {
    atom: 'Heading',
    binding: 'archive.title',
    role: 'archive.title',
    contexts: ['category'],
  },
  CategoryDescription: {
    atom: 'Text',
    binding: 'archive.description',
    role: 'archive.description',
    contexts: ['category'],
  },
} as const
export function systemDescriptor(type: string) {
  return Object.hasOwn(SYSTEM_BLOCKS, type) ? SYSTEM_BLOCKS[type as keyof typeof SYSTEM_BLOCKS] : undefined
}
export function presentationType(type: string): string {
  return systemDescriptor(type)?.atom || type
}
export function hasThemeLibrary(context?: string) {
  return ['single', 'page', 'category'].includes(context || '')
}
/** Walk inline Slots and legacy zones once; never mutate source data. */
export function collectTemplateWidgets(
  doc: Pick<ThemeTemplateDocument, 'content' | 'zones'>,
): ThemeComponentData[] {
  const result: ThemeComponentData[] = []
  const seen = new Set<object>()
  const walk = (nodes: ThemeComponentData[]) => {
    for (const node of nodes || []) {
      if (!node || typeof node !== 'object' || seen.has(node)) continue
      seen.add(node)
      result.push(node)
      for (const value of Object.values(node.props || {})) {
        if (
          Array.isArray(value) &&
          value.some((v) => v && typeof v === 'object' && 'type' in v && 'props' in v)
        )
          walk(value)
      }
    }
  }
  walk(doc.content)
  Object.values(doc.zones || {}).forEach(walk)
  return result
}
export function widgetRole(node: ThemeComponentData): string | undefined {
  return (
    systemDescriptor(node.type)?.role ||
    (
      {
        PostTitle: 'document.title',
        PostContent: 'document.content',
        CategoryHeader: 'archive.title',
        CollectionLoop: 'archive.content',
        RecentPosts: 'archive.content',
      } as Record<string, string>
    )[node.type]
  )
}
export function validateFixedBinding(node: ThemeComponentData): string[] {
  const descriptor = systemDescriptor(node.type)
  if (!descriptor) return []
  if (!node.props || typeof node.props !== 'object') return [`${node.type}: props must be an object`]
  const errors: string[] = []
  for (const key of ['binding', 'role']) {
    if (node.props[key] !== descriptor[key as 'binding' | 'role'])
      errors.push(`${node.type}: fixed ${key} cannot be changed`)
  }
  for (const key of [
    'text',
    'title',
    'content',
    'src',
    'alt',
    'url',
    'href',
    'dataContext',
    'children',
  ]) {
    if (key in node.props) errors.push(`${node.type}: dynamic ${key} cannot be overridden`)
  }
  return errors
}
export function validateRoleContract(
  doc: ThemeTemplateDocument,
  previous?: ThemeTemplateDocument | null,
): string[] {
  const nodes = collectTemplateWidgets(doc)
  const errors = nodes.flatMap(validateFixedBinding)
  const strict = doc.metadata?.roleContract === 1 || previous?.metadata?.roleContract === 1
  if (previous?.metadata?.roleContract === 1 && doc.metadata?.roleContract !== 1)
    errors.push('Role contract cannot be downgraded')
  for (const old of previous ? collectTemplateWidgets(previous) : []) {
    const current = nodes.find((n) => n.props?.id === old.props?.id)
    if (systemDescriptor(old.type) && current && current.type !== old.type)
      errors.push(`Fixed system identity ${old.props.id} cannot be changed`)
  }
  const baseline = previous ? collectTemplateWidgets(previous) : []
  const roles =
    doc.template === 'category'
      ? ['archive.title', 'archive.content']
      : ['single', 'page'].includes(doc.template)
        ? ['document.title', 'document.content']
        : []
  for (const role of roles) {
    const count = nodes.filter((n) => widgetRole(n) === role).length
    const legacyArchiveCount = !strict && !previous && role === 'archive.content' ? nodes.filter(n => n.type === 'RecentPosts' || n.type === 'CollectionLoop').length : 0
    const oldCount = Math.max(legacyArchiveCount, baseline.filter((n) => widgetRole(n) === role).length)
    if ((strict || oldCount > 0) && count === 0) errors.push(`Required role ${role} is missing`)
    if (count > Math.max(1, strict ? 1 : oldCount))
      errors.push(`Only one widget with capability "${role}" is allowed (role must be unique)`)
    if (
      strict &&
      doc.template === 'category' &&
      role === 'archive.content' &&
      nodes.some((n) => n.type === 'RecentPosts')
    )
      errors.push('New Category contracts require CollectionLoop for content')
  }
  return errors
}

/** Explicit, non-destructive opt-in; callers must validate before persisting. */
export function withRoleContract(doc: ThemeTemplateDocument): ThemeTemplateDocument {
  return { ...doc, metadata: { ...doc.metadata, roleContract: 1 } }
}
export function homeHeadingWarning(doc?: ThemeTemplateDocument): string | undefined {
  if (doc?.template !== 'home') return undefined
  return collectTemplateWidgets(doc).some((node) => node.props.tag === 'h1')
    ? undefined
    : 'SEO: this Home layout has no explicit H1. Saving is allowed.'
}
export function createRoleTemplate(context: 'single' | 'page' | 'category'): ThemeTemplateDocument & { root: { props: { title?: string } } } {
  const titleType = context === 'category' ? 'CategoryTitle' : 'DocumentTitle'
  const descriptor = systemDescriptor(titleType)!
  return {
    version: 1,
    template: context,
    metadata: { roleContract: 1 },
    root: { props: {} },
    content: [
      {
        type: 'Section',
        props: {
          id: `${context}-section`,
          content: [
            {
              type: titleType,
              props: { id: `${context}-title`, binding: descriptor.binding, role: descriptor.role },
            },
            {
              type: context === 'category' ? 'CollectionLoop' : 'PostContent',
              props: { id: `${context}-content` },
            },
          ],
        },
      },
    ],
  }
}
