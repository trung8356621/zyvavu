import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { Button, Paper, Stack, Text, Title } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'

import config from '@payload-config'
import { isSiteStaff } from '@/access/roles'
import { getAllInstalledThemes, resolveActiveThemeId } from '@/lib/theme-engine'
import { ThemesGallery } from './ThemesGallery'

export async function ThemesListView(props: AdminViewServerProps) {
  const anyProps = props as Record<string, any>
  const req = props.initPageResult?.req || anyProps.req
  const user = req?.user || anyProps.user
  const payload = req?.payload || anyProps.payload || (await getPayload({ config }))

  if (!isSiteStaff(user)) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Paper p="xl" radius="md" withBorder style={{ maxWidth: 450, width: '100%' }}>
          <Stack gap="md">
            <Title order={2} size="h3" c="red">
              Access Forbidden
            </Title>
            <Text size="sm">
              Themes management is restricted to site-admin and system-admin roles.
            </Text>
            <Button
              component={Link}
              href="/admin"
              variant="light"
              color="gray"
              leftSection={<ArrowLeft size={16} />}
            >
              Back to Dashboard
            </Button>
          </Stack>
        </Paper>
      </div>
    )
  }

  const activeThemeId = await resolveActiveThemeId(payload)
  const installedThemes = getAllInstalledThemes()

  return (
    <div className="zyvavu-themes-list-container" style={{ minHeight: '100dvh', paddingBottom: 48 }}>
      <ThemesGallery
        installedThemes={installedThemes}
        initialActiveThemeId={activeThemeId}
      />
    </div>
  )
}
