import React from 'react'
import type { CustomField } from '@puckeditor/core'
import { createUsePuck } from '@puckeditor/core'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import { puckTypographyStyleField } from '@/components/builder/fields/PuckTypographyStyleField'
import { InlineEditableAtom } from '@/components/builder/inline-edit/InlineEditableAtom'
import { canInlineEditAtom } from '@/components/builder/inline-edit/content-model'
import { atomManifests } from './manifests'
import { AtomPresentation, createAtomRenderer } from './frontend'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
import { documentBoundHeadingFields, headingTagField } from './heading-fields'
import { imageEditorField } from './ImageEditorField'
import {
  ASPECT_RATIO_OPTIONS,
  OBJECT_FIT_OPTIONS,
  OBJECT_POSITION_OPTIONS,
} from './media-props'
import {
  applyBindingFieldVisibility,
  isActiveItemBinding,
  MEDIA_BINDING_OPTIONS,
  TEXT_BINDING_OPTIONS,
  URL_BINDING_OPTIONS,
} from '@/lib/theme-engine/item-binding'
import { bindingPreviewForTemplate } from '@/lib/theme-engine/binding-preview'
import { useBuilderTemplateContext } from '@/components/builder/core/BuilderTemplateContext'

export {
  boundHeadingTagField,
  documentBoundHeadingFields,
  headingTagField,
} from './heading-fields'

const usePuck = createUsePuck()

/** Updates src (+ mediaId) on the selected Image/Video without dropping sibling props. */
function MediaUrlField({
  kind,
  value,
  onChange,
  readOnly,
  label,
}: {
  kind: 'image' | 'video'
  value?: string
  onChange: (next: string) => void
  readOnly?: boolean
  label: string
}) {
  const selectedItem = usePuck((s) => s.selectedItem)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const dispatch = usePuck((s) => s.dispatch)

  const patchMedia = (patch: Record<string, unknown>) => {
    const id = selectedItem?.props?.id
    const selector = id ? getSelectorForId?.(String(id)) : null
    if (!selectedItem || !selector) {
      if (typeof patch.src === 'string') onChange(patch.src)
      return
    }
    dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: {
        ...selectedItem,
        props: {
          ...selectedItem.props,
          ...patch,
        },
      },
    })
  }

  return (
    <Stack gap="xs">
      <TextInput
        label={label}
        value={value || ''}
        readOnly={readOnly}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {!readOnly && (
        <>
          <MediaSourcePicker
            kind={kind}
            onSelect={(media) => {
              if (!media.url) return
              patchMedia({
                src: media.url,
                mediaId: media.id,
                ...(kind === 'video' && media.posterUrl
                  ? { posterUrl: media.posterUrl, posterMediaId: media.posterMediaId }
                  : {}),
              })
            }}
          />
          {value ? (
            <Button
              variant="subtle"
              color="red"
              onClick={() =>
                patchMedia({
                  src: '',
                  mediaId: undefined,
                  ...(kind === 'video' ? { posterUrl: '', posterMediaId: undefined } : {}),
                })
              }
            >
              Remove {kind}
            </Button>
          ) : null}
        </>
      )}
    </Stack>
  )
}

const videoSourceField: CustomField<string> = {
  type: 'custom',
  label: 'Video source',
  render: ({ value, onChange, readOnly }) => (
    <MediaUrlField
      kind="video"
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      label="Video URL"
    />
  ),
}

const videoPosterField: CustomField<string> = {
  type: 'custom',
  label: 'Poster image',
  render: ({ value, onChange, readOnly }) => (
    <Stack gap="xs">
      <TextInput
        label="Poster URL"
        value={value || ''}
        readOnly={readOnly}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {!readOnly && (
        <Group gap="xs">
          <MediaSourcePicker
            kind="image"
            triggerLabel="Choose poster"
            onSelect={(media) => {
              if (media.url) onChange(media.url)
            }}
          />
          {value ? (
            <Button variant="subtle" color="red" onClick={() => onChange('')}>
              Clear poster
            </Button>
          ) : null}
        </Group>
      )}
      <Text size="xs" c="dimmed">
        Shown before playback and when reduced motion is preferred.
      </Text>
    </Stack>
  ),
}

const mediaPresentationFields = {
  aspectRatio: {
    type: 'select' as const,
    label: 'Aspect ratio',
    options: [...ASPECT_RATIO_OPTIONS],
  },
  objectFit: {
    type: 'select' as const,
    label: 'Object fit',
    options: [...OBJECT_FIT_OPTIONS],
  },
  objectPosition: {
    type: 'select' as const,
    label: 'Focal position',
    options: [...OBJECT_POSITION_OPTIONS],
  },
  caption: { type: 'text' as const, label: 'Caption' },
}

