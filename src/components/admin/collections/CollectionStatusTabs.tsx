'use client'

import type { Where } from 'payload'
import { Tabs } from '@mantine/core'
import { useListQuery } from '@payloadcms/ui'

type StatusFilter = 'all' | 'draft' | 'published'

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
]

export function CollectionStatusTabs({ label = 'Filter documents by status' }: { label?: string }) {
  const { handleWhereChange, query } = useListQuery()
  const where = (query?.where ?? {}) as Where
  const currentStatus = where?._status
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
      aria-label={label}
      className="zyvavu-status-tabs"
      color="brand"
      onChange={setStatus}
      value={activeStatus}
      variant="default"
    >
      <Tabs.List>
        {statusFilters.map(({ label: filterLabel, value }) => (
          <Tabs.Tab key={value} value={value}>
            {filterLabel}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}
