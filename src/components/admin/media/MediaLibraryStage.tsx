'use client'

import { ListSelection, useConfig, useListQuery, useSelection } from '@payloadcms/ui'
import React, { useLayoutEffect } from 'react'

import { MediaGridSkeleton, MediaGridView } from './MediaGridView'
import { MediaLibraryViewSwitcher } from './MediaLibraryViewSwitcher'
import { writeMediaLibraryView, type MediaLibraryView } from './mediaLibraryPreference'
import type { MediaListDoc } from './mediaThumbnail'

type MediaLibraryStageProps = {
  view: MediaLibraryView
}

export function MediaLibraryStage({ view }: MediaLibraryStageProps) {
  const { data, query } = useListQuery()
  const { count } = useSelection()
  const { getEntityConfig } = useConfig()
  const collectionConfig = getEntityConfig({ collectionSlug: 'media' })
  const docs = (data?.docs ?? []) as MediaListDoc[]

  useLayoutEffect(() => {
    const root = document.querySelector('.collection-list--media')
    if (!root) return
    root.setAttribute('data-media-view', view)
    return () => root.removeAttribute('data-media-view')
  }, [view])

  return (
    <>
      <div className="zyvavu-media-view-bar">
        <MediaLibraryViewSwitcher onChange={writeMediaLibraryView} value={view} />
      </div>
      {view === 'grid' && count > 0 && collectionConfig ? (
        <div className="zyvavu-media-grid-selection">
          <ListSelection collectionConfig={collectionConfig} label="media" where={query?.where} />
        </div>
      ) : null}
      {view === 'grid' && data == null ? <MediaGridSkeleton /> : null}
      {view === 'grid' && docs.length > 0 ? <MediaGridView docs={docs} /> : null}
    </>
  )
}
