'use client'

/**
 * Icon selection field — reuses the shared Media Library picker in `kind="icon"` mode.
 * Standalone Icon Picker modal removed; callers go through MediaSourcePicker.
 */

import React, { useState } from 'react'
import { Box, Button, Group, Stack, Text } from '@mantine/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'
import { IconRenderer, type IconRef } from '@/lib/icons'

export function IconPickerField({
  value,
  onChange,
  readOnly,
  label = 'Icon',
}: {
  value?: IconRef | null
  onChange: (next: IconRef | null) => void
  readOnly?: boolean
  label?: string
}) {
  const [pickerKey, setPickerKey] = useState(0)

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group gap="sm">
        <Box
          style={{
            width: 48,
            height: 48,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
          }}
        >
          {value ? <IconRenderer icon={value} size={26} decorative /> : <Text size="xs" c="dimmed">—</Text>}
        </Box>
        {!readOnly ? (
          <>
            <MediaSourcePicker
              key={pickerKey}
              kind="icon"
              value={value}
              triggerLabel={value ? 'Replace icon' : 'Choose icon'}
              onSelect={(icon) => {
                onChange(icon)
                setPickerKey((k) => k + 1)
              }}
            />
            {value ? (
              <Button size="xs" variant="subtle" color="red" onClick={() => onChange(null)}>
                Remove
              </Button>
            ) : null}
          </>
        ) : null}
      </Group>
      {value?.source === 'media' && value.mediaFilename ? (
        <Text size="xs" c="dimmed">
          {value.mediaFilename}
        </Text>
      ) : value?.name ? (
        <Text size="xs" c="dimmed">
          {value.source}: {value.name}
        </Text>
      ) : null}
    </Stack>
  )
}
