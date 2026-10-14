'use client'

import type { ListViewClientProps } from 'payload'
import { DefaultListView } from '@payloadcms/ui'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'

export function UsersListView(props: ListViewClientProps) {
  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <CollectionListHeader
            breadcrumbGroup="System"
            collectionLabel="Users"
            collectionSlug="users"
            description="Manage administrator accounts and system access roles."
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          />
          {props.BeforeList}
        </>
      }
    />
  )
}
