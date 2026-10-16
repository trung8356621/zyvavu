import React from 'react'
import { getPayload } from 'payload'

import { PublicDocument } from '@/components/frontend/PublicDocument'
import {
  buildEntityGraph,
  generateRouteMetadata,
  resolveSeoPageContext,
  SeoJsonLd,
} from '@/lib/seo'
import { ThemeRenderer, resolveThemeTemplate } from '@/lib/theme-engine'
import { attachCanonicalUrls, resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'

export async function generateMetadata() {
  const payload = await getPayload({ config })
  return generateRouteMetadata(payload, '/')
}

export default async function HomePage() {
  const payload = await getPayload({ config })
  const resolved = await resolvePublicPath(payload, '/')
  if (resolved) {
    return <PublicDocument path="/" />
  }

  const seoContext = await resolveSeoPageContext(payload, '/')
  const graph = buildEntityGraph(seoContext)

  // Fetch recent published posts for home template preview
  const recentPosts = await payload
    .find({
      collection: 'posts',
      where: { _status: { equals: 'published' } },
      limit: 6,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] }))

  const postsWithCanonical = await attachCanonicalUrls(payload, 'post', recentPosts.docs)
  const templateDoc = await resolveThemeTemplate(payload, 'home')
  return (
    <>
      <SeoJsonLd graph={graph} />
      <ThemeRenderer
        document={templateDoc}
        dataContext={{
          type: 'home',
          archive: {
            posts: postsWithCanonical,
          },
        }}
      />
    </>
  )
}
