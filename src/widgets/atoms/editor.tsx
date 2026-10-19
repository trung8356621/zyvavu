import React from 'react'
import { atomManifests } from './manifests'
import { AtomPresentation, createAtomRenderer } from './frontend'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
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
                  src: { type: 'text', label: 'Image source' },
                  alt: { type: 'text', label: 'Alternative text' },
                }
              : { text: { type: 'textarea', label: 'Content' } },
          defaultProps: manifest.defaultProps,
          render: (props: React.ComponentProps<typeof Renderer>) => fixed?.atom === 'Image' ? <AtomPresentation id={props.id} style={props.style} kind="Image" text="Featured media preview" /> : (
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
                      archive: { title: '[Category Title]', description: '[Category Description]' },
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
