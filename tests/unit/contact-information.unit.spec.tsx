/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import {
  buildTelHref,
  normalizeContactEntries,
  SAMPLE_CONTACT_ENTRIES,
  type ContactEntry,
} from '@/lib/site/contact'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { getFrontendWidget } from '@/lib/theme-engine/widget-registry-frontend'
import {
  getAllWidgetManifests,
  getWidgetManifest,
} from '@/lib/theme-engine/widget-registry-manifests'
import { getTemplatePolicy } from '@/lib/theme-engine/policy'
import { ContactInformationFrontend } from '@/widgets/ContactInformation/frontend'
import { createContactInformationEditor } from '@/widgets/ContactInformation/editor'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

const baseEntries: ContactEntry[] = SAMPLE_CONTACT_ENTRIES.map((entry, order) => ({
  ...entry,
  order,
}))

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})

describe('ContactInformation widget registry + SSR', () => {
  it('uses a saved Site Settings icon in both SSR and Puck without changing widget props', () => {
    const props = { entryIds: ['contact-phone'] }
    const icon = { source: 'media', mediaId: 42, mediaUrl: '/api/media/file/hotline.webp', recolorable: false }
    const saved = normalizeContactEntries(JSON.parse(JSON.stringify([{ ...baseEntries[0], icon }])))
    expect(saved[0].icon).toEqual(icon)
    const ssr = renderToStaticMarkup(<ContactInformationFrontend {...props} dataContext={{
      type: 'home', site: { contactEntries: saved },
    }} />)
    const { render: Editor } = createContactInformationEditor(saved)
    const editor = renderToStaticMarkup(<Editor {...props as React.ComponentProps<typeof Editor>} />)
    for (const output of [ssr, editor]) {
      expect(output).toContain('/api/media/file/hotline.webp')
      expect(output).not.toContain('lucide-phone')
    }
    const legacy = normalizeContactEntries([{ ...baseEntries[0], icon: { ...icon, mediaUrl: 'javascript:alert(1)' } }])
    expect(legacy[0].icon).toBeUndefined()
    const fallback = renderToStaticMarkup(<ContactInformationFrontend {...props} previewEntries={legacy} />)
    expect(fallback).toContain('lucide-phone')
    const hidden = renderToStaticMarkup(<ContactInformationFrontend {...props} previewEntries={saved} showIcons={false} />)
    expect(hidden).not.toContain('hotline.webp')
    expect(props).toEqual({ entryIds: ['contact-phone'] })
  })

  it('registers manifest, editor, and frontend for MCP discovery', () => {
    const manifest = getWidgetManifest('ContactInformation')
    expect(manifest?.id).toBe('ContactInformation')
    expect(manifest?.label).toBe('Contact Information')
    expect(manifest?.capabilities).toContain('site.contact')
    expect(getAllWidgetManifests().ContactInformation).toBeDefined()
    expect(getFrontendWidget('ContactInformation')?.component).toBeTruthy()

    for (const context of ['home', 'page', 'single', 'category', 'footer'] as const) {
      expect(getTemplatePolicy(context).allowedWidgets).toContain('ContactInformation')
      const editor = getEditorConfigForContext(context)
      expect(editor.components?.ContactInformation).toBeDefined()
      expect(editor.components?.ContactInformation?.fields?.entryIds).toBeDefined()
      expect(editor.components?.ContactInformation?.fields?.preset).toBeDefined()
    }
  })

  it('stores entry ids only — not duplicated contact values in default props', () => {
    const manifest = getWidgetManifest('ContactInformation')
    const defaults = manifest?.defaultProps || {}
    expect(Array.isArray(defaults.entryIds)).toBe(true)
    expect(JSON.stringify(defaults)).not.toMatch(/\+84 1900 8888/)
    expect(JSON.stringify(defaults)).not.toMatch(/hello@zyvavu\.test/)
  })

  it('renders all three presets and presentation toggles from site data', () => {
    const site = { contactEntries: baseEntries }
    for (const preset of ['vertical', 'inline', 'cards'] as const) {
      const html = renderToStaticMarkup(
        <ContactInformationFrontend
          entryIds={['contact-phone', 'contact-email', 'contact-address']}
          preset={preset}
          showLabels
          showIcons
          dataContext={{ type: 'home', site }}
        />,
      )
      expect(html).toContain('zyvavu-widget-contact--' + preset)
      expect(html).toContain('tel:')
      expect(html).toContain('mailto:')
      expect(html).toContain('Hotline')
      expect(html).toContain('aria-label')
    }

    const noLabels = renderToStaticMarkup(
      <ContactInformationFrontend
        entryIds={['contact-facebook']}
        showLabels={false}
        showIcons={false}
        dataContext={{ type: 'home', site }}
      />,
    )
    expect(noLabels).toContain('Zyvavu on Facebook')
    expect(noLabels).toContain('https://facebook.com/zyvavu')
    expect(noLabels).not.toContain('zyvavu-widget-contact__label')
  })

  it('updates rendered value when site settings change without changing puck props', () => {
    const props = {
      entryIds: ['contact-phone'],
      preset: 'vertical' as const,
      showLabels: true,
      showIcons: true,
    }
    const first = renderToStaticMarkup(
      <ContactInformationFrontend
        {...props}
        dataContext={{
          type: 'home',
          site: {
            contactEntries: [
              { entryId: 'contact-phone', key: 'Hotline', value: '111', semantics: 'phone', order: 0 },
            ],
          },
        }}
      />,
    )
    const second = renderToStaticMarkup(
      <ContactInformationFrontend
        {...props}
        dataContext={{
          type: 'home',
          site: {
            contactEntries: [
              {
                entryId: 'contact-phone',
                key: 'Hotline Renamed',
                value: '222',
                semantics: 'phone',
                order: 0,
              },
            ],
          },
        }}
      />,
    )
    expect(first).toContain('111')
    expect(second).toContain('222')
    expect(second).toContain('Hotline Renamed')
    expect(second).toContain(buildTelHref('222') || 'tel:222')
  })

  it('SSR ThemeRenderer outputs contact widget without leaking deleted entries', () => {
    const doc: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      content: [
        {
          type: 'ContactInformation',
          props: {
            id: 'contact-1',
            entryIds: ['contact-phone', 'deleted-entry', 'contact-email'],
            showLabels: true,
            showIcons: true,
            preset: 'inline',
          },
        },
      ],
    }
    const html = renderToStaticMarkup(
      <ThemeRenderer
        document={doc}
        dataContext={{
          type: 'home',
          site: { contactEntries: baseEntries },
        }}
      />,
    )
    expect(html).toContain('zyvavu-widget-contact')
    expect(html).toContain('Hotline')
    expect(html).toContain('hello@zyvavu.test')
    expect(html).not.toContain('deleted-entry')
  })
})
