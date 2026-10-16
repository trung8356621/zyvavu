import React from 'react'
import { isSiteStaff } from '@/access/roles'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Paper, Stack, Text, Title } from '@mantine/core'
import type { AdminViewServerProps } from 'payload'

import { SeoSettingsPanel } from '@/components/admin/SeoSettingsPanel'
import { loadSeoAdminSnapshot } from '@/lib/seo/admin-status'

export async function SeoSettingsView(props: AdminViewServerProps) {
  const anyProps = props as Record<string, any>
  const req = props.initPageResult?.req || anyProps.req
  const user = req?.user || anyProps.user
  const payload = req?.payload || anyProps.payload
  const visibleEntities = props.initPageResult?.visibleEntities || anyProps.visibleEntities || { collections: {}, globals: {} }

  if (!isSiteStaff(user)) {
    return (
      <div style={{ padding: 'var(--gutter-h, 24px)' }}>
        <p>Forbidden. /admin/seo-settings is limited to site-admin and system-admin.</p>
      </div>
    )
  }

  let snapshot = null
  let loadError = ''
  if (payload) {
    try {
      snapshot = await loadSeoAdminSnapshot(payload, {
        adminRoute: props.initPageResult?.req?.payload.config.routes?.admin || '/admin',
      })
    } catch {
      loadError = 'SEO status could not be loaded.'
    }
  }

  const body = (
    <div style={{ padding: 'var(--gutter-h, 24px)', maxWidth: 960 }}>
      {snapshot ? (
        <SeoSettingsPanel snapshot={snapshot} />
      ) : (
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={1} size="h2">
              SEO Settings
            </Title>
            <Text c="dimmed">{loadError || 'SEO status could not be loaded.'}</Text>
          </Stack>
        </Paper>
      )}
    </div>
  )

  if (payload) {
    return (
      <DefaultTemplate {...props} payload={payload} req={req} user={user} visibleEntities={visibleEntities}>
        {body}
      </DefaultTemplate>
    )
  }

  return body
}
