import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import { PublicDocument } from '@/components/frontend/PublicDocument'
import { generateRouteMetadata } from '@/lib/seo'
import config from '@/payload.config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })
  return generateRouteMetadata(payload, `/posts/${slug}`)
}

export default async function PostBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PublicDocument path={`/posts/${slug}`} />
}
