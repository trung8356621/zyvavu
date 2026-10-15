import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'

import config from '@payload-config'
import { isSiteStaff } from '@/access/roles'
import type { TemplateContext, ThemeTemplateDocument } from '@/lib/theme-engine/types'
import { resolveThemeTemplate } from '@/lib/theme-engine/resolver'
import { ThemeBuilder } from './ThemeBuilder'

export async function ThemeBuilderView(props: AdminViewServerProps) {
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
        <p>Forbidden. Theme Builder is limited to site-admin and system-admin.</p>
      </div>
    )
  }

  // Resolve all templates
  const templateKeys: TemplateContext[] = ['single', 'page', 'home', 'header', 'footer', 'category', 'product']
  const initialTemplates: Record<string, ThemeTemplateDocument> = {}

  for (const key of templateKeys) {
    try {
      initialTemplates[key] = await resolveThemeTemplate(payload, key)
    } catch {
      // safe fallback
    }
  }

  // Check searchParams for initial template
  const resolvedSearchParams = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : undefined
  const rawContext = resolvedSearchParams?.template
  const initialContext = (
    typeof rawContext === 'string' && templateKeys.includes(rawContext as TemplateContext)
      ? rawContext
      : 'single'
  ) as TemplateContext

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
        <ThemeBuilder
          initialTemplates={initialTemplates as Record<TemplateContext, ThemeTemplateDocument>}
          initialContext={initialContext}
        />
      </div>
    </DefaultTemplate>
  )
}
