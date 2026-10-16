import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { buildEntityGraph, resolveSeoPageContext, SeoJsonLd } from '@/lib/seo'
import { attachCanonicalUrls } from '@/lib/url/registry'
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
  const seoContext = await resolveSeoPageContext(payload, path)

  if (seoContext.status === 'not_found') {
    if (missing) return missing
    notFound()
  }

  if (seoContext.status === 'redirect' && seoContext.redirectTarget) {
    permanentRedirect(seoContext.redirectTarget)
  }

  const graph = buildEntityGraph(seoContext)

  if (seoContext.resourceType === 'page' || (seoContext.resourceType === 'home' && seoContext.page)) {
    const page = seoContext.document
    if (!page) notFound()

    const templateDoc = await resolveThemeTemplate(payload, 'page')
    return (
      <>
        <SeoJsonLd graph={graph} />
        <ThemeRenderer
          document={templateDoc}
          dataContext={{
            type: 'page',
            document: page,
          }}
        />
      </>
    )
  }

  if (seoContext.resourceType === 'category' || seoContext.resourceType === 'tag') {
    const term = seoContext.document as { id: number; title: string; slug: string } | undefined
    if (!term || !term.slug) notFound()

    const relationField = seoContext.resourceType === 'category' ? 'categories' : 'tags'
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
      <>
        <SeoJsonLd graph={graph} />
        <ThemeRenderer
          document={templateDoc}
          dataContext={{
            type: 'category',
            document: term,
            archive: {
              taxonomyType: seoContext.resourceType,
              title: term.title,
              posts: postsWithCanonical,
              total: postsResult.totalDocs,
              page: postsResult.page || 1,
              totalPages: postsResult.totalPages || 1,
            },
          }}
        />
      </>
    )
  }

  const post = seoContext.document
  if (!post) notFound()

  const templateDoc = await resolveThemeTemplate(payload, 'single')
  return (
    <>
      <SeoJsonLd graph={graph} />
      <ThemeRenderer
        document={templateDoc}
        dataContext={{
          type: 'single',
          document: post,
        }}
      />
    </>
  )
}
