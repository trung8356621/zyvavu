'use client'

import React, { useState } from 'react'
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
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
  filename?: string
}

const mediaCollection: NonNullable<Parameters<typeof useListDrawer>[0]['collectionSlugs']> = ['media']
const mediaFilters = {
  image: { media: { mimeType: { contains: 'image/' } } },
  video: { media: { mimeType: { contains: 'video/' } } },
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
  const [pending, setPending] = useState<SelectedMedia | null>(null)
  const [ListDrawer, , list] = useListDrawer({
    // Payload memoizes the drawer component type using these references.
    collectionSlugs: mediaCollection,
    selectedCollection: 'media',
    uploads: true,
    filterOptions: mediaFilters[kind],
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
    list.closeDrawer()
    document.closeDrawer()
    setError(null)
    setPending(media)
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
        {pending ? (
          <Stack>
            <Text>{pending.filename || pending.url?.split('/').pop()}</Text>
            <Group>
              <Button
                onClick={() => {
                  onSelect(pending)
                  onClose()
                }}
              >
                Use {kind}
              </Button>
              <Button variant="default" onClick={() => setPending(null)}>Choose another</Button>
              <Button variant="subtle" onClick={onClose}>Cancel</Button>
            </Group>
          </Stack>
        ) : (
          <>
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
            {error && <Alert color="red" role="alert">{error}</Alert>}
          </>
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
  renderTrigger?: (props: { label: string; disabled?: boolean; onClick: () => void }) => React.ReactNode
  disabled?: boolean
}) {
  const [opened, setOpened] = useState(false)
  const trigger = {
    label: props.triggerLabel || `Choose ${props.kind} from Media`,
    disabled: props.disabled,
    onClick: () => {
      setOpened(true)
      props.onOpenChange?.(true)
    },
  }
  return opened ? (
    <NativeMediaPicker
      {...props}
      onClose={() => {
        setOpened(false)
        props.onOpenChange?.(false)
      }}
    />
  ) : props.renderTrigger ? props.renderTrigger(trigger) : (
    <Button variant="default" disabled={trigger.disabled} onClick={trigger.onClick}>
      {trigger.label}
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
