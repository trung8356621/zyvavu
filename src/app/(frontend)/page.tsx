import React from 'react'
import { getPayload } from 'payload'

import { PublicDocument } from '@/components/frontend/PublicDocument'
import { ThemeRenderer, resolveThemeTemplate } from '@/lib/theme-engine'
import { attachCanonicalUrls, resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const resolved = await resolvePublicPath(payload, '/')
  if (resolved) {
    return <PublicDocument path="/" />
  }

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
    <ThemeRenderer
      document={templateDoc}
      dataContext={{
        type: 'home',
        archive: {
          posts: postsWithCanonical,
        },
      }}
    />
  )
}
