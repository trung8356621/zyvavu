import { notFound } from 'next/navigation'
import React from 'react'
import { getPayload } from 'payload'

import { RenderBlocks } from '@/components/frontend/RenderBlocks'
import config from '@/payload.config'

export default async function PageBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'posts' || slug === 'admin' || slug === 'api') notFound()

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        { visibility: { equals: 'public' } },
      ],
    },
    depth: 2,
    limit: 1,
  })
  const page = result.docs[0]
  if (!page) notFound()

  return (
    <article className="site-section">
      <h1>{page.title}</h1>
      {page.excerpt ? <p>{page.excerpt}</p> : null}
      <RenderBlocks blocks={page.layout as Array<Record<string, unknown>>} />
    </article>
  )
}
