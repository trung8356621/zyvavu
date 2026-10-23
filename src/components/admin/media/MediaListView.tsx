'use client'

import type { ListViewClientProps } from 'payload'
import { Button } from '@mantine/core'
import { DefaultListView, Link, useBulkUpload, useModal } from '@payloadcms/ui'
import React, { useState, useSyncExternalStore } from 'react'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'

import { MediaLibraryStage } from './MediaLibraryStage'
import {
  getServerMediaLibraryView,
  readMediaLibraryView,
  subscribeMediaLibraryView,
} from './mediaLibraryPreference'

import './media-library.scss'

function MediaActions({
  hasCreatePermission,
  newDocumentURL,
}: {
  hasCreatePermission: boolean
  newDocumentURL?: string
}) {
  const { drawerSlug, setCollectionSlug } = useBulkUpload()
  const { openModal } = useModal()

  const handleBulkUpload = () => {
    setCollectionSlug('media')
    openModal(drawerSlug)
  }

  if (!hasCreatePermission) return null

  return (
    <div className="zyvavu-collection-header__actions">
      <Button
        className="zyvavu-collection-header__bulk-upload"
        color="brand"
        onClick={handleBulkUpload}
        type="button"
        variant="outline"
      >
        Bulk Upload
      </Button>
      {newDocumentURL ? (
        <Button
          className="zyvavu-collection-header__create"
          color="brand"
          component={Link}
          href={newDocumentURL}
          prefetch={false}
          variant="filled"
        >
          Create New
        </Button>
      ) : null}
    </div>
  )
}

export function MediaListView(props: ListViewClientProps) {
  const [demoKind, setDemoKind] = useState<'image' | 'video' | null>(null)
  const view = useSyncExternalStore(
    subscribeMediaLibraryView,
    readMediaLibraryView,
    getServerMediaLibraryView,
  )

  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <CollectionListHeader
            actions={
              <MediaActions
                hasCreatePermission={props.hasCreatePermission}
                newDocumentURL={props.newDocumentURL}
              />
            }
            breadcrumbGroup="Content"
            collectionLabel="Media"
            collectionSlug="media"
            description="Upload and manage site images, assets, and binary files."
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          />
          {props.BeforeList}
        </>
      }
      BeforeListTable={
        <>
          <MediaLibraryStage view={view} demoKind={demoKind} onDemoChange={setDemoKind} />
          {props.BeforeListTable}
        </>
      }
      Table={!demoKind && view === 'table' ? props.Table : null}
    />
  )
}
