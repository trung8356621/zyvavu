'use client'

import type { ListViewClientProps } from 'payload'
import { DefaultListView } from '@payloadcms/ui'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'
import { CollectionStatusTabs } from '@/components/admin/collections/CollectionStatusTabs'

export function PostsListView(props: ListViewClientProps) {
  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <CollectionListHeader
            collectionLabel="Posts"
            collectionSlug="posts"
            description="Manage published stories and works in progress."
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          >
            <CollectionStatusTabs label="Filter posts by status" />
          </CollectionListHeader>
          {props.BeforeList}
        </>
      }
    />
  )
}
