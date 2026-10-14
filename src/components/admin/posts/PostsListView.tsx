'use client'

import type { ListViewClientProps, Where } from 'payload'
import { Tabs } from '@mantine/core'
import { DefaultListView, useListQuery } from '@payloadcms/ui'

import { CollectionListHeader } from '@/components/admin/collections/CollectionListHeader'

type StatusFilter = 'all' | 'draft' | 'published'

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
]

function PostsStatusTabs() {
  const { handleWhereChange, query } = useListQuery()
  const where = (query.where ?? {}) as Where
  const currentStatus = where._status
  const statusValue =
    currentStatus && typeof currentStatus === 'object' && 'equals' in currentStatus
      ? currentStatus.equals
      : undefined
  const activeStatus: StatusFilter =
    statusValue === 'draft' || statusValue === 'published' ? statusValue : 'all'

  const setStatus = async (status: string | null) => {
    if (!handleWhereChange || !status || status === activeStatus) return

    const nextWhere: Where = { ...where }
    delete nextWhere._status

    if (status !== 'all') {
      nextWhere._status = { equals: status }
    }

    await handleWhereChange(nextWhere)
  }

  return (
    <Tabs
      aria-label="Filter posts by status"
      className="zyvavu-status-tabs"
      color="brand"
      onChange={setStatus}
      value={activeStatus}
      variant="default"
    >
      <Tabs.List>
        {statusFilters.map(({ label, value }) => (
          <Tabs.Tab key={value} value={value}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}

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
            <PostsStatusTabs />
          </CollectionListHeader>
          {props.BeforeList}
        </>
      }
    />
  )
}
