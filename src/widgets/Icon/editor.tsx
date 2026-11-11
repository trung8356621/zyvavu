'use client'

import React from 'react'
import type { ComponentConfig, CustomField } from '@puckeditor/core'
import { NumberInput } from '@mantine/core'
import { IconPickerField } from '@/components/admin/icons/IconPicker'
import type { IconRef } from '@/lib/icons'
import { IconFrontend, type IconAtomProps } from './frontend'

const iconField: CustomField<IconRef | null | undefined> = {
  type: 'custom',
  label: 'Icon',
  render: ({ value, onChange, readOnly }) => (
    <IconPickerField value={value || null} onChange={onChange} readOnly={readOnly} />
  ),
}

export const iconEditor: ComponentConfig<IconAtomProps> = {
  label: 'Icon',
  fields: {
    icon: iconField,
    label: {
      type: 'text',
      label: 'Accessible label',
    },
    decorative: {
      type: 'radio',
      label: 'Accessibility role',
      options: [
        { label: 'Decorative', value: true },
        { label: 'Meaningful', value: false },
      ],
    },
    href: {
      type: 'text',
      label: 'Optional link URL',
    },
    newTab: {
      type: 'radio',
      label: 'Open link in new tab',
      options: [
        { label: 'Same tab', value: false },
        { label: 'New tab', value: true },
      ],
    },
    size: {
      type: 'custom',
      label: 'Size (px)',
      render: ({ value, onChange, readOnly }) => (
        <NumberInput
          label="Size (px)"
          size="sm"
          min={8}
          max={256}
          value={typeof value === 'number' ? value : 24}
          disabled={readOnly}
          onChange={(v) => onChange(typeof v === 'number' ? v : 24)}
        />
      ),
    },
    strokeWidth: {
      type: 'custom',
      label: 'Stroke width',
      render: ({ value, onChange, readOnly }) => (
        <NumberInput
          label="Stroke width"
          size="sm"
          min={0.5}
          max={4}
          step={0.25}
          decimalScale={2}
          value={typeof value === 'number' ? value : 2}
          disabled={readOnly}
          onChange={(v) => onChange(typeof v === 'number' ? v : 2)}
        />
      ),
    },
  },
  defaultProps: {
    icon: { source: 'lucide', name: 'star', recolorable: true },
    label: '',
    decorative: true,
    href: '',
    newTab: false,
    size: 24,
    strokeWidth: 2,
    style: {
      colorToken: 'primary',
      align: 'left',
      spacing: { padding: { token: 'xs' } },
    },
  },
  render: (props) => <IconFrontend {...props} />,
}
