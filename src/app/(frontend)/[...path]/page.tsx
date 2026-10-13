import React from 'react'

import { PublicDocument } from '@/components/frontend/PublicDocument'

export default async function PublicPathPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <PublicDocument path={`/${path.join('/')}`} />
}
