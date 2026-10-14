import { isReservedPath, normalizePath } from '@/lib/url/normalize'

export const DEFAULT_POST_PERMALINK_STRUCTURE = '/%postname%.html'
export const DEFAULT_PAGE_PERMALINK_STRUCTURE = '/%slug%'
export const DEFAULT_CATEGORY_PERMALINK_STRUCTURE = '/category/%term%'
export const DEFAULT_TAG_PERMALINK_STRUCTURE = '/tag/%term%'
export const HOMEPAGE_PATH = '/'

export const SUPPORTED_POST_TOKENS = ['%postname%'] as const
export const SUPPORTED_PAGE_TOKENS = ['%slug%'] as const
export const SUPPORTED_TAXONOMY_TOKENS = ['%term%'] as const

// Backward-compatibility export
export const SUPPORTED_TOKENS = SUPPORTED_POST_TOKENS

export const UNSUPPORTED_TOKENS = [
  '%category%',
  '%year%',
  '%monthnum%',
  '%month%',
  '%day%',
  '%hour%',
  '%minute%',
  '%second%',
  '%post_id%',
  '%id%',
  '%author%',
  '%tag%',
] as const

export type PermalinkResourceType = 'posts' | 'pages' | 'categories' | 'tags'

export interface PermalinkPreset {
  key: string
  label: string
  pattern: string
  example: string
}

export interface ResourcePermalinkConfig {
  resource: PermalinkResourceType
  label: string
  description: string
  field: 'postPermalinkStructure' | 'pagePermalinkStructure' | 'categoryPermalinkStructure' | 'tagPermalinkStructure'
  token: string
  supportedTokens: readonly string[]
  sampleSlug: string
  defaultStructure: string
  presets: readonly PermalinkPreset[]
  isFunctional: boolean
  statusNote?: string
}

export const RESOURCE_CONFIGS: Record<PermalinkResourceType, ResourcePermalinkConfig> = {
  posts: {
    resource: 'posts',
    label: 'Posts',
    description: 'Choose the URL format for newly published posts. Existing published posts retain their canonical URLs and redirect histories.',
    field: 'postPermalinkStructure',
    token: '%postname%',
    supportedTokens: ['%postname%'],
    sampleSlug: 'sample-post',
    defaultStructure: DEFAULT_POST_PERMALINK_STRUCTURE,
    presets: [
      {
        key: 'postname-html',
        label: 'Post name with HTML extension',
        pattern: '/%postname%.html',
        example: '/sample-post.html',
      },
      {
        key: 'posts',
        label: 'Posts prefix',
        pattern: '/posts/%postname%',
        example: '/posts/sample-post',
      },
      {
        key: 'postname',
        label: 'Post name (flat)',
        pattern: '/%postname%',
        example: '/sample-post',
      },
      {
        key: 'custom',
        label: 'Custom Structure',
        pattern: '',
        example: '',
      },
    ],
    isFunctional: true,
  },
  pages: {
    resource: 'pages',
    label: 'Pages',
    description: 'Choose the URL format for newly published pages. Homepage remains at / and is managed separately.',
    field: 'pagePermalinkStructure',
    token: '%slug%',
    supportedTokens: ['%slug%'],
    sampleSlug: 'sample-page',
    defaultStructure: DEFAULT_PAGE_PERMALINK_STRUCTURE,
    presets: [
      {
        key: 'slug',
        label: 'Page slug (standard)',
        pattern: '/%slug%',
        example: '/sample-page',
      },
      {
        key: 'pages',
        label: 'Pages prefix',
        pattern: '/pages/%slug%',
        example: '/pages/sample-page',
      },
      {
        key: 'custom',
        label: 'Custom Structure',
        pattern: '',
        example: '',
      },
    ],
    isFunctional: true,
  },
  categories: {
    resource: 'categories',
    label: 'Categories',
    description: 'Configure default archive URL format for category taxonomies.',
    field: 'categoryPermalinkStructure',
    token: '%term%',
    supportedTokens: ['%term%'],
    sampleSlug: 'sample-category',
    defaultStructure: DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
    presets: [
      {
        key: 'category-term',
        label: 'Category base',
        pattern: '/category/%term%',
        example: '/category/sample-category',
      },
      {
        key: 'custom',
        label: 'Custom Structure',
        pattern: '',
        example: '',
      },
    ],
    isFunctional: false,
    statusNote: 'Taxonomy archive routing and URL Registry models are pending backend implementation. Settings are saved for future activation.',
  },
  tags: {
    resource: 'tags',
    label: 'Tags',
    description: 'Configure default archive URL format for tag taxonomies.',
    field: 'tagPermalinkStructure',
    token: '%term%',
    supportedTokens: ['%term%'],
    sampleSlug: 'sample-tag',
    defaultStructure: DEFAULT_TAG_PERMALINK_STRUCTURE,
    presets: [
      {
        key: 'tag-term',
        label: 'Tag base',
        pattern: '/tag/%term%',
        example: '/tag/sample-tag',
      },
      {
        key: 'custom',
        label: 'Custom Structure',
        pattern: '',
        example: '',
      },
    ],
    isFunctional: false,
    statusNote: 'Taxonomy archive routing and URL Registry models are pending backend implementation. Settings are saved for future activation.',
  },
}

