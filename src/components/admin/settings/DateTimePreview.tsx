'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'
import { Badge, Group, Paper, Stack, Text } from '@mantine/core'

import { formatDateTime } from '@/lib/dateTime'

export function DateTimePreview() {
  const timezone = useFormFields(([fields]) => (fields.timezone?.value as string) || 'Asia/Ho_Chi_Minh')
  const dateFormat = useFormFields(([fields]) => (fields.dateFormat?.value as string) || 'dd/MM/yyyy')
  const timeFormat = useFormFields(([fields]) => (fields.timeFormat?.value as string) || 'HH:mm')

  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatted = formatDateTime(now, { timezone, dateFormat, timeFormat })

  return (
    <Paper p="md" radius="md" withBorder style={{ marginTop: '0.75rem', marginBottom: '1.25rem', backgroundColor: '#f8faf9' }}>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600} c="dimmed">
            Live Preview
          </Text>
          <Badge color="teal" variant="light" size="sm">
            {timezone}
          </Badge>
        </Group>
        <Text size="lg" fw={700} style={{ fontFamily: 'monospace' }}>
          {formatted || '—'}
        </Text>
        <Text size="xs" c="dimmed">
          Timestamps are stored in UTC. Selected timezone and presets govern display across the CMS and frontend.
        </Text>
      </Stack>
    </Paper>
  )
}
