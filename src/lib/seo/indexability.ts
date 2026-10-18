import { isPublicResource, type ResourceDoc } from '@/lib/url/registry'
import type { ResourceType } from '@/lib/url/paths'

import type { SeoResolutionStatus, SeoResourceType } from './types'

export type IndexabilityReason =
  | 'indexable'
  | 'not_found'
  | 'redirect'
  | 'missing'
  | 'unpublished'
  | 'private'
  | 'noindex'
  | 'missing_canonical'

export type IndexabilityDecision = {
  indexable: boolean
  reason: IndexabilityReason
  /**
   * Site setting D (delayed sitemap publication) is not finalized.
   * V2 always returns null and does not schedule or delay inclusion.
   * Replace only `isEligibleForSitemap` once D's calculation is confirmed.
   */
  publicationDelay: null
}

export type IndexabilityDocument = ResourceDoc & {
  noindex?: unknown
}

export type IndexabilityInput = {
  status: SeoResolutionStatus
  resourceType?: SeoResourceType | ResourceType | null
  doc?: IndexabilityDocument | null
  canonicalPath?: string | null
  recordRole?: 'canonical' | 'redirect' | null
}

function blocked(reason: IndexabilityReason): IndexabilityDecision {
  return { indexable: false, reason, publicationDelay: null }
}

/**
 * Single indexability decision for HTTP status, meta robots, canonical metadata,
 * JSON-LD, and XML sitemaps.
 *
 * Published public documents with a canonical URL are indexable.
 * Draft, private, missing, redirect, 404, and explicit `noindex` documents are not.
 * Taxonomies stay indexable when they are publicly addressable; empty terms are not treated differently.
 */
export function decideIndexability(input: IndexabilityInput): IndexabilityDecision {
  if (input.status === 'not_found') return blocked('not_found')
  if (input.status === 'redirect' || input.recordRole === 'redirect') return blocked('redirect')
  if (!input.canonicalPath) return blocked('missing_canonical')

  if (input.resourceType === 'home' && !input.doc) {
    return { indexable: true, reason: 'indexable', publicationDelay: null }
  }

  if (!input.doc) return blocked('missing')

  const resourceType = input.resourceType
  if (
    resourceType === 'page' ||
    resourceType === 'post' ||
    resourceType === 'category' ||
    resourceType === 'tag'
  ) {
    if (!isPublicResource(resourceType, input.doc)) {
      return blocked(input.doc.visibility === 'private' ? 'private' : 'unpublished')
    }
  } else if (resourceType !== 'home') {
    return blocked('missing')
  }

  if (input.doc.noindex === true) return blocked('noindex')

  return { indexable: true, reason: 'indexable', publicationDelay: null }
}

/**
 * V2 sitemap inclusion follows current indexability.
 * Critical status, redirect, and noindex changes drop the URL on the next render
 * because eligibility is not cached or delayed.
 */
export function isEligibleForSitemap(decision: IndexabilityDecision): boolean {
  return decision.indexable
}
