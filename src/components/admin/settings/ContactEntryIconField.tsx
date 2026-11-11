'use client'

import React from 'react'
import { Stack, Text } from '@mantine/core'
import { useField } from '@payloadcms/ui'
import type { JSONFieldClientProps } from 'payload'
import { IconPickerField } from '@/components/admin/icons/IconPicker'
import type { IconRef } from '@/lib/icons/types'

export function ContactEntryIconField({ path, readOnly }: JSONFieldClientProps) {
  const { value, setValue, disabled, showError, errorMessage } = useField<IconRef | null>({ path })

  return (
    <Stack gap="xs">
      <IconPickerField label="Icon (optional)" value={value} onChange={setValue} readOnly={readOnly || disabled} />
      {showError && errorMessage && <Text size="sm" c="red" role="alert">{errorMessage}</Text>}
    </Stack>
  )
}
