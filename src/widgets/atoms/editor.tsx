import React from 'react'
import type { CustomField } from '@puckeditor/core'
import { Button, Stack, TextInput } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import { atomManifests } from './manifests'
import { AtomPresentation, createAtomRenderer } from './frontend'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
const imageSourceField: CustomField<string> = {
  type: 'custom',
  label: 'Image source',
  render: ({ value, onChange, readOnly }) => (
    <Stack gap="xs">
      <TextInput
        label="Image URL"
        value={value || ''}
        readOnly={readOnly}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {!readOnly && (
        <>
          <MediaSourcePicker
            kind="image"
            onSelect={(media) => {
              if (media.url) onChange(media.url)
            }}
          />
          {value && (
            <Button variant="subtle" color="red" onClick={() => onChange('')}>
              Remove image
            </Button>
          )}
        </>
      )}
    </Stack>
  ),
}

export const atomEditors = Object.fromEntries(
  Object.entries(atomManifests).map(([type, manifest]) => {
    const Renderer = createAtomRenderer(type)
    const fixed = systemDescriptor(type)
    return [
      type,
      {
        manifest,
        config: {
          label: manifest.label,
          fields: fixed
            ? {}
            : type === 'Image'
              ? {
                  src: imageSourceField,
                  alt: { type: 'text', label: 'Alternative text' },
                }
              : { text: { type: 'textarea', label: 'Content' } },
          defaultProps: manifest.defaultProps,
          render: (props: React.ComponentProps<typeof Renderer>) =>
            fixed?.atom === 'Image' ? (
              <AtomPresentation
                id={props.id}
                style={props.style}
                kind="Image"
                text="Featured media preview"
              />
            ) : (
              <Renderer
                {...props}
                dataContext={
                  fixed
                    ? {
                        type: 'single',
                        document: {
                          title: '[Document Title]',
                          createdAt: '2026-01-01',
                          categories: [{ title: '[Category]' }],
                        },
                        archive: {
                          title: '[Category Title]',
                          description: '[Category Description]',
                        },
                      }
                    : undefined
                }
              />
            ),
        },
      },
    ]
  }),
)
