import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { attachCanonicalUrls, resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'
import { ThemeRenderer, resolveThemeTemplate } from '@/lib/theme-engine'

const ARCHIVE_POSTS_LIMIT = 24

export async function PublicDocument({
  path,
  missing,
}: {
  path: string
  missing?: React.ReactNode
}) {
  const payload = await getPayload({ config })
  const resolved = await resolvePublicPath(payload, path)
  if (!resolved) {
    if (missing) return missing
    notFound()
  }
  if (resolved.kind === 'redirect') permanentRedirect(resolved.target)

  if (resolved.resourceType === 'page') {
    const page = await payload.findByID({
      collection: 'pages',
      id: resolved.id,
      depth: 2,
      draft: false,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!page || page._status !== 'published' || page.visibility !== 'public') notFound()

    const templateDoc = await resolveThemeTemplate(payload, 'page')
    return (
      <ThemeRenderer
        document={templateDoc}
        dataContext={{
          type: 'page',
          document: page,
        }}
      />
    )
  }

  if (resolved.resourceType === 'category' || resolved.resourceType === 'tag') {
    const collectionSlug = resolved.resourceType === 'category' ? 'categories' : 'tags'
    const term = await payload.findByID({
      collection: collectionSlug,
      id: resolved.id,
      depth: 1,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!term || !term.slug) notFound()

    const relationField = resolved.resourceType === 'category' ? 'categories' : 'tags'
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { [relationField]: { contains: term.id } },
        ],
      },
      sort: '-updatedAt',
      limit: ARCHIVE_POSTS_LIMIT,
      depth: 1,
      draft: false,
      overrideAccess: true,
    })

    const postsWithCanonical = await attachCanonicalUrls(payload, 'post', postsResult.docs)
    const templateDoc = await resolveThemeTemplate(payload, 'category')

    return (
      <ThemeRenderer
        document={templateDoc}
        dataContext={{
          type: 'category',
          document: term,
          archive: {
            taxonomyType: resolved.resourceType,
            title: term.title,
            posts: postsWithCanonical,
            total: postsResult.totalDocs,
            page: postsResult.page || 1,
            totalPages: postsResult.totalPages || 1,
          },
        }}
      />
    )
  }

  const post = await payload.findByID({
    collection: 'posts',
    id: resolved.id,
    depth: 2,
    draft: false,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!post || post._status !== 'published') notFound()

  const templateDoc = await resolveThemeTemplate(payload, 'single')
  return (
    <ThemeRenderer
      document={templateDoc}
      dataContext={{
        type: 'single',
        document: post,
      }}
    />
  )
}
