import { pathForPageSlug } from '@/lib/slug'
import { DEFAULT_POST_PERMALINK_STRUCTURE, resolvePostPath } from '@/lib/permalinks'

import { normalizePath } from './normalize'

export type ResourceType = 'page' | 'post'

export function canonicalPathFor(
  resourceType: ResourceType,
  slug: string,
  publicPath?: string | null,
  postPermalinkStructure?: string | null,
): string {
  if (typeof publicPath === 'string' && publicPath.trim()) return normalizePath(publicPath)
  if (resourceType === 'page') return normalizePath(pathForPageSlug(slug))
  return resolvePostPath(postPermalinkStructure || DEFAULT_POST_PERMALINK_STRUCTURE, slug)
}
