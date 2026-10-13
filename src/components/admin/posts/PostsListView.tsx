'use client'

import type { ListViewClientProps, Where } from 'payload'

import { DefaultListView, Link, useListQuery } from '@payloadcms/ui'

import './posts-list.scss'

type StatusFilter = 'all' | 'draft' | 'published'

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
]

function PostsListHeader({
  hasCreatePermission,
  newDocumentURL,
}: Pick<ListViewClientProps, 'hasCreatePermission' | 'newDocumentURL'>) {
  const { data, handleWhereChange, query } = useListQuery()
  const where = (query.where ?? {}) as Where
  const currentStatus = where._status
  const statusValue =
    currentStatus && typeof currentStatus === 'object' && 'equals' in currentStatus
      ? currentStatus.equals
      : undefined
  const activeStatus: StatusFilter =
    statusValue === 'draft' || statusValue === 'published' ? statusValue : 'all'
  const documentCount = data?.totalDocs ?? 0

  const setStatus = async (status: StatusFilter) => {
    if (!handleWhereChange || status === activeStatus) return

    const nextWhere: Where = { ...where }
    delete nextWhere._status

    if (status !== 'all') {
      nextWhere._status = { equals: status }
    }

    await handleWhereChange(nextWhere)
  }

  return (
    <header className="zyvavu-posts-header">
      <nav aria-label="Breadcrumb" className="zyvavu-posts-header__breadcrumb">
        <span>Content</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Posts</span>
      </nav>

      <div className="zyvavu-posts-header__main">
        <div>
          <div className="zyvavu-posts-header__title-row">
            <h1>Posts</h1>
            <span className="zyvavu-posts-header__count">
              {documentCount} {documentCount === 1 ? 'document' : 'documents'}
            </span>
          </div>
          <p>Manage published stories and works in progress.</p>
        </div>

        {hasCreatePermission && (
          <Link className="zyvavu-posts-header__create" href={newDocumentURL} prefetch={false}>
            Create New
          </Link>
        )}
      </div>

      <div aria-label="Filter posts by status" className="zyvavu-posts-header__tabs" role="group">
        {statusFilters.map(({ label, value }) => (
          <button
            aria-pressed={activeStatus === value}
            className={activeStatus === value ? 'is-active' : undefined}
            key={value}
            onClick={() => void setStatus(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}

export function PostsListView(props: ListViewClientProps) {
  return (
    <DefaultListView
      {...props}
      BeforeList={
        <>
          <PostsListHeader
            hasCreatePermission={props.hasCreatePermission}
            newDocumentURL={props.newDocumentURL}
          />
          {props.BeforeList}
        </>
      }
    />
  )
}
