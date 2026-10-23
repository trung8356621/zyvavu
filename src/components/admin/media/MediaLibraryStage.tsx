'use client'

import { ListSelection, useAuth, useConfig, useListQuery, useSelection } from '@payloadcms/ui'
import { Alert, Grid, Stack } from '@mantine/core'
import { MediaLibraryNavigation } from './MediaLibraryNavigation'
import { mediaKindWhere, type LibraryView } from './mediaLibraryQuery'
import React, { useLayoutEffect, useState } from 'react'

import { MediaGridSkeleton, MediaGridView } from './MediaGridView'
import { MediaLibraryViewSwitcher } from './MediaLibraryViewSwitcher'
import { writeMediaLibraryView, type MediaLibraryView } from './mediaLibraryPreference'
import { DemoMediaGallery } from './DemoMediaGallery'
import type { MediaListDoc } from './mediaThumbnail'

type MediaLibraryStageProps = {
  demoKind: 'image' | 'video' | null
  onDemoChange: (kind: 'image' | 'video' | null) => void
  view: MediaLibraryView
}

export function MediaLibraryStage({ view, demoKind, onDemoChange }: MediaLibraryStageProps) {
  const { data, query, handleWhereChange } = useListQuery()
  const [filterError, setFilterError] = useState(false)
  const { count } = useSelection()
  const { getEntityConfig, config } = useConfig()
  const { permissions } = useAuth()
  const collectionConfig = getEntityConfig({ collectionSlug: 'media' })
  const docs = (data?.docs ?? []) as MediaListDoc[]

  useLayoutEffect(() => {
    const root = document.querySelector('.collection-list--media')
    if (!root) return
    root.setAttribute('data-media-view', view)
    root.toggleAttribute('data-media-demo', !!demoKind)
    return () => {
      root.removeAttribute('data-media-demo')
      root.removeAttribute('data-media-view')
    }
  }, [view, demoKind])

  return (
    <>
      <div className="zyvavu-media-view-bar">
        <MediaLibraryViewSwitcher onChange={writeMediaLibraryView} value={view} />
      </div>
      {!demoKind && view === 'grid' && count > 0 && collectionConfig ? (
        <div className="zyvavu-media-grid-selection">
          <ListSelection collectionConfig={collectionConfig} label="media" where={query?.where} />
        </div>
      ) : null}
      <Grid gap="md">
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <MediaLibraryNavigation
            value={
              demoKind
                ? `demo-${demoKind}`
                : (query?.where?.mimeType as { contains?: string })?.contains === 'image/'
                  ? 'image'
                  : (query?.where?.mimeType as { contains?: string })?.contains === 'video/'
                    ? 'video'
                    : 'all'
            }
            onChange={(kind: LibraryView) => {
              if (kind === 'demo-image' || kind === 'demo-video') {
                onDemoChange(kind === 'demo-image' ? 'image' : 'video')
                return
              }
              onDemoChange(null)
              setFilterError(false)
              void handleWhereChange?.(mediaKindWhere(query?.where, kind)).catch(() =>
                setFilterError(true),
              )
            }}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 9 }}>
          <Stack>
            {filterError && (
              <Alert color="red" role="alert">
                Unable to update media filter. Please retry.
              </Alert>
            )}
            {demoKind && (
              <DemoMediaGallery
                useAfterImport={false}
                kind={demoKind}
                api={config.routes.api}
                canImport={!!permissions?.collections?.media?.create}
                onSelect={() => {
                  onDemoChange(null)
                  void handleWhereChange?.(query?.where || {}).catch(() => setFilterError(true))
                }}
              />
            )}
            {!demoKind && view === 'grid' && data == null ? <MediaGridSkeleton /> : null}
            {!demoKind && view === 'grid' && docs.length > 0 ? <MediaGridView docs={docs} /> : null}
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  )
}
