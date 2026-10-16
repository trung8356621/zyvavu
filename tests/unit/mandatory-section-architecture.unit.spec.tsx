import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'
import {
  validateThemeTemplateDocument,
} from '@/lib/theme-engine/validation'
import {
  normalizeThemeTemplateDocument,
  isPageContentContext,
} from '@/lib/theme-engine/normalization'
import {
  getBundledTemplate,
} from '@/lib/theme-engine/resolver'
import {
  INSTALLED_THEMES,
} from '@/lib/theme-engine/themes'
import {
  getEditorConfigForContext,
} from '@/lib/theme-engine/widget-registry-editor'
import {
  ThemeRenderer,
} from '@/lib/theme-engine/renderer'
import {
  sectionEditor,
} from '@/widgets/Section/editor'
import {
  columnsEditor,
} from '@/widgets/Columns/editor'

describe('Mandatory Section Architecture & 3 Bundled Themes Refactor', () => {
  // 1. New Home template requires Sections
  it('1. New Home template requires Sections and rejects root ordinary widgets', () => {
    const invalidHome: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [
        { type: 'TextBlock', props: { id: 'root-tb', title: 'Invalid Root Text' } },
      ],
      zones: {},
    }
    const val = validateThemeTemplateDocument(invalidHome, 'home')
    expect(val.valid).toBe(false)
    expect(val.errors.some((e) => e.includes('requires all root-level content to be Section containers'))).toBe(true)

    const validHome: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [
        { type: 'Section', props: { id: 'home-sec-1' } },
      ],
      zones: {
        'home-sec-1:content': [
          { type: 'TextBlock', props: { id: 'nested-tb', title: 'Valid Nested Text' } },
        ],
      },
    }
    const validVal = validateThemeTemplateDocument(validHome, 'home')
    expect(validVal.valid).toBe(true)
  })

  // 2. New Single Post template requires Sections
  it('2. New Single Post template requires Sections and rejects root ordinary widgets', () => {
    const invalidSingle: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 'root-pt' } },
        { type: 'PostContent', props: { id: 'root-pc' } },
      ],
      zones: {},
    }
    const val = validateThemeTemplateDocument(invalidSingle, 'single')
    expect(val.valid).toBe(false)
    expect(val.errors.some((e) => e.includes('requires all root-level content to be Section containers'))).toBe(true)

    const validSingle: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'Section', props: { id: 'sec-title' } },
        { type: 'Section', props: { id: 'sec-body' } },
      ],
      zones: {
        'sec-title:content': [{ type: 'PostTitle', props: { id: 'pt-nested' } }],
        'sec-body:content': [{ type: 'PostContent', props: { id: 'pc-nested' } }],
      },
    }
    const validVal = validateThemeTemplateDocument(validSingle, 'single')
    expect(validVal.valid).toBe(true)
  })

  // 3. New Page template requires Sections
  it('3. New Page template requires Sections and rejects root ordinary widgets', () => {
    const invalidPage: ThemeTemplateDocument = {
      version: 1,
      template: 'page',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 'page-title' } },
        { type: 'PostContent', props: { id: 'page-content' } },
      ],
      zones: {},
    }
    const val = validateThemeTemplateDocument(invalidPage, 'page')
    expect(val.valid).toBe(false)
    expect(val.errors.some((e) => e.includes('requires all root-level content to be Section containers'))).toBe(true)

    const validPage: ThemeTemplateDocument = {
      version: 1,
      template: 'page',
      root: { props: {} },
      content: [
        { type: 'Section', props: { id: 'page-sec-1' } },
      ],
      zones: {
        'page-sec-1:content': [
          { type: 'PostTitle', props: { id: 'page-title' } },
          { type: 'PostContent', props: { id: 'page-content' } },
        ],
      },
    }
    const validVal = validateThemeTemplateDocument(validPage, 'page')
    expect(validVal.valid).toBe(true)
  })

  // 4. New Category template requires Sections
  it('4. New Category template requires Sections and rejects root ordinary widgets', () => {
    const invalidCategory: ThemeTemplateDocument = {
      version: 1,
      template: 'category',
      root: { props: {} },
      content: [
        { type: 'CategoryHeader', props: { id: 'cat-hdr' } },
        { type: 'RecentPosts', props: { id: 'cat-rec' } },
      ],
      zones: {},
    }
    const val = validateThemeTemplateDocument(invalidCategory, 'category')
    expect(val.valid).toBe(false)
    expect(val.errors.some((e) => e.includes('requires all root-level content to be Section containers'))).toBe(true)

    const validCategory: ThemeTemplateDocument = {
      version: 1,
      template: 'category',
      root: { props: {} },
      content: [
        { type: 'Section', props: { id: 'cat-sec-1' } },
      ],
      zones: {
        'cat-sec-1:content': [
          { type: 'CategoryHeader', props: { id: 'cat-hdr' } },
          { type: 'RecentPosts', props: { id: 'cat-rec' } },
        ],
      },
    }
    const validVal = validateThemeTemplateDocument(validCategory, 'category')
    expect(validVal.valid).toBe(true)
  })

  // 5. Header/Footer remain compatible
  it('5. Header and Footer remain compatible exceptions without mandatory Section wrapping', () => {
    expect(isPageContentContext('header')).toBe(false)
    expect(isPageContentContext('footer')).toBe(false)

    const headerDoc = getBundledTemplate('header', 'corporate')
    const headerVal = validateThemeTemplateDocument(headerDoc, 'header')
    expect(headerVal.valid).toBe(true)
    // Root contains structured Header or header components, not Section
    expect(headerDoc.content.some((item) => item.type === 'Header')).toBe(true)

    const footerDoc = getBundledTemplate('footer', 'corporate')
    const footerVal = validateThemeTemplateDocument(footerDoc, 'footer')
    expect(footerVal.valid).toBe(true)
  })

  // 6. Root-level widgets cannot be inserted directly
  it('6. Editor configuration for page-content templates configures root dropzone for Section only', () => {
    const config = getEditorConfigForContext('home')
    expect(config.root).toBeDefined()
    expect(typeof config.root?.render).toBe('function')

    let dropZoneParams: any = null
    const mockPuck = {
      renderDropZone: (params: any) => {
        dropZoneParams = params
        return <div data-testid="mock-root-dropzone" />
      },
    }

    render(config.root!.render!({ id: 'root', children: <div />, puck: mockPuck as any } as any))
    expect(dropZoneParams).toBeDefined()
    expect(dropZoneParams.allow).toEqual(['Section'])
  })

  // 7. Valid nested widgets are accepted
  it('7. Valid nested widgets inside Section slots are accepted', () => {
    const doc: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 'home-s1' } }],
      zones: {
        'home-s1:content': [
          { type: 'TextBlock', props: { id: 'tb-1' } },
          { type: 'Columns', props: { id: 'col-1', distribution: 'equal-2' } },
        ],
        'col-1:column1': [{ type: 'TextBlock', props: { id: 'tb-col1' } }],
        'col-1:column2': [{ type: 'TextBlock', props: { id: 'tb-col2' } }],
      },
    }
    const val = validateThemeTemplateDocument(doc, 'home')
    expect(val.valid).toBe(true)
  })

  // 8. Invalid nested widgets are rejected
  it('8. Section-inside-Section is disallowed in slot configuration and rejected by validation', () => {
    expect(sectionEditor.fields?.content).toEqual({ type: 'slot', disallow: ['Section'] })
    expect(columnsEditor.fields?.column1).toEqual({ type: 'slot', disallow: ['Section'] })

    const nestedSectionDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 'outer-sec' } }],
      zones: {
        'outer-sec:content': [
          { type: 'Section', props: { id: 'illegal-inner-sec' } },
        ],
      },
    }
    const val = validateThemeTemplateDocument(nestedSectionDoc, 'home')
    expect(val.valid).toBe(false)
    expect(val.errors.some((e) => e.includes('cannot be nested inside zone'))).toBe(true)
  })

  // 9. Required widgets are found recursively
  it('9. Required capabilities are discovered recursively through nested Sections and Columns', () => {
    const deepDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 's-main' } }],
      zones: {
        's-main:content': [
          { type: 'Columns', props: { id: 'c-main', distribution: 'equal-2' } },
        ],
        'c-main:column1': [{ type: 'PostTitle', props: { id: 'pt-deep' } }],
        'c-main:column2': [{ type: 'PostContent', props: { id: 'pc-deep' } }],
      },
    }
    const val = validateThemeTemplateDocument(deepDoc, 'single')
    expect(val.valid).toBe(true)

    // When required PostContent is omitted entirely
    const missingContentDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 's-main' } }],
      zones: {
        's-main:content': [{ type: 'PostTitle', props: { id: 'pt-deep' } }],
      },
    }
    const missingVal = validateThemeTemplateDocument(missingContentDoc, 'single')
    expect(missingVal.valid).toBe(false)
    expect(missingVal.errors.some((e) => e.includes('document.content'))).toBe(true)
  })

  // 10. Unique widget rules work across Sections
  it('10. Unique widget capabilities are enforced across separate Sections', () => {
    const duplicateTitleDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'Section', props: { id: 's-header' } },
        { type: 'Section', props: { id: 's-footer' } },
      ],
      zones: {
        's-header:content': [
          { type: 'PostTitle', props: { id: 'title-1' } },
          { type: 'PostContent', props: { id: 'content-1' } },
        ],
        's-footer:content': [
          { type: 'PostTitle', props: { id: 'title-2' } },
        ],
      },
    }
    const val = validateThemeTemplateDocument(duplicateTitleDoc, 'single')
    expect(val.valid).toBe(false)
    expect(val.errors.some((e) => e.includes('Only one widget with capability'))).toBe(true)
  })

  // 11. Legacy templates normalize without data loss
  it('11. Legacy templates normalize into Sections without losing props, bindings, or zones', () => {
    const legacyDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [
        {
          type: 'TextBlock',
          props: { id: 'tb-hero', title: 'Hero Title', badge: 'New', align: 'center' },
        },
        {
          type: 'Columns',
          props: { id: 'col-features', distribution: 'equal-2' },
        },
      ],
      zones: {
        'col-features:column1': [{ type: 'TextBlock', props: { id: 'col1-txt', title: 'Left' } }],
        'col-features:column2': [{ type: 'TextBlock', props: { id: 'col2-txt', title: 'Right' } }],
      },
    }

    const normalized = normalizeThemeTemplateDocument(legacyDoc)
    expect(normalized.content).toHaveLength(1)
    expect(normalized.content[0].type).toBe('Section')

    const secId = normalized.content[0].props.id
    const secZone = `${secId}:content`
    expect(normalized.zones![secZone]).toBeDefined()
    expect(normalized.zones![secZone]).toHaveLength(2)
    expect(normalized.zones![secZone][0].props.id).toBe('tb-hero')
    expect(normalized.zones![secZone][0].props.title).toBe('Hero Title')
    expect(normalized.zones![secZone][1].props.id).toBe('col-features')

    // Inner zones are fully intact
    expect(normalized.zones!['col-features:column1']).toBeDefined()
    expect(normalized.zones!['col-features:column2']).toBeDefined()
  })

  // 12. Migration is idempotent
  it('12. Normalization is deterministic and idempotent', () => {
    const legacyDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 'pt-1', tag: 'h1' } },
        { type: 'PostContent', props: { id: 'pc-1' } },
      ],
      zones: {},
    }

    const firstPass = normalizeThemeTemplateDocument(legacyDoc)
    const secondPass = normalizeThemeTemplateDocument(firstPass)
    expect(secondPass).toEqual(firstPass)
  })

  // 13. Existing published documents remain renderable
  it('13. Legacy published documents without Sections render on frontend without error', () => {
    const legacyPublishedDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        { type: 'PostTitle', props: { id: 'old-title', title: 'Legacy Live Article' } },
        { type: 'PostContent', props: { id: 'old-content' } },
      ],
      zones: {},
    }

    const html = renderToStaticMarkup(
      <ThemeRenderer
        document={legacyPublishedDoc}
        dataContext={{
          type: 'single',
          document: { title: 'Legacy Live Article' },
        }}
      />,
    )

    expect(html).toContain('zyvavu-widget-section')
    expect(html).toContain('Legacy Live Article')
  })

  // 14. Section styles and child widget styles remain intact
  it('14. Section styling and child widget styles remain isolated and intact', () => {
    const styledDoc: ThemeTemplateDocument = {
      version: 1,
      template: 'single',
      root: { props: {} },
      content: [
        {
          type: 'Section',
          props: {
            id: 'styled-sec',
            containerWidth: 'narrowWidth',
            verticalPadding: 'lg',
            style: {
              background: {
                mode: 'color',
                colorToken: 'surface',
              },
            },
          },
        },
      ],
      zones: {
        'styled-sec:content': [
          {
            type: 'PostTitle',
            props: {
              id: 'child-title',
              title: 'Styled Child Article',
              style: {
                typography: {
                  typography: 'h1',
                  colorToken: 'primary',
                },
              },
            },
          },
          {
            type: 'PostContent',
            props: { id: 'child-content' },
          },
        ],
      },
    }

    const { container } = render(
      <ThemeRenderer
        document={styledDoc}
        dataContext={{ type: 'single', document: { title: 'Styled Child Article' } }}
      />,
    )

    const sectionEl = container.querySelector('#styled-sec')
    expect(sectionEl).toBeTruthy()

    const headingEl = container.querySelector('.zyvavu-widget-post-title__heading')
    expect(headingEl).toBeTruthy()
    expect(headingEl?.textContent).toBe('Styled Child Article')
  })

  // 15. Nested widget drag/drop and save/reload preserve hierarchy
  it('15. Document serialization preserves section hierarchy and zone mappings', () => {
    const bundledSingle = getBundledTemplate('single', 'corporate')
    const serialized = JSON.stringify(bundledSingle)
    const rehydrated = JSON.parse(serialized) as ThemeTemplateDocument

    const val = validateThemeTemplateDocument(rehydrated, 'single')
    expect(val.valid).toBe(true)
    expect(rehydrated.content.every((item) => item.type === 'Section')).toBe(true)
    expect(Object.keys(rehydrated.zones || {}).length).toBeGreaterThanOrEqual(1)
  })

  // 16. Three bundled themes retain their expected content and rendering
  it('16. All 3 bundled themes have valid Section architecture templates for all 5 content contexts', () => {
    const themes = ['corporate', 'editorial', 'industrial']
    const contexts = ['home', 'single', 'page', 'category', 'product'] as const

    for (const themeId of themes) {
      const installed = INSTALLED_THEMES[themeId]
      expect(installed).toBeDefined()
      expect(installed.id).toBe(themeId)

      for (const ctx of contexts) {
        const doc = getBundledTemplate(ctx, themeId)
        expect(doc).toBeDefined()
        expect(doc.template).toBe(ctx)

        // All root items must be Section!
        for (const rootItem of doc.content) {
          expect(rootItem.type).toBe('Section')
        }

        // Must validate cleanly
        const val = validateThemeTemplateDocument(doc, ctx)
        expect(val.valid).toBe(true)
        expect(val.errors).toEqual([])
      }
    }
  })

  // 17. No unexpected theme token changes
  it('17. Preserves each theme\'s distinctive token configurations and identities', () => {
    expect(INSTALLED_THEMES.corporate.label).toBe('Corporate Clean')
    expect(INSTALLED_THEMES.corporate.preview.primary).toBe('#0e6b66')

    expect(INSTALLED_THEMES.editorial.label).toBe('Editorial Modern')
    expect(INSTALLED_THEMES.editorial.preview.primary).toBe('#7c1d2e')

    expect(INSTALLED_THEMES.industrial.label).toBe('Industrial Bold')
    expect(INSTALLED_THEMES.industrial.preview.primary).toBe('#2f6a38')
  })

  // 18. No data loss when switching templates
  it('18. Switching templates in theme engine loads valid isolated instances', () => {
    const homeDoc = getBundledTemplate('home', 'editorial')
    const singleDoc = getBundledTemplate('single', 'editorial')

    expect(homeDoc.template).toBe('home')
    expect(singleDoc.template).toBe('single')
    expect(homeDoc.content[0].props.id).not.toBe(singleDoc.content[0].props.id)

    // Mutating home does not affect single
    homeDoc.content[0].props.containerWidth = 'full'
    expect(singleDoc.content[0].props.containerWidth).not.toBe('full')
  })
})
