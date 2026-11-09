'use client'

import React from 'react'
import type { ComponentConfig, CustomField } from '@puckeditor/core'
import { Button, Group, Image, Stack, Text, TextInput } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import { GalleryFrontend, type GalleryItem, type GalleryProps } from './frontend'
import {
  ASPECT_RATIO_OPTIONS,
  OBJECT_FIT_OPTIONS,
} from '@/widgets/atoms/media-props'

/**
 * Gallery Fields — Media Library add + per-item alt/caption/href/replace/remove.
 * No Wix Gallery Organizer / masonry / drag-reorder (OUT_OF_SCOPE TC-B11+).
 */
function GalleryItemsEditor({
  value,
  onChange,
  readOnly,
}: {
  value?: GalleryItem[]
  onChange: (next: GalleryItem[]) => void
  readOnly?: boolean
}) {
  const items = Array.isArray(value) ? value : []

  const updateItem = (index: number, patch: Partial<GalleryItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {items.length} image{items.length === 1 ? '' : 's'} in gallery
      </Text>
      {!readOnly && (
        <MediaSourcePicker
          kind="image"
          triggerLabel="Add images"
          onSelect={(media) => {
            if (!media.url) return
            onChange([
              ...items,
              {
                id: `g-${media.id}-${items.length + 1}`,
                src: media.url,
                mediaId: media.id,
                alt: '',
                caption: '',
                href: '',
              },
            ])
          }}
        />
      )}

      {items.map((item, index) => (
        <Stack
          key={String(item.id || item.mediaId || item.src || index)}
          gap="xs"
          p="xs"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            background: 'var(--mantine-color-gray-0)',
          }}
        >
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <div
              style={{
                width: 72,
                height: 72,
                flexShrink: 0,
                borderRadius: 6,
                overflow: 'hidden',
                background: 'var(--mantine-color-gray-1)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {item.src ? (
                <Image src={item.src} alt={item.alt || ''} fit="cover" w={72} h={72} />
              ) : (
                <Text size="xs" c="dimmed">
                  —
                </Text>
              )}
            </div>
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" c="dimmed">
                Item {index + 1}
              </Text>
              {!readOnly && (
                <Group gap="xs">
                  <MediaSourcePicker
                    kind="image"
                    triggerLabel="Replace"
                    onSelect={(media) => {
                      if (!media.url) return
                      updateItem(index, {
                        src: media.url,
                        mediaId: media.id,
                      })
                    }}
                  />
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-sm"
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </Button>
                </Group>
              )}
            </Stack>
          </Group>
          <TextInput
            size="sm"
            label="Alt text"
            value={item.alt || ''}
            readOnly={readOnly}
            onChange={(event) => updateItem(index, { alt: event.currentTarget.value })}
          />
          <TextInput
            size="sm"
            label="Caption"
            value={item.caption || ''}
            readOnly={readOnly}
            onChange={(event) => updateItem(index, { caption: event.currentTarget.value })}
          />
          <TextInput
            size="sm"
            label="Link URL"
            description="Optional. javascript:/data: rejected at render."
            value={item.href || ''}
            readOnly={readOnly}
            onChange={(event) => updateItem(index, { href: event.currentTarget.value })}
          />
        </Stack>
      ))}

      {!readOnly && items.length > 0 && (
        <Button variant="subtle" color="red" onClick={() => onChange([])}>
          Clear all images
        </Button>
      )}
    </Stack>
  )
}

const galleryItemsField: CustomField<GalleryItem[]> = {
  type: 'custom',
  label: 'Gallery images',
  render: ({ value, onChange, readOnly }) => (
    <GalleryItemsEditor value={value} onChange={onChange} readOnly={readOnly} />
  ),
}

export const galleryEditor: ComponentConfig<GalleryProps> = {
  label: 'Image Gallery',
  fields: {
    items: galleryItemsField as any,
    columns: {
      type: 'select',
      label: 'Columns',
      options: [
        { label: '2 columns', value: 2 },
        { label: '3 columns', value: 3 },
        { label: '4 columns', value: 4 },
      ],
    },
    gapToken: {
      type: 'select',
      label: 'Gap',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    aspectRatio: {
      type: 'select',
      label: 'Item aspect ratio',
      options: [...ASPECT_RATIO_OPTIONS],
    },
    objectFit: {
      type: 'select',
      label: 'Item fit',
      options: [...OBJECT_FIT_OPTIONS],
    },
  },
  defaultProps: {
    columns: 3,
    gapToken: 'md',
    aspectRatio: '1:1',
    objectFit: 'cover',
    items: [],
  },
  render: (props) => <GalleryFrontend {...props} dataContext={undefined} />,
}
