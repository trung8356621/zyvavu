'use client'

import type { ReactNode } from 'react'
import { Badge, Button } from '@mantine/core'
import { Link, useListQuery } from '@payloadcms/ui'

import './collection-list.scss'

export type CollectionListHeaderProps = {
  actions?: ReactNode
  breadcrumbGroup?: string
  children?: ReactNode
  collectionLabel: string
  collectionSlug: string
  description?: string
  hasCreatePermission: boolean
  newDocumentURL?: string
}

export function CollectionListHeader({
  actions,
  breadcrumbGroup = 'Content',
  children,
  collectionLabel,
  collectionSlug,
  description,
  hasCreatePermission,
  newDocumentURL,
}: CollectionListHeaderProps) {
  const { data } = useListQuery()
  const documentCount = data?.totalDocs ?? 0

  return (
    <header className="zyvavu-collection-header" data-collection={collectionSlug}>
      <nav aria-label="Breadcrumb" className="zyvavu-collection-header__breadcrumb">
        <span>{breadcrumbGroup}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{collectionLabel}</span>
      </nav>

      <div className="zyvavu-collection-header__main">
        <div className="zyvavu-collection-header__info">
          <div className="zyvavu-collection-header__title-row">
            <h1 className="zyvavu-collection-header__title">{collectionLabel}</h1>
            <Badge color="gray" variant="light">
              {documentCount} {documentCount === 1 ? 'document' : 'documents'}
            </Badge>
          </div>
          {description ? <p className="zyvavu-collection-header__description">{description}</p> : null}
        </div>

        {actions ? (
          <div className="zyvavu-collection-header__actions">{actions}</div>
        ) : hasCreatePermission && newDocumentURL ? (
          <Button
            className="zyvavu-collection-header__create"
            color="brand"
            component={Link}
            href={newDocumentURL}
            prefetch={false}
            variant="filled"
          >
            Create New
          </Button>
        ) : null}
      </div>

      {children ? <div className="zyvavu-collection-header__extra">{children}</div> : null}
    </header>
  )
}
