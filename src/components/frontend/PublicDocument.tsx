import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { resolvePublicPath } from '@/lib/url/registry'
import config from '@/payload.config'
import { ThemeRenderer, resolveThemeTemplate } from '@/lib/theme-engine'

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

  const post = await payload.findByID({
    collection: 'posts',
    id: resolved.id,
    depth: 2,
    draft: false,
    overrideAccess: true,
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
