import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { Button, Paper, Stack, Text, Title } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'

import config from '@payload-config'
import { isSiteStaff } from '@/access/roles'
import type { TemplateContext, ThemeTemplateDocument } from '@/lib/theme-engine/types'
import {
  resolveThemeTemplate,
  resolveActiveThemeId,
  normalizeThemeId,
  getAllInstalledThemes,
} from '@/lib/theme-engine'
import { ThemeBuilder } from './ThemeBuilder'

export async function ThemeBuilderView(props: AdminViewServerProps) {
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
              Theme Builder is limited to site-admin and system-admin roles.
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

  // Resolve target theme from searchParams (?theme=<id>) or active theme
  const resolvedSearchParams = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : undefined
  const activeThemeId = await resolveActiveThemeId(payload)
  const targetThemeId = normalizeThemeId(
    (resolvedSearchParams?.theme as string) || activeThemeId,
  )

  // Resolve all templates for target theme
  const templateKeys: TemplateContext[] = ['single', 'page', 'home', 'header', 'footer', 'category', 'product']
  const initialTemplates: Record<string, ThemeTemplateDocument> = {}

  for (const key of templateKeys) {
    try {
      initialTemplates[key] = await resolveThemeTemplate(payload, key, targetThemeId)
    } catch {
      // safe fallback
    }
  }

  const rawContext = resolvedSearchParams?.template
  const initialContext = (
    typeof rawContext === 'string' && templateKeys.includes(rawContext as TemplateContext)
      ? rawContext
      : 'single'
  ) as TemplateContext

  const installedThemes = getAllInstalledThemes()

  return (
    <div
      className="zyvavu-fullscreen-builder-layout"
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
      <ThemeBuilder
        themeId={targetThemeId}
        activeThemeId={activeThemeId}
        installedThemes={installedThemes}
        initialTemplates={initialTemplates as Record<TemplateContext, ThemeTemplateDocument>}
        initialContext={initialContext}
      />
    </div>
  )
}
