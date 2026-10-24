'use client'

import React, { useState } from 'react'
import { Alert, Button, Group, Modal } from '@mantine/core'
import { useAuth, useConfig, useDocumentDrawer, useListDrawer } from '@payloadcms/ui'

import './media-library.scss'
import { DemoMediaGallery } from './DemoMediaGallery'
import { MediaBrowser } from './MediaBrowser'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'

export type SelectedMedia = {
  id: number | string
  url?: string
  mimeType?: string
  posterUrl?: string
  posterMediaId?: number | string
}

// Mount native drawers only on demand; their providers remain owned by Payload.
function NativeMediaPicker({
  kind,
  onSelect,
  onClose,
}: {
  kind: 'image' | 'video'
  onSelect: (doc: SelectedMedia) => void
  onClose: () => void
}) {
  const { config } = useConfig()
  const { permissions } = useAuth()
  const canCreate = !!permissions?.collections?.media?.create
  const [error, setError] = useState<string | null>(null)
  const [ListDrawer, , list] = useListDrawer({
    collectionSlugs: ['media'],
    selectedCollection: 'media',
    uploads: true,
    filterOptions: { media: { mimeType: { contains: `${kind}/` } } },
  })
  const [DocumentDrawer, , document] = useDocumentDrawer({ collectionSlug: 'media' })
  const select = ({ doc }: { doc: unknown }) => {
    const media = doc as SelectedMedia
    if (!media?.id || !media.url || !media.mimeType?.startsWith(`${kind}/`)) {
      list.closeDrawer()
      document.closeDrawer()
      setError(`Choose a valid ${kind} with an available file.`)
      return
    }
    onSelect(media)
    list.closeDrawer()
    document.closeDrawer()
    onClose()
  }
  return (
    <>
      <Modal
        opened={!list.isDrawerOpen && !document.isDrawerOpen}
        onClose={onClose}
        title={`Choose ${kind}`}
        size="min(90vw, 1400px)"
        classNames={{ content: 'zyvavu-media-picker', body: 'zyvavu-media-picker__body' }}
        styles={{
          content: { height: '88dvh', display: 'flex', flexDirection: 'column' },
          header: { flexShrink: 0 },
          body: { flex: 1, minHeight: 0, overflow: 'auto' },
        }}
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
      >
        <MediaBrowser
          canImport={canCreate}
          api={config.routes.api}
          kind={kind}
          onSelect={(doc) => select({ doc })}
          onCancel={onClose}
          upload={
            canCreate ? (
              <Button variant="light" onClick={document.openDrawer}>
                Upload {kind}
              </Button>
            ) : undefined
          }
        />
        <Group mt="md" className="zyvavu-media-picker__actions">
          <Button variant="default" onClick={list.openDrawer}>
            Browse My Media
          </Button>

          <Button variant="subtle" onClick={onClose}>
            Close media actions
          </Button>
        </Group>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
      </Modal>
      <ListDrawer onSelect={select} />
      <DocumentDrawer onSave={select} />
    </>
  )
}

export function MediaSourcePicker(props: {
  kind: 'image' | 'video'
  onSelect: (doc: SelectedMedia) => void
  onOpenChange?: (opened: boolean) => void
  triggerLabel?: string
  disabled?: boolean
}) {
  const [opened, setOpened] = useState(false)
  return opened ? (
    <NativeMediaPicker
      {...props}
      onClose={() => {
        setOpened(false)
        props.onOpenChange?.(false)
      }}
    />
  ) : (
    <Button
      variant="default"
      disabled={props.disabled}
      onClick={() => {
        setOpened(true)
        props.onOpenChange?.(true)
      }}
    >
      {props.triggerLabel || `Choose ${props.kind} from Media`}
    </Button>
  )
}

/** Inline Background-tab gallery; importing accepts only the parent's draft. */
export function BackgroundVideoPresets({ onSelect }: { onSelect: (doc: SelectedMedia) => void }) {
  const { config } = useConfig()
  const { permissions } = useAuth()
  return (
    <DemoMediaGallery
      kind="video"
      api={config.routes.api}
      canImport={!!permissions?.collections?.media?.create}
      onSelect={onSelect}
    />
  )
}