// Backward-compatibility export
export const PERMALINK_PRESETS = RESOURCE_CONFIGS.posts.presets

function isReservedPrefix(prefix: string): boolean {
  const normalized = prefix.toLowerCase()
  if (normalized === '/admin' || normalized.startsWith('/admin/')) return true
  if (normalized === '/api' || normalized.startsWith('/api/')) return true
  if (normalized === '/_next' || normalized.startsWith('/_next/')) return true
  if (normalized === '/icons' || normalized.startsWith('/icons/')) return true
  return false
}

export function normalizePermalinkPattern(raw?: string | null, resource: PermalinkResourceType = 'posts'): string {
  const config = RESOURCE_CONFIGS[resource]
  const defaultPattern = config ? config.defaultStructure : DEFAULT_POST_PERMALINK_STRUCTURE
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return defaultPattern
  }
  const trimmed = raw.trim()
  if (resource === 'posts') {
    if (trimmed === 'posts') return '/posts/%postname%'
    if (trimmed === 'flat') return '/%postname%'
    if (trimmed === 'postname-html') return '/%postname%.html'
    if (trimmed === 'category') return '/%category%/%postname%'
    if (trimmed === 'date') return '/%year%/%monthnum%/%postname%'
  } else if (resource === 'pages') {
    if (trimmed === 'flat' || trimmed === 'slug') return '/%slug%'
    if (trimmed === 'pages') return '/pages/%slug%'
  } else if (resource === 'categories') {
    if (trimmed === 'category' || trimmed === 'term') return '/category/%term%'
  } else if (resource === 'tags') {
    if (trimmed === 'tag' || trimmed === 'term') return '/tag/%term%'
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function validatePermalinkPattern(
  pattern: unknown,
  resource: PermalinkResourceType = 'posts',
): string | null {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return 'A permalink structure is required.'
  }

  const trimmed = pattern.trim()

  // Malformed lone % check
  const percentCount = (trimmed.match(/%/g) || []).length
  if (percentCount % 2 !== 0) {
    return 'Malformed permalink structure: unmatched % token separator.'
  }

  const config = RESOURCE_CONFIGS[resource]
  const expectedToken = config ? config.token : '%postname%'

  // Detect explicit unsupported tokens
  for (const token of UNSUPPORTED_TOKENS) {
    if (token !== expectedToken && trimmed.includes(token)) {
      return `The token '${token}' is not supported. Only ${expectedToken} is supported.`
    }
  }

  // Detect any other unknown %...% tokens
  const tokenMatches = trimmed.match(/%[^%]+%/g) || []
  for (const match of tokenMatches) {
    if (match !== expectedToken) {
      return `The token '${match}' is not supported. Only ${expectedToken} is supported.`
    }
  }

  // Must contain expected token
  if (!trimmed.includes(expectedToken)) {
    return `Permalink structure must include the ${expectedToken} token.`
  }

  // Reject invalid characters: query, hash, backslash, spaces, quotes, etc.
  if (/[\s?#\\<>"'`;]/i.test(trimmed)) {
    return 'Permalink structure contains invalid characters.'
  }

  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  // Reject duplicate slashes
  if (/\/{2,}/.test(withSlash)) {
    return 'Permalink structure cannot contain duplicate slashes.'
  }

  // Reject path traversal
  const segments = withSlash.split('/')
  if (segments.some((seg) => seg === '.' || seg === '..')) {
    return 'Permalink structure cannot contain relative path navigation.'
  }

  // Check prefix
  const prefix = withSlash.split(expectedToken)[0]
  const normalizedPrefix = prefix.length > 1 && prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  if (normalizedPrefix && isReservedPrefix(normalizedPrefix)) {
    return 'Permalink structure prefix conflicts with a reserved system path.'
  }

  // Resolve with sample slug to check reserved paths
  try {
    const sample = resolveResourcePath(withSlash, config ? config.sampleSlug : 'sample', resource)
    if (isReservedPath(sample)) {
      return 'Permalink structure conflicts with a reserved system path.'
    }
  } catch (err) {
    return `Invalid permalink structure: ${(err as Error).message}`
  }

  return null
}

export function resolveResourcePath(
  pattern: string,
  slug: string,
  resource: PermalinkResourceType = 'posts',
): string {
  if (resource === 'pages' && slug === 'home') {
    return HOMEPAGE_PATH
  }
  const config = RESOURCE_CONFIGS[resource]
  const normalizedPattern = normalizePermalinkPattern(pattern, resource)
  const token = config ? config.token : '%postname%'
  const resolved = normalizedPattern.replace(new RegExp(token, 'g'), slug)
  return normalizePath(resolved)
}

export function resolvePostPath(pattern: string, slug: string): string {
  return resolveResourcePath(pattern, slug, 'posts')
}

export function resolvePagePath(pattern: string, slug: string): string {
  return resolveResourcePath(pattern, slug, 'pages')
}

export function resolveCategoryPath(pattern: string, slug: string): string {
  return resolveResourcePath(pattern, slug, 'categories')
}

export function resolveTagPath(pattern: string, slug: string): string {
  return resolveResourcePath(pattern, slug, 'tags')
}

export function insertTokenAtCursor(
  currentText: string,
  token: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
): { newText: string; newCursorPos: number } {
  const start = typeof selectionStart === 'number' ? selectionStart : currentText.length
  const end = typeof selectionEnd === 'number' ? selectionEnd : currentText.length
  const newText = currentText.substring(0, start) + token + currentText.substring(end)
  const newCursorPos = start + token.length
  return { newText, newCursorPos }
}

export function extractSlugAndPattern(
  canonicalPath: string,
  token: string = '%postname%',
): { slug: string; pattern: string } | null {
  try {
    const hasHtml = canonicalPath.toLowerCase().endsWith('.html')
    const withoutExt = hasHtml ? canonicalPath.slice(0, -5) : canonicalPath
    const lastSlash = withoutExt.lastIndexOf('/')
    if (lastSlash === -1) return null
    const slug = withoutExt.slice(lastSlash + 1)
    const prefix = withoutExt.slice(0, lastSlash)
    if (!slug) return null
    const pattern = `${prefix}/${token}${hasHtml ? '.html' : ''}`
    return { slug, pattern }
  } catch {
    return null
  }
}

export function extractPatternWithOldSlug(
  canonicalPath: string,
  oldSlug: string,
  token: string = '%postname%',
): string | null {
  if (!canonicalPath || !oldSlug) return null
  if (canonicalPath.endsWith(`/${oldSlug}.html`)) {
    const prefix = canonicalPath.slice(0, canonicalPath.length - oldSlug.length - 6)
    return `${prefix}/${token}.html`
  }
  if (canonicalPath.endsWith(`/${oldSlug}`)) {
    const prefix = canonicalPath.slice(0, canonicalPath.length - oldSlug.length - 1)
    return `${prefix}/${token}`
  }
  return null
}

export function resolveEstablishedOrPattern(
  canonicalPath: string | null | undefined,
  oldSlug: string | null | undefined,
  newSlug: string,
  defaultPattern: string,
  resource: PermalinkResourceType = 'posts',
): string {
  const config = RESOURCE_CONFIGS[resource]
  const token = config ? config.token : '%postname%'
  if (canonicalPath) {
    if (oldSlug) {
      const patternFromOldSlug = extractPatternWithOldSlug(canonicalPath, oldSlug, token)
      if (patternFromOldSlug) {
        return resolveResourcePath(patternFromOldSlug, newSlug, resource)
      }
    }
    const extracted = extractSlugAndPattern(canonicalPath, token)
    if (extracted) {
      return resolveResourcePath(extracted.pattern, newSlug, resource)
    }
  }
  return resolveResourcePath(defaultPattern, newSlug, resource)
}
