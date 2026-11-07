import React from 'react'
import type { CustomField } from '@puckeditor/core'
import { Button, Stack, TextInput } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import { puckTypographyStyleField } from '@/components/builder/fields/PuckTypographyStyleField'
import { InlineEditableAtom } from '@/components/builder/inline-edit/InlineEditableAtom'
import { canInlineEditAtom } from '@/components/builder/inline-edit/content-model'
import { atomManifests } from './manifests'
import { AtomPresentation, createAtomRenderer } from './frontend'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
import { documentBoundHeadingFields, headingTagField } from './heading-fields'

export {
  boundHeadingTagField,
  documentBoundHeadingFields,
  headingTagField,
} from './heading-fields'

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

function atomFields(type: string, fixed: ReturnType<typeof systemDescriptor>) {
  if (fixed?.atom === 'Heading') {
    // DocumentTitle / CategoryTitle: Heading settings minus editable Content.
    return { ...documentBoundHeadingFields }
  }
  if (fixed) return {}
  if (type === 'Image') {
    return {
      src: imageSourceField,
      alt: { type: 'text' as const, label: 'Alternative text' },
    }
  }
  return {
    // Puck native contentEditable stays off — V1 uses double-click Tiptap shell instead.
    text: {
      type: 'textarea' as const,
      label: type === 'Button' ? 'Label' : 'Content',
      contentEditable: false,
    },
    ...(type === 'Heading'
      ? {
          tag: headingTagField,
          style: puckTypographyStyleField,
        }
      : {}),
    ...(type === 'Text' ? { style: puckTypographyStyleField } : {}),
    ...(type === 'Button'
      ? {
          href: { type: 'text' as const, label: 'Link URL' },
          newTab: {
            type: 'radio' as const,
            label: 'Open in new tab',
            options: [
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ],
          },
        }
      : {}),
  }
}

export const atomEditors = Object.fromEntries(
  Object.entries(atomManifests).map(([type, manifest]) => {
    const Renderer = createAtomRenderer(type)
    const fixed = systemDescriptor(type)
    const defaults =
      fixed?.atom === 'Heading'
        ? {
            ...manifest.defaultProps,
            tag: type === 'CategoryTitle' ? 'h2' : 'h1',
          }
        : manifest.defaultProps
    return [
      type,
      {
        manifest,
        config: {
          label: manifest.label,
          fields: atomFields(type, fixed),
          defaultProps: defaults,
          render: (props: React.ComponentProps<typeof Renderer>) => {
            if (fixed?.atom === 'Image') {
              return (
                <AtomPresentation
                  id={props.id}
                  style={props.style}
                  kind="Image"
                  text="Featured media preview"
                />
              )
            }
            const node = (
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
            )
            // DocumentTitle / CategoryTitle / other bound atoms: never mount Tiptap.
            if (!canInlineEditAtom(type, Boolean(fixed))) return node
            return (
              <InlineEditableAtom
                kind={type}
                id={String(props.id || '')}
                text={props.text}
                tag={props.tag}
                style={props.style}
              >
                {node}
              </InlineEditableAtom>
            )
          },
        },
      },
    ]
  }),
)
