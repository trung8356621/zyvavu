import { pathForPageSlug, pathForPostSlug } from '@/lib/slug'

import { normalizePath } from './normalize'

export type ResourceType = 'page' | 'post'

export function canonicalPathFor(resourceType: ResourceType, slug: string, publicPath?: string | null): string {
  if (typeof publicPath === 'string' && publicPath.trim()) return normalizePath(publicPath)
  return normalizePath(resourceType === 'page' ? pathForPageSlug(slug) : pathForPostSlug(slug))
}
