import React from 'react'
import { getPayload } from 'payload'

import { RenderBlocks } from '@/components/frontend/RenderBlocks'
import config from '@/payload.config'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const home = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { slug: { equals: 'home' } },
        { _status: { equals: 'published' } },
        { visibility: { equals: 'public' } },
      ],
    },
    depth: 2,
    limit: 1,
  })
  const page = home.docs[0]

  if (!page) {
    return (
      <section className="site-section">
        <h1>zyvavu</h1>
        <p>Chưa có trang home đã xuất bản.</p>
      </section>
    )
  }

  return (
    <article className="site-section">
      <h1>{page.title}</h1>
      {page.excerpt ? <p>{page.excerpt}</p> : null}
      <RenderBlocks blocks={page.layout as Array<Record<string, unknown>>} />
    </article>
  )
}
