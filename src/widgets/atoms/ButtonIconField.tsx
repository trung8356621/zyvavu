'use client'

import React from 'react'
import type { CustomField } from '@puckeditor/core'
import { createUsePuck } from '@puckeditor/core'
import {
  ButtonIconSettingsFields,
  type ButtonIconSettings,
} from './ButtonSettingsFields'
import type { IconRef } from '@/lib/icons'

const usePuck = createUsePuck()

function ButtonIconFieldRender({
  value,
  onChange,
  readOnly,
}: {
  value?: IconRef | null
  onChange: (next: IconRef | null) => void
  readOnly?: boolean
}) {
  const selectedItem = usePuck((s) => s.selectedItem)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const dispatch = usePuck((s) => s.dispatch)

  const settings: ButtonIconSettings = {
    icon: value || selectedItem?.props?.icon || null,
    iconPosition: selectedItem?.props?.iconPosition || 'left',
    iconSize: selectedItem?.props?.iconSize,
    iconGap: selectedItem?.props?.iconGap,
  }

  const patch = (next: Partial<ButtonIconSettings>) => {
    const id = selectedItem?.props?.id
    const selector = id ? getSelectorForId?.(String(id)) : null
    if (!selectedItem || !selector) {
      if ('icon' in next) onChange(next.icon ?? null)
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
          ...next,
        },
      },
    })
    if ('icon' in next) onChange(next.icon ?? null)
  }

  return (
    <ButtonIconSettingsFields value={settings} onChange={patch} readOnly={readOnly} />
  )
}

export const buttonIconField: CustomField<IconRef | null | undefined> = {
  type: 'custom',
  label: 'Icon',
  render: ({ value, onChange, readOnly }) => (
    <ButtonIconFieldRender value={value} onChange={onChange} readOnly={readOnly} />
  ),
}
