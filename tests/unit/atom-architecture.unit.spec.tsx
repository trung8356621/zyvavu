import React from 'react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import {
  ATOM_TYPES,
  SYSTEM_BLOCKS,
  collectTemplateWidgets,
  createRoleTemplate,
  validateFixedBinding,
  withRoleContract,
  hasThemeLibrary,
  homeHeadingWarning,
} from '@/lib/theme-engine/widget-contracts'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { getFrontendWidget } from '@/lib/theme-engine/widget-registry-frontend'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import {
  applyWidgetPattern,
  canApplyWidgetPattern,
  designPatternFromJSON,
  validatePatternOperation,
  insertWidgetPattern,
  instantiatePattern,
} from '@/lib/theme-engine/widget-patterns'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import { serializeSelectedPattern, validatePatternJSON } from '@/lib/theme-engine/patterns/json'
import { AtomModal } from '@/components/admin/theme-builder/AtomModals'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'
import category from '@/themes/default/templates/category.json'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const config = getEditorConfigForContext('single')
describe('Atom and role architecture', () => {
  it('registers the four atoms consistently and renders real content', () => {
    for (const type of ATOM_TYPES) {
      expect(getWidgetManifest(type)?.id).toBe(type)
      expect(config.components[type]).toBeDefined()
      const Component = getFrontendWidget(type)!.component!
      expect(renderToStaticMarkup(<Component text="Example" src="/example.webp" />)).toContain(
        type === 'Image' ? '/example.webp' : 'Example',
      )
    }
  })
  it('validates strict inline role templates across supported contexts', () => {
    for (const context of ['single', 'page', 'category'] as const) {
      const doc = createRoleTemplate(context)
      expect(validateThemeTemplateDocument(doc, context).errors).toEqual([])
      expect(collectTemplateWidgets(doc)).toHaveLength(3)
      const missing = structuredClone(doc)
      missing.content[0].props.content.shift()
      expect(validateThemeTemplateDocument(missing, context).valid).toBe(false)
    }
  })
  it('rejects nested duplicates without blocking independent style edits', () => {
    const doc = createRoleTemplate('single')
    const duplicate = structuredClone(doc)
    duplicate.content[0].props.content.push({
      ...duplicate.content[0].props.content[0],
      props: { ...duplicate.content[0].props.content[0].props, id: 'another-title' },
    })
    expect(validateThemeTemplateDocument(duplicate, 'single', doc).errors.join()).toContain(
      'unique',
    )
    const styled = structuredClone(doc)
    styled.content[0].props.content[0].props.style = { typography: 'h2' }
    expect(validateThemeTemplateDocument(styled, 'single', doc).valid).toBe(true)
  })
  it('preserves legacy Category JSON and requires an explicit complete upgrade', () => {
    const doc = category as ThemeTemplateDocument
    const original = JSON.stringify(doc)
    expect(validateThemeTemplateDocument(doc, 'category', doc).errors).toEqual([])
    expect(validateThemeTemplateDocument(withRoleContract(doc), 'category', doc).valid).toBe(false)
    expect(JSON.stringify(doc)).toBe(original)
  })
  it('protects descriptors and content overrides at import and save boundaries', () => {
    for (const [type, descriptor] of Object.entries(SYSTEM_BLOCKS)) {
      const node = { type, props: { id: type, binding: descriptor.binding, role: descriptor.role } }
      expect(validateFixedBinding(node)).toEqual([])
      expect(
        validateFixedBinding({ ...node, props: { ...node.props, text: 'Injected' } }),
      ).not.toEqual([])
      const record = structuredClone(SYSTEM_PATTERNS.find((p) => p.widgetType === type)!)
      record.payload.content[0].props.binding = 'other'
      expect(() => validatePatternJSON(record)).toThrow('binding')
    }
  })
  it('prevents identity replacement and contract downgrade', () => {
    const doc = createRoleTemplate('single')
    const next = structuredClone(doc)
    next.content[0].props.content[0].type = 'Heading'
    expect(validateThemeTemplateDocument(next, 'single', doc).errors.join()).toContain('identity')
    expect(validateThemeTemplateDocument({ ...doc, metadata: {} }, 'single', doc).valid).toBe(false)
  })
  it('ignores injected values when rendering dynamic blocks and keeps date/category separate', () => {
    const doc = createRoleTemplate('single')
    const nodes = doc.content[0].props.content
    nodes.splice(
      1,
      0,
      ...['DocumentDate', 'DocumentCategory'].map((type) => ({
        type,
        props: {
          id: type,
          ...getWidgetManifest(type)!.defaultProps,
          style: { typography: type === 'DocumentDate' ? 'p1' : 'p2' },
        },
      })),
    )
    nodes[0].props.text = 'Injected'
    const html = renderToStaticMarkup(
      <ThemeRenderer
        document={doc}
        dataContext={{
          type: 'single',
          document: {
            title: 'Real title',
            createdAt: '2026-01-01',
            categories: [{ title: 'News' }],
          },
        }}
      />,
    )
    expect(html).toContain('Real title')
    expect(html).not.toContain('Injected')
    expect(html).toContain('News')
    expect(html).toContain('--zyvavu-theme-p1-size')
    expect(html).toContain('--zyvavu-theme-p2-size')
  })
  it('applies Atom presentation to a matching System Block while retaining role and binding', () => {
    const doc = createRoleTemplate('single')
    const pattern = designPatternFromJSON(SYSTEM_PATTERNS.find((p) => p.widgetType === 'Heading')!)
    const selected = doc.content[0].props.content[0]
    expect(canApplyWidgetPattern(pattern, selected)).toBe(true)
    const next = applyWidgetPattern(doc, pattern, selected.props.id, config)
    const updated = collectTemplateWidgets(next).find((n) => n.props.id === selected.props.id)!
    expect(updated.props.binding).toBe('document.title')
    expect(updated.props.role).toBe('document.title')
    expect(doc.content[0].props.content[0].props.style).toBeUndefined()
    expect(() => validatePatternOperation(next, doc, 'single', config)).not.toThrow()
  })
  it('rejects duplicate insertion before mutation and round-trips canonical bindings', () => {
    const doc = createRoleTemplate('single')
    const record = serializeSelectedPattern(doc, 'single-title', {
      id: 'test-title',
      name: 'Title',
      description: '',
      category: 'title',
    })
    validatePatternJSON(JSON.parse(JSON.stringify(record)))
    const item = instantiatePattern(designPatternFromJSON(record), config, () => 'second-title')
    const next = insertWidgetPattern(doc, item, 'single', config)
    expect(() => validatePatternOperation(next, doc, 'single', config)).toThrow('unique')
    expect(collectTemplateWidgets(doc)).toHaveLength(3)
  })
  it('limits Theme visibility and makes Home SEO advisory', () => {
    expect(['single', 'page', 'category'].every(hasThemeLibrary)).toBe(true)
    expect(['home', 'header', 'footer'].some(hasThemeLibrary)).toBe(false)
    const home: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [],
    }
    expect(homeHeadingWarning(home)).toContain('Saving is allowed')
    expect(validateThemeTemplateDocument(home, 'home').valid).toBe(true)
  })
  it.each(ATOM_TYPES)(
    '%s opens its own Settings shell and the shared Link shell without document mutation',
    (type) => {
      const doc = createRoleTemplate('single')
      const before = JSON.stringify(doc)
      const anchor = document.createElement('button')
      let closed = 0
      const props = {
        request: { id: 'atom-1', type, kind: 'settings' as const, anchor },
        onClose: () => {
          closed++
        },
      }
      const view = render(
        <MantineProvider>
          <AtomModal {...props} />
        </MantineProvider>,
      )
      expect(screen.getByText(`${type} Settings`)).toBeDefined()
      const close = screen.getByLabelText(/close/i)
      fireEvent.click(close)
      expect(closed).toBe(1)
      view.rerender(
        <MantineProvider>
          <AtomModal {...props} request={{ ...props.request, kind: 'link' }} />
        </MantineProvider>,
      )
      expect(screen.getByText('Link')).toBeDefined()
      expect(JSON.stringify(doc)).toBe(before)
    },
  )
})
