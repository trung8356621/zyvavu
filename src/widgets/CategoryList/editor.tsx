'use client'

import React from 'react'
import type { ComponentConfig, CustomField } from '@puckeditor/core'
import { Select, Stack } from '@mantine/core'
import { IconPickerField } from '@/components/admin/icons/IconPicker'
import type { ListPresentationConfig } from '@/lib/style-engine/list-presentation'
import { CategoryTreeField } from './CategoryTreeField'
import { CategoryListEditorPreview } from './EditorPreview'
import { getCategoryListPreset } from './presets'
import type { CategoryListProps } from './shared'

const categoryIdsField: CustomField<Array<string | number> | undefined> = {
  type: 'custom',
  label: 'Categories',
  render: ({ value, onChange, readOnly }) => (
    <CategoryTreeField value={value || []} onChange={onChange} readOnly={readOnly} />
  ),
}

function patchListPresentation(
  current: ListPresentationConfig | undefined,
  patch: Partial<ListPresentationConfig>,
): ListPresentationConfig {
  return {
    ...(current || {}),
    ...patch,
    marker: { ...(current?.marker || {}), ...(patch.marker || {}) },
    chevron: { ...(current?.chevron || {}), ...(patch.chevron || {}) },
  }
}

export const categoryListEditor: ComponentConfig<CategoryListProps> = {
  label: 'Category List',
  fields: {
    // Classic/Compact/Boxed are Widget Library Patterns (initial design only).
    // `preset` remains on the data model for backward compatibility.
    selectedCategoryIds: categoryIdsField,
    includeDescendants: {
      type: 'radio',
      label: 'Include descendants',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    hideEmpty: {
      type: 'radio',
      label: 'Hide empty categories',
      options: [
        { label: 'Show all', value: false },
        { label: 'Hide empty', value: true },
      ],
    },
    showCounts: {
      type: 'radio',
      label: 'Post counts',
      options: [
        { label: 'Hide', value: false },
        { label: 'Show', value: true },
      ],
    },
    autoExpandActive: {
      type: 'radio',
      label: 'Auto-expand active branch',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    initialExpanded: {
      type: 'select',
      label: 'Initial expanded state',
      options: [
        { label: 'Collapsed', value: 'none' },
        { label: 'Root branches', value: 'roots' },
        { label: 'All', value: 'all' },
      ],
    },
    listPresentation: {
      type: 'custom',
      label: 'Marker mode',
      render: ({ value, onChange, readOnly }) => (
        <Stack gap="sm">
          <Select
            label="Marker mode"
            size="sm"
            disabled={readOnly}
            value={value?.marker?.mode || 'none'}
            data={[
              { label: 'None', value: 'none' },
              { label: 'Icon', value: 'icon' },
              { label: 'Number', value: 'number' },
            ]}
            onChange={(mode) =>
              onChange(
                patchListPresentation(value, {
                  marker: { mode: (mode as 'none' | 'icon' | 'number') || 'none' },
                }),
              )
            }
          />
          {(value?.marker?.mode || 'none') === 'icon' ? (
            <IconPickerField
              label="Marker icon"
              value={value?.marker?.icon || null}
              readOnly={readOnly}
              onChange={(icon) =>
                onChange(patchListPresentation(value, { marker: { mode: 'icon', icon } }))
              }
            />
          ) : null}
        </Stack>
      ),
    },
  },
  defaultProps: {
    preset: 'classic-tree',
    selectedCategoryIds: [],
    includeDescendants: true,
    hideEmpty: false,
    showCounts: false,
    autoExpandActive: true,
    initialExpanded: 'roots',
    listPresentation: getCategoryListPreset('classic-tree').listPresentation,
    style: {
      spacing: { padding: { token: 'sm' } },
    },
  },
  render: (props) => <CategoryListEditorPreview {...(props as CategoryListProps)} />,
}
