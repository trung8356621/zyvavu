'use client'

import type { ListViewClientProps } from 'payload'
import { DefaultListView } from '@payloadcms/ui'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'

export function UrlRegistryListView(props: ListViewClientProps) {
  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <CollectionListHeader
            breadcrumbGroup="System"
            collectionLabel="URL Registry"
            collectionSlug="url-registry"
            description="Flat indexed route registry for canonical paths, redirects, and collision prevention."
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          />
          {props.BeforeList}
        </>
      }
    />
  )
}
