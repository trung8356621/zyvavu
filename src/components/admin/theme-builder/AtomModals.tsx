'use client'
import React from 'react'
import { Text } from '@mantine/core'
import { SharedDraggableModal } from '@/components/admin/shared/SharedDraggableModal'
export type AtomModalRequest = {
  id: string
  type: string
  kind: 'settings' | 'link'
  anchor: HTMLElement
}
type Props = { request: AtomModalRequest; onClose: () => void }
function Shell({ request, onClose, title }: Props & { title: string }) {
  return (
    <SharedDraggableModal
      opened
      onClose={onClose}
      title={title}
      subtitle={`${request.type} · ${request.id}`}
      anchorEl={request.anchor}
      draggable
    >
      <Text size="sm" c="dimmed">
        {request.kind === 'link'
          ? 'Link configuration is reserved for a future update.'
          : 'Detailed settings are reserved for a future update.'}
      </Text>
    </SharedDraggableModal>
  )
}
export function HeadingSettings(props: Props) {
  return <Shell {...props} title="Heading Settings" />
}
export function TextSettings(props: Props) {
  return <Shell {...props} title="Text Settings" />
}
export function ButtonSettings(props: Props) {
  return <Shell {...props} title="Button Settings" />
}
export function ImageSettings(props: Props) {
  return <Shell {...props} title="Image Settings" />
}
export function SharedLinkModal(props: Props) {
  return <Shell {...props} title="Link" />
}
export function AtomModal(props: Props) {
  if (props.request.kind === 'link') return <SharedLinkModal {...props} />
  const Component = {
    Heading: HeadingSettings,
    Text: TextSettings,
    Button: ButtonSettings,
    Image: ImageSettings,
  }[props.request.type]
  return Component ? <Component {...props} /> : null
}
