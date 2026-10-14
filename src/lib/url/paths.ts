import { pathForPageSlug } from '@/lib/slug'
import {
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  resolvePostPath,
} from '@/lib/permalinks'

import { normalizePath } from './normalize'

export type ResourceType = 'page' | 'post'

export function canonicalPathFor(
  resourceType: ResourceType,
  slug: string,
  publicPath?: string | null,
  postPermalinkStructure?: string | null,
  pagePermalinkStructure?: string | null,
): string {
  if (typeof publicPath === 'string' && publicPath.trim()) return normalizePath(publicPath)
  if (resourceType === 'page') {
    return normalizePath(pathForPageSlug(slug, pagePermalinkStructure || DEFAULT_PAGE_PERMALINK_STRUCTURE))
  }
  return resolvePostPath(postPermalinkStructure || DEFAULT_POST_PERMALINK_STRUCTURE, slug)
}
