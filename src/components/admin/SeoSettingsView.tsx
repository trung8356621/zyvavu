import React from 'react'
import { isSiteStaff } from '@/access/roles'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Paper, Stack, Text, Title } from '@mantine/core'
import type { AdminViewServerProps } from 'payload'

export function SeoSettingsView(props: AdminViewServerProps) {
  const req = props.initPageResult?.req || props.req
  const user = req?.user || props.user
  const payload = req?.payload || props.payload
  const visibleEntities = props.initPageResult?.visibleEntities || props.visibleEntities || { collections: {}, globals: {} }

  if (!isSiteStaff(user)) {
    return (
      <div style={{ padding: 'var(--gutter-h, 24px)' }}>
        <p>Forbidden. /admin/seo-settings is limited to site-admin and system-admin.</p>
      </div>
    )
  }

  if (payload) {
    return (
      <DefaultTemplate
        {...props}
        payload={payload}
        req={req}
        user={user}
        visibleEntities={visibleEntities}
      >
        <div style={{ padding: 'var(--gutter-h, 24px)', maxWidth: '800px' }}>
          <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}>
            <Stack gap="sm">
              <Title order={1} size="h2" style={{ color: 'var(--zyvavu-ink, #17201f)' }}>
                SEO Settings
              </Title>
              <Text c="dimmed" size="md">
                SEO configuration will be available in a future implementation.
              </Text>
            </Stack>
          </Paper>
        </div>
      </DefaultTemplate>
    )
  }

  return (
    <div style={{ padding: 'var(--gutter-h, 24px)', maxWidth: '800px' }}>
      <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}>
        <Stack gap="sm">
          <Title order={1} size="h2" style={{ color: 'var(--zyvavu-ink, #17201f)' }}>
            SEO Settings
          </Title>
          <Text c="dimmed" size="md">
            SEO configuration will be available in a future implementation.
          </Text>
        </Stack>
      </Paper>
    </div>
  )
}
