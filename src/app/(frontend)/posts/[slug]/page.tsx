import React from 'react'

import { PublicDocument } from '@/components/frontend/PublicDocument'

export default async function PostBySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PublicDocument path={`/posts/${slug}`} />
}
