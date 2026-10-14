'use client'

import React from 'react'
import { Alert, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { Languages } from 'lucide-react'

export function LanguagesInfo() {
  return (
    <Stack gap="md" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
      <Alert
        color="teal"
        icon={<Languages size={18} />}
        title="DEC-LANG-001 Multilingual Foundation"
        variant="light"
      >
        <Text size="sm">
          Zyvavu is designed around Payload native localization on PostgreSQL with shared entity identities and localized field translations.
        </Text>
      </Alert>

      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Title order={5} size="sm" mb="xs">
          Configured Languages
        </Title>
        <Stack gap="xs">
          <Group justify="space-between">
            <Group gap="xs">
              <Text size="sm" fw={600}>Tiếng Việt (vi)</Text>
              <Badge color="teal" size="sm" variant="filled">Default Language</Badge>
            </Group>
            <Text size="xs" c="dimmed">Preserves standard root URLs (e.g. /gioi-thieu)</Text>
          </Group>
          <Group justify="space-between">
            <Group gap="xs">
              <Text size="sm" fw={600}>English (en)</Text>
              <Badge color="gray" size="sm" variant="outline">Secondary Locale</Badge>
            </Group>
            <Text size="xs" c="dimmed">Uses controlled locale prefix (e.g. /en/about)</Text>
          </Group>
        </Stack>
        <Text size="xs" c="dimmed" mt="sm">
          Note: Enabling localized editing on collection fields requires localization configuration in code and database schema migrations. A saved language list in Settings declares active site locales, but does not mutate field schemas dynamically without migration.
        </Text>
      </Paper>
    </Stack>
  )
}
