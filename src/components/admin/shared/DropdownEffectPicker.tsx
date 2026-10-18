'use client'

import React from 'react'
import { Button, Stack, Text } from '@mantine/core'
import { AnimationPresetPicker } from './AnimationPresetPicker'
import {
  dropdownToAnimation,
  animationToDropdown,
  resolveDropdownEffect,
  type DropdownEffectId,
  type ItemDropdownEffectId,
} from './dropdownEffects'

export type DropdownEffectPickerProps = {
  value?: ItemDropdownEffectId
  onChange: (value: ItemDropdownEffectId) => void
  allowInherit?: boolean
  menuDefault?: DropdownEffectId
  disabled?: boolean
  label?: React.ReactNode
}

export function DropdownEffectPicker({
  value = 'inherit',
  onChange,
  allowInherit = false,
  menuDefault = 'fade',
  disabled = false,
  label,
}: DropdownEffectPickerProps) {
  return (
    <Stack gap="xs">
      {label && <Text size="sm">{label}</Text>}
      {allowInherit && (
        <Button
          variant={value === 'inherit' ? 'light' : 'default'}
          disabled={disabled}
          onClick={() => onChange('inherit')}
        >
          Inherit menu default ({menuDefault})
        </Button>
      )}
      <AnimationPresetPicker
        target="dropdown"
        disabled={disabled}
        value={dropdownToAnimation(resolveDropdownEffect(value, menuDefault))}
        onChange={(animation) => onChange(animationToDropdown(animation))}
      />
    </Stack>
  )
}
