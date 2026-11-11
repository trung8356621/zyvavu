'use client'

import React, { useState } from 'react'
import { Alert, Button, Modal } from '@mantine/core'
import { useAuth, useConfig, useDocumentDrawer, useListDrawer } from '@payloadcms/ui'

import './media-library.scss'
import { DemoMediaGallery } from './DemoMediaGallery'
import { MediaBrowser } from './MediaBrowser'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import type { IconRef } from '@/lib/icons'

export type SelectedMedia = {
  id: number | string
  url?: string
  mimeType?: string
  posterUrl?: string
  posterMediaId?: number | string
  filename?: string
}

export type MediaPickerKind = 'image' | 'video' | 'icon'

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
  icon,
}: {
  kind: 'image' | 'video'
  onSelect: (doc: SelectedMedia) => void
  onClose: () => void
  icon?: { value?: IconRef | null; onSelect: (value: IconRef) => void }
}) {
  const { config } = useConfig()
  const { permissions } = useAuth()
  const canCreate = !!permissions?.collections?.media?.create
  const [error, setError] = useState<string | null>(null)
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
    onSelect(media)
    onClose()
  }
  return (
    <>
      <Modal
        opened={!list.isDrawerOpen && !document.isDrawerOpen}
        onClose={onClose}
        title={icon ? 'Media Library' : `Choose ${kind}`}
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
          icons={icon && {
            value: icon.value,
            onSelect: (value) => {
              icon.onSelect(value)
              onClose()
            },
          }}
          upload={
            canCreate ? (
              <Button variant="light" onClick={document.openDrawer}>
                Upload {kind}
              </Button>
            ) : undefined
          }
          browse={<Button variant="default" onClick={list.openDrawer}>Browse My Media</Button>}
        />
        {error && <Alert mt="sm" color="red" role="alert">{error}</Alert>}
      </Modal>
      <ListDrawer onSelect={select} />
      <DocumentDrawer onSave={select} />
    </>
  )
}

type MediaSourcePickerImageVideoProps = {
  kind: 'image' | 'video'
  onSelect: (doc: SelectedMedia) => void
  onOpenChange?: (opened: boolean) => void
  triggerLabel?: string
  renderTrigger?: (props: { label: string; disabled?: boolean; onClick: () => void }) => React.ReactNode
  disabled?: boolean
}

type MediaSourcePickerIconProps = {
  kind: 'icon'
  onSelect: (icon: IconRef) => void
  value?: IconRef | null
  onOpenChange?: (opened: boolean) => void
  triggerLabel?: string
  renderTrigger?: (props: { label: string; disabled?: boolean; onClick: () => void }) => React.ReactNode
  disabled?: boolean
}

export type MediaSourcePickerProps = MediaSourcePickerImageVideoProps | MediaSourcePickerIconProps

export function MediaSourcePicker(props: MediaSourcePickerProps) {
  const [opened, setOpened] = useState(false)
  const trigger = {
    label:
      props.triggerLabel ||
      (props.kind === 'icon' ? 'Choose from Media Library' : `Choose ${props.kind} from Media`),
    disabled: props.disabled,
    onClick: () => {
      setOpened(true)
      props.onOpenChange?.(true)
    },
  }
  const close = () => {
    setOpened(false)
    props.onOpenChange?.(false)
  }

  if (!opened) {
    return props.renderTrigger ? (
      props.renderTrigger(trigger)
    ) : (
      <Button variant="default" disabled={trigger.disabled} onClick={trigger.onClick}>
        {trigger.label}
      </Button>
    )
  }

  if (props.kind === 'icon') {
    return (
      <NativeMediaPicker
        kind="image"
        icon={props}
        onSelect={(media) => props.onSelect({
          source: 'media',
          mediaId: media.id,
          mediaUrl: media.url,
          mediaFilename: media.filename,
          recolorable: false,
        })}
        onClose={close}
      />
    )
  }

  return <NativeMediaPicker kind={props.kind} onSelect={props.onSelect} onClose={close} />
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
