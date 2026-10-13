import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { RenderBlocks } from '@/components/frontend/RenderBlocks'
import { resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'

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
    })
    if (!page || page._status !== 'published' || page.visibility !== 'public') notFound()
    return (
      <article className="site-section">
        <h1>{page.title}</h1>
        {page.excerpt ? <p>{page.excerpt}</p> : null}
        <RenderBlocks blocks={page.layout as Array<Record<string, unknown>>} />
      </article>
    )
  }

  const post = await payload.findByID({
    collection: 'posts',
    id: resolved.id,
    depth: 1,
    draft: false,
    overrideAccess: true,
  })
  if (!post || post._status !== 'published') notFound()
  return (
    <article className="site-section">
      <h1>{post.title}</h1>
      {post.excerpt ? <p>{post.excerpt}</p> : null}
    </article>
  )
}
