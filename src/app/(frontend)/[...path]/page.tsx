import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import { PublicDocument } from '@/components/frontend/PublicDocument'
import { generateRouteMetadata } from '@/lib/seo'
import config from '@/payload.config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>
}): Promise<Metadata> {
  const { path } = await params
  const payload = await getPayload({ config })
  return generateRouteMetadata(payload, `/${path.join('/')}`)
}

export default async function PublicPathPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <PublicDocument path={`/${path.join('/')}`} />
}