const textBindingField = {
  type: 'select' as const,
  label: 'Text binding',
  options: TEXT_BINDING_OPTIONS,
}

const hrefBindingField = {
  type: 'select' as const,
  label: 'URL binding',
  options: URL_BINDING_OPTIONS,
}

const srcBindingField = {
  type: 'select' as const,
  label: 'Media binding',
  options: MEDIA_BINDING_OPTIONS,
}

function atomFields(type: string, fixed: ReturnType<typeof systemDescriptor>) {
  if (fixed?.atom === 'Heading') {
    return { ...documentBoundHeadingFields }
  }
  if (fixed) return {}
  if (type === 'Image') {
    // Single compact Image Editor panel. Link → ActionBar Link Editor.
    return {
      srcBinding: srcBindingField,
      hrefBinding: hrefBindingField,
      src: imageEditorField,
    }
  }
  if (type === 'Video') {
    return {
      srcBinding: srcBindingField,
      src: videoSourceField,
      posterUrl: videoPosterField,
      alt: { type: 'text' as const, label: 'Accessible label' },
      ...mediaPresentationFields,
      controls: {
        type: 'radio' as const,
        label: 'Show controls',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
      },
      loop: {
        type: 'radio' as const,
        label: 'Loop',
        options: [
          { label: 'No', value: false },
          { label: 'Yes', value: true },
        ],
      },
      muted: {
        type: 'radio' as const,
        label: 'Muted',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
      },
      autoplay: {
        type: 'radio' as const,
        label: 'Autoplay (muted)',
        options: [
          { label: 'Off', value: false },
          { label: 'On', value: true },
        ],
      },
    }
  }
  if (type === 'Button') {
    // Label → canvas double-click TipTap. Icon → Button Design. Link → ActionBar.
    return {
      textBinding: textBindingField,
      hrefBinding: hrefBindingField,
    }
  }
  return {
    textBinding: textBindingField,
    text: {
      type: 'textarea' as const,
      label: 'Content',
      contentEditable: false,
    },
    ...(type === 'Heading'
      ? {
          tag: headingTagField,
          style: puckTypographyStyleField,
        }
      : {}),
    ...(type === 'Text' ? { style: puckTypographyStyleField } : {}),
  }
}

function BoundAtomCanvas({
  type,
  fixed,
  Renderer,
  props,
}: {
  type: string
  fixed: ReturnType<typeof systemDescriptor>
  Renderer: ReturnType<typeof createAtomRenderer>
  props: React.ComponentProps<ReturnType<typeof createAtomRenderer>>
}) {
  const templateContext = useBuilderTemplateContext()
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
  const textBound = isActiveItemBinding(props.textBinding)
  const hrefBound = isActiveItemBinding(props.hrefBinding)
  const srcBound = isActiveItemBinding(props.srcBinding)
  const needsBindingPreview = textBound || hrefBound || srcBound
  const dataContext = fixed
    ? {
        type: 'single' as const,
        document: {
          title: '[Document Title]',
          createdAt: '2026-01-01',
          categories: [{ title: '[Category]' }],
          featuredImage: { url: 'https://placehold.co/640x360/e2e8f0/334155?text=Featured' },
        },
        archive: {
          title: '[Category Title]',
          description: '[Category Description]',
        },
      }
    : needsBindingPreview
      ? bindingPreviewForTemplate(templateContext, props.dataContext)
      : props.dataContext

  const node = <Renderer {...props} dataContext={dataContext} />
  // Only textBinding blocks inline label/content edit; hrefBinding keeps Button label editable.
  if (!canInlineEditAtom(type, Boolean(fixed) || textBound)) return node
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
    const baseFields = atomFields(type, fixed)
    return [
      type,
      {
        manifest,
        config: {
          label: manifest.label,
          fields: baseFields,
          defaultProps: defaults,
          resolveFields: (
            data: { props?: Record<string, unknown> },
            params: { fields: typeof baseFields },
          ) => {
            if (fixed) return params.fields
            return applyBindingFieldVisibility(params.fields as Record<string, unknown>, {
              textBinding: data.props?.textBinding as string | undefined,
              hrefBinding: data.props?.hrefBinding as string | undefined,
              srcBinding: data.props?.srcBinding as string | undefined,
            }) as typeof baseFields
          },
          render: (props: React.ComponentProps<typeof Renderer>) => (
            <BoundAtomCanvas type={type} fixed={fixed} Renderer={Renderer} props={props} />
          ),
        },
      },
    ]
  }),
)
