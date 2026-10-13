import { notFound } from 'next/navigation'
import React from 'react'
import { getPayload } from 'payload'

import config from '@/payload.config'

export default async function PostBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    depth: 1,
    limit: 1,
  })
  const post = result.docs[0]
  if (!post) notFound()

  return (
    <article className="site-section">
      <h1>{post.title}</h1>
      {post.excerpt ? <p>{post.excerpt}</p> : null}
    </article>
  )
}
