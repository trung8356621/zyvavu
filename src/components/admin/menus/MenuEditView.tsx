import React from 'react'
import { notFound } from 'next/navigation'
import type { DocumentViewServerProps } from 'payload'

import { isSiteStaff } from '@/access/roles'
import { MenuEditor, type MenuDoc } from './MenuEditor'

export function resolveMenuDocumentId(props: Partial<DocumentViewServerProps>): {
  id: string | number | undefined
  isCreate: boolean
} {
  const docIDFromInit = props.initPageResult?.docID
  const docIDFromDoc = props.doc?.id !== undefined ? props.doc.id : undefined

  const segments = props.routeSegments || (props.params as any)?.segments
  const lastSegment =
    Array.isArray(segments) && segments.length > 0 ? segments[segments.length - 1] : undefined

  if (lastSegment === 'create') {
    return { id: undefined, isCreate: true }
  }

  const rawId =
    docIDFromInit !== undefined
      ? docIDFromInit
      : docIDFromDoc !== undefined
        ? docIDFromDoc
        : lastSegment

  if (rawId === undefined || rawId === 'create' || rawId === '') {
    return { id: undefined, isCreate: true }
  }

  return { id: rawId, isCreate: false }
}

export async function MenuEditView(props: DocumentViewServerProps) {
  const req = props.initPageResult?.req
  const user = req?.user
  const payload = req?.payload || props.payload

  if (!isSiteStaff(user)) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Forbidden. Menus editing is limited to site-admin and system-admin.</p>
      </div>
    )
  }

  const { id: rawId, isCreate } = resolveMenuDocumentId(props)
  let menuDoc: MenuDoc = {
    name: '',
    location: 'header',
    mode: 'classic',
    items: [],
  }

  if (!isCreate) {
    if (props.doc && String(props.doc.id) === String(rawId)) {
      menuDoc = props.doc as unknown as MenuDoc
    } else {
      try {
        const doc = await payload.findByID({
          collection: 'menus',
          id: Number(rawId) || String(rawId),
          depth: 1,
          overrideAccess: false,
          user: user as any,
        })
        if (!doc) {
          notFound()
        }
        menuDoc = doc as unknown as MenuDoc
      } catch {
        notFound()
      }
    }
  }

  let enableMegaMenu = false
  try {
    const settings = await payload.findGlobal({
      slug: 'settings',
      depth: 0,
      overrideAccess: true,
    })
    enableMegaMenu = Boolean((settings as any)?.enableMegaMenu)
  } catch {
    enableMegaMenu = false
  }

  return (
    <MenuEditor
      initialDoc={menuDoc}
      enableMegaMenu={enableMegaMenu}
      menuId={isCreate ? 'create' : rawId}
    />
  )
}
