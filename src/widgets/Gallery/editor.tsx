'use client'

import React from 'react'
import type { ComponentConfig, CustomField } from '@puckeditor/core'
import { Button, Stack, Text } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import { GalleryFrontend, type GalleryItem, type GalleryProps } from './frontend'
import {
  ASPECT_RATIO_OPTIONS,
  OBJECT_FIT_OPTIONS,
} from '@/widgets/atoms/media-props'

const addImagesField: CustomField<GalleryItem[]> = {
  type: 'custom',
  label: 'Add from Media Library',
  render: ({ value, onChange, readOnly }) => {
    const items = Array.isArray(value) ? value : []
    return (
      <Stack gap="xs">
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
        {!readOnly && items.length > 0 && (
          <Button variant="subtle" color="red" onClick={() => onChange([])}>
            Clear all images
          </Button>
        )}
      </Stack>
    )
  },
}

export const galleryEditor: ComponentConfig<GalleryProps> = {
  label: 'Image Gallery',
  fields: {
    items: addImagesField as any,
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
