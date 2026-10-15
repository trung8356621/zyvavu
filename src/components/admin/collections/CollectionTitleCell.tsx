'use client'

import type { DefaultCellComponentProps } from 'payload'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmationModal, Link, toast, useAuth, useConfig, useModal } from '@payloadcms/ui'

import { canonicalPathFor } from '@/lib/url/paths'

import './collection-title-cell.scss'

export type CollectionTitleCellCustomProps = {
  enableDelete?: boolean
  enableView?: boolean
  showSlug?: boolean
}

function resolvePublicUrl(collectionSlug: string, rowData: Record<string, unknown>): string | null {
  // Only published items can resolve to public canonical URLs; never expose drafts
  if (rowData._status !== 'published') return null

  const slug = typeof rowData.slug === 'string' ? rowData.slug.trim() : null
  if (!slug) return null

  const publicPath = typeof rowData.publicPath === 'string' ? rowData.publicPath.trim() : null

  try {
    if (collectionSlug === 'pages') {
      return canonicalPathFor('page', slug, publicPath)
    }
    if (collectionSlug === 'posts') {
      return canonicalPathFor('post', slug, publicPath)
    }
  } catch {
    return null
  }

  return null
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
  const enableView = configProps.enableView ?? (collectionSlug === 'posts' || collectionSlug === 'pages')
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
  const slug = typeof rowData?.slug === 'string' && rowData.slug.trim() ? rowData.slug : null
  const publicPath = typeof rowData?.publicPath === 'string' && rowData.publicPath.trim() ? rowData.publicPath : null
  const displaySlug = publicPath || (slug ? `/${slug}` : null)

  // Robust edit URL resolution: use linkURL if provided by Payload, otherwise construct via verified admin route
  const editURL =
    linkURL || `${adminRoute}/collections/${collectionSlug}/${encodeURIComponent(String(rowData?.id))}`

  const publicURL = enableView ? resolvePublicUrl(collectionSlug, (rowData || {}) as Record<string, unknown>) : null
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
        {showSlug && displaySlug ? <span className="zyvavu-title-cell__slug">{displaySlug}</span> : null}
      </div>

      <div aria-label="Row actions" className="zyvavu-row-actions">
        <Link className="zyvavu-row-action zyvavu-row-action--edit" href={editURL} prefetch={false}>
          Edit
        </Link>

        {publicURL ? (
          <>
            <span aria-hidden="true" className="zyvavu-row-actions__sep">
              |
            </span>
            <a
              className="zyvavu-row-action zyvavu-row-action--view"
              href={publicURL}
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
