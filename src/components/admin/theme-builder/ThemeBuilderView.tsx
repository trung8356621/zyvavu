import React from 'react'
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
  resolveActiveThemeConfig,
  normalizeThemeId,
  getAllInstalledThemes,
  getBundledTemplateForTheme,
} from '@/lib/theme-engine'
import {
  listLoopItemTemplates,
  resolveLoopItemTemplate,
} from '@/lib/theme-engine/loop-item-templates'
import { ThemeBuilder } from './ThemeBuilder'
import { loadPublicSiteSettings } from '@/lib/site/settings'

export async function ThemeBuilderView(props: AdminViewServerProps) {
  try {
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
                component="a"
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
    const activeThemeId = await resolveActiveThemeId(payload).catch(() => 'corporate')
    const targetThemeId = normalizeThemeId(
      (resolvedSearchParams?.theme as string) || activeThemeId,
    )

    // Resolve all templates for target theme
    const templateKeys: TemplateContext[] = [
      'single',
      'page',
      'home',
      'header',
      'footer',
      'category',
      'product',
      'loopItem',
    ]
    const initialTemplates: Record<string, ThemeTemplateDocument> = {}

    for (const key of templateKeys) {
      if (key === 'loopItem') continue
      try {
        const resolved = await resolveThemeTemplate(payload, key, targetThemeId)
        initialTemplates[key] = resolved || getBundledTemplateForTheme(targetThemeId, key)
      } catch {
        initialTemplates[key] = getBundledTemplateForTheme(targetThemeId, key)
      }
    }

    const loopItems = await listLoopItemTemplates(payload, targetThemeId).catch(() => [])
    const loopDocuments: Record<string, ThemeTemplateDocument> = {}
    for (const meta of loopItems) {
      const doc = await resolveLoopItemTemplate(payload, meta.id, targetThemeId).catch(() => null)
      if (doc) loopDocuments[meta.id] = doc
    }

    const rawContext = resolvedSearchParams?.template
    const initialContext = (
      typeof rawContext === 'string' && templateKeys.includes(rawContext as TemplateContext)
        ? rawContext
        : 'single'
    ) as TemplateContext
    const rawLoopItem = resolvedSearchParams?.loopItem
    const initialLoopItemId =
      typeof rawLoopItem === 'string' && loopItems.some((item) => item.id === rawLoopItem)
        ? rawLoopItem
        : loopItems[0]?.id

    const installedThemes = getAllInstalledThemes()
    const activeThemeConfig = await resolveActiveThemeConfig(payload, targetThemeId).catch(() => undefined)
    const { contactEntries } = await loadPublicSiteSettings(payload)

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
          initialLoopItemId={initialLoopItemId}
          initialLoopItems={loopItems}
          initialLoopDocuments={loopDocuments}
          themeConfig={activeThemeConfig}
          contactEntries={contactEntries}
          libraryLanguage={req?.i18n?.language}
        />
      </div>
    )
  } catch (error: any) {
    console.error('[ThemeBuilderView] Server render error:', error)
    return (
      <div
        style={{
          padding: 32,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f8fafc',
        }}
      >
        <Paper p="xl" withBorder style={{ maxWidth: 480, width: '100%' }}>
          <Stack gap="md">
            <Title order={3} c="red">Theme Builder Unavailable</Title>
            <Text size="sm" c="dimmed">
              An error occurred while loading the Visual Theme Builder: {error?.message || String(error)}
            </Text>
            <Button component="a" href="/admin" variant="default">
              Return to Admin Dashboard
            </Button>
          </Stack>
        </Paper>
      </div>
    )
  }
}
