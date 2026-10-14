'use client'

import type { ListViewClientProps } from 'payload'
import { DefaultListView } from '@payloadcms/ui'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'

export function PagesListView(props: ListViewClientProps) {
  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <CollectionListHeader
            collectionLabel="Pages"
            collectionSlug="pages"
            description="Manage standalone site pages, structure, and landing content."
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          />
          {props.BeforeList}
        </>
      }
    />
  )
}
