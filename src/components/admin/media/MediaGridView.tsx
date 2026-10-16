'use client'

import { useConfig, useSelection } from '@payloadcms/ui'
import React from 'react'

import { MediaGridCard } from './MediaGridCard'
import type { MediaListDoc } from './mediaThumbnail'

type MediaGridViewProps = {
  docs: MediaListDoc[]
}

export function MediaGridSkeleton() {
  return (
    <div aria-hidden="true" className="zyvavu-media-grid">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="zyvavu-media-card zyvavu-media-card--skeleton" key={index}>
          <div className="zyvavu-media-card__frame" />
          <div className="zyvavu-media-card__meta">
            <span className="zyvavu-media-card__skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MediaGridView({ docs }: MediaGridViewProps) {
  const { selected, setSelection } = useSelection()
  const {
    config: {
      routes: { admin: adminRoute = '/admin' },
    },
  } = useConfig()

  return (
    <div className="zyvavu-media-grid">
      {docs.map((doc) => (
        <MediaGridCard
          doc={doc}
          href={`${adminRoute}/collections/media/${doc.id}`}
          key={String(doc.id)}
          onToggleSelect={setSelection}
          selected={selected.get(doc.id) === true}
        />
      ))}
    </div>
  )
}
