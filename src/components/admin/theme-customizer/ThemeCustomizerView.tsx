import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { Button, Paper, Stack, Text, Title } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'

import config from '@payload-config'
import { isSiteStaff } from '@/access/roles'
import {
  getActiveThemeConfig,
  resolveActiveThemeConfig,
  resolveCustomPresets,
  resolveDraftThemeConfig,
  resolveActiveThemeId,
  normalizeThemeId,
  getAllInstalledThemes,
} from '@/lib/theme-engine'
import { ThemeCustomizer } from './ThemeCustomizer'

export async function ThemeCustomizerView(props: AdminViewServerProps) {
  const anyProps = props as Record<string, any>
  const req = props.initPageResult?.req || anyProps.req
  const user = req?.user || anyProps.user
  const payload = req?.payload || anyProps.payload || (await getPayload({ config }))

  if (!isSiteStaff(user)) {
    return (
      <div
        className="zyvavu-fullscreen-builder-forbidden"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
          padding: '24px',
          boxSizing: 'border-box',
          zIndex: 9999,
        }}
      >
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{
            backgroundColor: 'var(--zyvavu-surface, #ffffff)',
            maxWidth: '500px',
            width: '100%',
          }}
        >
          <Stack gap="md">
            <Title order={2} size="h3" c="red">
              Access Forbidden
            </Title>
            <Text size="sm">
              Theme Customizer is limited to site-admin and system-admin roles.
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

  // Resolve target theme to customize from searchParams (?theme=<id>) or active theme
  const resolvedSearchParams = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : undefined
  const activeThemeId = await resolveActiveThemeId(payload)
  const targetThemeId = normalizeThemeId(
    (resolvedSearchParams?.theme as string) || activeThemeId,
  )

  const bundledConfig = getActiveThemeConfig(targetThemeId)
  const publishedConfig = await resolveActiveThemeConfig(payload, targetThemeId).catch(() => bundledConfig)
  const draftConfig = await resolveDraftThemeConfig(payload, targetThemeId).catch(() => publishedConfig)
  const customPresets = await resolveCustomPresets(payload).catch(() => ({ colors: [], typography: [] }))
  const installedThemes = getAllInstalledThemes()

  // Discover sample preview routes
  const previewRoutes: { label: string; value: string }[] = [
    { label: 'Home Page', value: `/?preview_theme=${targetThemeId}` },
  ]

  try {
    const postDoc = await payload.find({
      collection: 'posts',
      where: { _status: { equals: 'published' } },
      limit: 1,
      overrideAccess: true,
    })
    if (postDoc.docs?.[0]?.slug) {
      previewRoutes.push({
        label: `Post: ${postDoc.docs[0].title || postDoc.docs[0].slug}`,
        value: `/posts/${postDoc.docs[0].slug}?preview_theme=${targetThemeId}`,
      })
    } else {
      previewRoutes.push({ label: 'Posts Archive', value: `/posts?preview_theme=${targetThemeId}` })
    }
  } catch {
    previewRoutes.push({ label: 'Posts Archive', value: `/posts?preview_theme=${targetThemeId}` })
  }

  try {
    const pageDoc = await payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      limit: 1,
      overrideAccess: true,
    })
    if (pageDoc.docs?.[0]?.slug) {
      previewRoutes.push({
        label: `Page: ${pageDoc.docs[0].title || pageDoc.docs[0].slug}`,
        value: `/${pageDoc.docs[0].slug}?preview_theme=${targetThemeId}`,
      })
    }
  } catch {
    // Ignore
  }

  return (
    <div
      className="zyvavu-fullscreen-customizer-layout"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        zIndex: 1,
        backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
      }}
    >
      <ThemeCustomizer
        themeId={targetThemeId}
        activeThemeId={activeThemeId}
        installedThemes={installedThemes}
        bundledConfig={bundledConfig}
        publishedConfig={publishedConfig}
        draftConfig={draftConfig}
        customPresets={customPresets}
        previewRoutes={previewRoutes}
      />
    </div>
  )
}
