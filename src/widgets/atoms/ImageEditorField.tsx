'use client'

import React from 'react'
import type { CustomField } from '@puckeditor/core'
import { createUsePuck } from '@puckeditor/core'
import { Button, Group, Image, Select, Stack, Text, TextInput } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import {
  ASPECT_RATIO_OPTIONS,
  OBJECT_FIT_OPTIONS,
  OBJECT_POSITION_OPTIONS,
} from './media-props'

const usePuck = createUsePuck()

/**
 * Compact Image Widget Settings — source + appearance in one panel.
 * Link opens via ActionBar → AtomWidgetLinkHost (canonical Link Editor).
 */
export function ImageEditorPanel({
  src,
  readOnly,
  onChangeSrc,
}: {
  src?: string
  readOnly?: boolean
  onChangeSrc: (next: string) => void
}) {
  const selectedItem = usePuck((s) => s.selectedItem)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const dispatch = usePuck((s) => s.dispatch)
  const props = selectedItem?.props || {}

  const patch = (partial: Record<string, unknown>) => {
    const id = selectedItem?.props?.id
    const selector = id ? getSelectorForId?.(String(id)) : null
    if (!selectedItem || !selector) {
      if (typeof partial.src === 'string') onChangeSrc(partial.src)
      return
    }
    dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: {
        ...selectedItem,
        props: { ...selectedItem.props, ...partial },
      },
    })
  }

  return (
    <Stack gap="sm">
      <Text size="sm" fw={600}>
        Source
      </Text>
      <div
        style={{
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-gray-0)',
          minHeight: 96,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {src ? (
          <Image src={src} alt={String(props.alt || '')} fit="contain" mah={160} />
        ) : (
          <Text size="xs" c="dimmed">
            No image selected
          </Text>
        )}
      </div>
      {!readOnly && (
        <Group gap="xs">
          <MediaSourcePicker
            kind="image"
            triggerLabel={src ? 'Change image' : 'Choose image'}
            onSelect={(media) => {
              if (!media.url) return
              patch({ src: media.url, mediaId: media.id })
              onChangeSrc(media.url)
            }}
          />
          {src ? (
            <Button
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => {
                patch({ src: '', mediaId: undefined })
                onChangeSrc('')
              }}
            >
              Remove
            </Button>
          ) : null}
        </Group>
      )}
      <TextInput
        size="sm"
        label="Alt text"
        value={String(props.alt || '')}
        readOnly={readOnly}
        onChange={(event) => patch({ alt: event.currentTarget.value })}
      />
      <TextInput
        size="sm"
        label="Caption"
        value={String(props.caption || '')}
        readOnly={readOnly}
        onChange={(event) => patch({ caption: event.currentTarget.value })}
      />

      <Text size="sm" fw={600} mt={4}>
        Appearance
      </Text>
      <Select
        size="sm"
        label="Aspect ratio"
        data={[...ASPECT_RATIO_OPTIONS]}
        value={String(props.aspectRatio || '16:9')}
        disabled={readOnly}
        onChange={(value) => patch({ aspectRatio: value || '16:9' })}
      />
      <Select
        size="sm"
        label="Object fit"
        data={[...OBJECT_FIT_OPTIONS]}
        value={String(props.objectFit || 'cover')}
        disabled={readOnly}
        onChange={(value) => patch({ objectFit: value || 'cover' })}
      />
      <Select
        size="sm"
        label="Focal position"
        data={[...OBJECT_POSITION_OPTIONS]}
        value={String(props.objectPosition || 'center')}
        disabled={readOnly}
        onChange={(value) => patch({ objectPosition: value || 'center' })}
      />
      <Text size="xs" c="dimmed">
        Link opens from the ActionBar. Borders, spacing and effects open from Style actions.
      </Text>
    </Stack>
  )
}

export const imageEditorField: CustomField<string> = {
  type: 'custom',
  label: 'Image',
  render: ({ value, onChange, readOnly }) => (
    <ImageEditorPanel src={value} onChangeSrc={onChange} readOnly={readOnly} />
  ),
}
