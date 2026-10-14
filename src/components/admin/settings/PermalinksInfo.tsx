'use client'

import React from 'react'
import { Alert, Code, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { Info } from 'lucide-react'

export function PermalinksInfo() {
  return (
    <Stack gap="md" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
      <Alert
        color="teal"
        icon={<Info size={18} />}
        title="URL Registry Contract"
        variant="light"
      >
        <Text size="sm">
          Zyvavu uses a central flat URL Registry. Changing the default structure applies to newly created or republished posts only. Existing published URLs and redirect histories are preserved and never automatically rewritten.
        </Text>
      </Alert>

      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Title order={5} size="sm" mb="xs">
          Structure Presets & Contract Status
        </Title>
        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Preset</Table.Th>
              <Table.Th>Example Pattern</Table.Th>
              <Table.Th>Backend Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td><Text size="sm" fw={600}>Posts prefix</Text></Table.Td>
              <Table.Td><Code>/posts/%postname%</Code></Table.Td>
              <Table.Td><Text size="sm" c="teal" fw={600}>Active &amp; Supported</Text></Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td><Text size="sm" fw={600}>Flat</Text></Table.Td>
              <Table.Td><Code>/%postname%</Code></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">Documented (Pages collision guard required)</Text></Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td><Text size="sm" fw={600}>Category-based</Text></Table.Td>
              <Table.Td><Code>/%category%/%postname%</Code></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">Unsupported (Requires category sync &amp; archive routes)</Text></Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td><Text size="sm" fw={600}>Date-based</Text></Table.Td>
              <Table.Td><Code>/%year%/%monthnum%/%postname%</Code></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">Unsupported (Requires publish date sync)</Text></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  )
}
