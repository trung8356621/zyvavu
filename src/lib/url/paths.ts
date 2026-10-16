import { pathForPageSlug } from '@/lib/slug'
import {
  DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  DEFAULT_TAG_PERMALINK_STRUCTURE,
  resolveCategoryPath,
  resolvePostPath,
  resolveTagPath,
} from '@/lib/permalinks'

import { normalizePath } from './normalize'

export type ResourceType = 'page' | 'post' | 'category' | 'tag'

export function canonicalPathFor(
  resourceType: ResourceType,
  slug: string,
  publicPath?: string | null,
  postPermalinkStructure?: string | null,
  pagePermalinkStructure?: string | null,
  categoryPermalinkStructure?: string | null,
  tagPermalinkStructure?: string | null,
): string {
  if (typeof publicPath === 'string' && publicPath.trim()) return normalizePath(publicPath)
  if (resourceType === 'page') {
    return normalizePath(pathForPageSlug(slug, pagePermalinkStructure || DEFAULT_PAGE_PERMALINK_STRUCTURE))
  }
  if (resourceType === 'category') {
    return resolveCategoryPath(categoryPermalinkStructure || DEFAULT_CATEGORY_PERMALINK_STRUCTURE, slug)
  }
  if (resourceType === 'tag') {
    return resolveTagPath(tagPermalinkStructure || DEFAULT_TAG_PERMALINK_STRUCTURE, slug)
  }
  return resolvePostPath(postPermalinkStructure || DEFAULT_POST_PERMALINK_STRUCTURE, slug)
}
