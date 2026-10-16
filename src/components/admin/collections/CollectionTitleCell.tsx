'use client'

import type { DefaultCellComponentProps } from 'payload'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmationModal, Link, toast, useAuth, useConfig, useModal } from '@payloadcms/ui'

import './collection-title-cell.scss'

export type CollectionTitleCellCustomProps = {
  enableDelete?: boolean
  enableView?: boolean
  showSlug?: boolean
}

function isPublicResource(collectionSlug: string, rowData: Record<string, unknown>): boolean {
  if (collectionSlug === 'posts') {
    return rowData?._status === 'published' && Boolean(rowData?.slug)
  }
  if (collectionSlug === 'pages') {
    return rowData?._status === 'published' && rowData?.visibility !== 'private' && Boolean(rowData?.slug)
  }
  if (collectionSlug === 'categories' || collectionSlug === 'tags') {
    return Boolean(rowData?.slug)
  }
  return true
}

export function CollectionTitleCell({
  cellData,
  collectionSlug,
  customCellProps,
  linkURL,
  rowData,
}: DefaultCellComponentProps) {
  const router = useRouter()
  const { openModal } = useModal()
  const { permissions } = useAuth()
  const {
    config: {
      routes: { admin: adminRoute = '/admin', api: apiRoute = '/api' },
      serverURL = '',
    },
  } = useConfig()

  const configProps = (customCellProps as CollectionTitleCellCustomProps) || {}
  const showSlug = configProps.showSlug !== false
  const enableDelete = configProps.enableDelete !== false

  // Permission check for delete
  const collectionPerms = permissions?.collections?.[collectionSlug] as
    | { delete?: boolean | { permission?: boolean } }
    | undefined
  const hasDeletePermission =
    collectionPerms?.delete === true ||
    (typeof collectionPerms?.delete === 'object' && collectionPerms?.delete?.permission === true) ||
    collectionPerms?.delete === undefined // fallback if permissions not populated

  const title = typeof cellData === 'string' && cellData.trim() ? cellData : 'Untitled'
  const isPublic = isPublicResource(collectionSlug, (rowData || {}) as Record<string, unknown>)

  // Established canonical URL returned by URL Registry
  const canonicalPath =
    isPublic && typeof rowData?.canonicalPath === 'string' && rowData.canonicalPath.trim().startsWith('/')
      ? rowData.canonicalPath.trim()
      : null

  // Path displayed under title: prefer resolved canonical public URL, fallback to publicPath/slug for drafts
  const fallbackSlug =
    typeof rowData?.publicPath === 'string' && rowData.publicPath.trim()
      ? rowData.publicPath.trim()
      : typeof rowData?.slug === 'string' && rowData.slug.trim()
        ? `/${rowData.slug.trim()}`
        : null
  const displayPath = canonicalPath || fallbackSlug

  // View action is enabled if allowed by config, resource is public, and a valid canonical route exists
  const canView = configProps.enableView !== false && isPublic && Boolean(canonicalPath)

  // Robust edit URL resolution: use linkURL if provided by Payload, otherwise construct via verified admin route
  const editURL =
    linkURL || `${adminRoute}/collections/${collectionSlug}/${encodeURIComponent(String(rowData?.id))}`

  const modalSlug = `delete-${collectionSlug}-${rowData?.id}`

  const handleDelete = async () => {
    try {
      const res = await fetch(`${serverURL}${apiRoute}/${collectionSlug}/${rowData?.id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success(`Deleted ${title}`)
        router.refresh()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData?.errors?.[0]?.message || `Failed to delete ${title}`)
      }
    } catch {
      toast.error(`Failed to delete ${title}`)
    }
  }

  const openDeleteConfirmation = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openModal(modalSlug)
  }

  return (
    <div className="zyvavu-title-cell">
      <div className="zyvavu-title-cell__main">
        <Link className="zyvavu-title-cell__link" href={editURL} prefetch={false}>
          <span className="zyvavu-title-cell__title">{title}</span>
        </Link>
        {showSlug && displayPath ? <span className="zyvavu-title-cell__slug">{displayPath}</span> : null}
      </div>

      <div aria-label="Row actions" className="zyvavu-row-actions">
        <Link className="zyvavu-row-action zyvavu-row-action--edit" href={editURL} prefetch={false}>
          Edit
        </Link>

        {canView && canonicalPath ? (
          <>
            <span aria-hidden="true" className="zyvavu-row-actions__sep">
              |
            </span>
            <a
              className="zyvavu-row-action zyvavu-row-action--view"
              href={canonicalPath}
              rel="noopener noreferrer"
              target="_blank"
            >
              View
            </a>
          </>
        ) : null}

        {enableDelete && hasDeletePermission ? (
          <>
            <span aria-hidden="true" className="zyvavu-row-actions__sep">
              |
            </span>
            <button
              className="zyvavu-row-action zyvavu-row-action--delete"
              onClick={openDeleteConfirmation}
              type="button"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>

      {enableDelete && hasDeletePermission ? (
        <ConfirmationModal
          body={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
          cancelLabel="Cancel"
          confirmLabel="Delete"
          heading="Confirm Deletion"
          modalSlug={modalSlug}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}
