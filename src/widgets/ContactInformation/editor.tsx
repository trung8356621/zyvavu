'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { CONTACT_DISPLAY_PRESETS, sampleContactEntriesWithOrder, sampleContactEntryIds, type ContactEntry } from '@/lib/site/contact'
import { ContactEntryIdsField } from './EntryIdsField'
import { ContactInformationFrontend, type ContactInformationProps } from './frontend'

export function createContactInformationEditor(contactEntries?: ContactEntry[]): ComponentConfig<ContactInformationProps> {
  return {
    label: 'Contact Information',
    fields: {
      entryIds: {
        type: 'custom',
        label: 'Visible contact entries',
        render: ({ value, onChange }) => (
          <ContactEntryIdsField
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            siteEntries={contactEntries}
          />
        ),
      },
      showLabels: {
        type: 'radio',
        label: 'Show labels',
        options: [
          { label: 'Show', value: true },
          { label: 'Hide', value: false },
        ],
      },
      showIcons: {
        type: 'radio',
        label: 'Show icons',
        options: [
          { label: 'Show', value: true },
          { label: 'Hide', value: false },
        ],
      },
      preset: {
        type: 'select',
        label: 'Display preset',
        options: CONTACT_DISPLAY_PRESETS.map((preset) => ({
          label: preset.label,
          value: preset.value,
        })),
      },
    },
    defaultProps: {
      entryIds: sampleContactEntryIds(),
      showLabels: true,
      showIcons: true,
      preset: 'vertical',
      style: {
        backgroundToken: 'transparent',
      },
    },
    render: (props) => (
      <ContactInformationFrontend
        {...props}
        dataContext={undefined}
        previewEntries={contactEntries ?? sampleContactEntriesWithOrder()}
      />
    ),
  }
}

export const contactInformationEditor = createContactInformationEditor()
