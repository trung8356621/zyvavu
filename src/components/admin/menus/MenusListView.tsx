'use client'

import type { ListViewClientProps } from 'payload'
import { DefaultListView } from '@payloadcms/ui'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'

export function MenusListView(props: ListViewClientProps) {
  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <CollectionListHeader
            breadcrumbGroup="Appearance"
            collectionLabel="Menus"
            collectionSlug="menus"
            description="Manage site navigation menus and link hierarchy."
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          />
          {props.BeforeList}
        </>
      }
    />
  )
}
