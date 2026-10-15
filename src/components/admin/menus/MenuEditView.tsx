import React from 'react'
import { notFound } from 'next/navigation'
import type { DocumentViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'

import { isSiteStaff } from '@/access/roles'
import { MenuEditor, type MenuDoc } from './MenuEditor'

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

  const rawId = props.id || (props.params as any)?.id
  const isCreate = !rawId || rawId === 'create'
  let menuDoc: MenuDoc = {
    name: '',
    location: 'header',
    mode: 'classic',
    items: [],
  }

  if (!isCreate) {
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

  const visibleEntities = props.initPageResult?.visibleEntities || { collections: {}, globals: {} }

  return (
    <DefaultTemplate
      {...props}
      collectionSlug="menus"
      docID={isCreate ? undefined : String(rawId)}
      payload={payload}
      req={req}
      user={user || undefined}
      visibleEntities={visibleEntities}
    >
      <MenuEditor
        initialDoc={menuDoc}
        enableMegaMenu={enableMegaMenu}
        menuId={isCreate ? 'create' : rawId}
      />
    </DefaultTemplate>
  )
}
