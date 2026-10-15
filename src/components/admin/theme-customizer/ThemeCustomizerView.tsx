import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'

import config from '@payload-config'
import { isSiteStaff } from '@/access/roles'
import {
  getActiveThemeConfig,
  resolveActiveThemeConfig,
  resolveCustomPresets,
  resolveDraftThemeConfig,
} from '@/lib/theme-engine/styles'
import { ThemeCustomizer } from './ThemeCustomizer'

export async function ThemeCustomizerView(props: AdminViewServerProps) {
  const anyProps = props as Record<string, any>
  const req = props.initPageResult?.req || anyProps.req
  const user = req?.user || anyProps.user
  const payload = req?.payload || anyProps.payload || (await getPayload({ config }))
  const visibleEntities =
    props.initPageResult?.visibleEntities ||
    anyProps.visibleEntities || { collections: {}, globals: {} }

  if (!isSiteStaff(user)) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Forbidden. Theme Customizer is limited to site-admin and system-admin.</p>
      </div>
    )
  }

  const bundledConfig = getActiveThemeConfig()
  const publishedConfig = await resolveActiveThemeConfig(payload).catch(() => bundledConfig)
  const draftConfig = await resolveDraftThemeConfig(payload).catch(() => publishedConfig)
  const customPresets = await resolveCustomPresets(payload).catch(() => ({ colors: [], typography: [] }))

  // Discover sample preview routes
  const previewRoutes: { label: string; value: string }[] = [{ label: 'Home Page', value: '/' }]

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
        value: `/posts/${postDoc.docs[0].slug}`,
      })
    } else {
      previewRoutes.push({ label: 'Posts Archive', value: '/posts' })
    }
  } catch {
    previewRoutes.push({ label: 'Posts Archive', value: '/posts' })
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
        value: `/${pageDoc.docs[0].slug}`,
      })
    }
  } catch {
    // Ignore
  }

  return (
    <DefaultTemplate
      {...props}
      payload={payload}
      req={req}
      user={user}
      visibleEntities={visibleEntities}
    >
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <ThemeCustomizer
          bundledConfig={bundledConfig}
          publishedConfig={publishedConfig}
          draftConfig={draftConfig}
          customPresets={customPresets}
          previewRoutes={previewRoutes}
        />
      </div>
    </DefaultTemplate>
  )
}
