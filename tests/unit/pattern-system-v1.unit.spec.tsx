import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, cleanup, act } from '@testing-library/react'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import {
  validatePatternJSON,
  serializeSelectedPattern,
  instantiatePatternJSON,
  inlineSlotsToZones,
  collectPatternTokens,
} from '@/lib/theme-engine/patterns/json'
import {
  ownedPatternAccess,
  guardPatternWrite,
  patternContentHash,
  signCaptureTicket,
  verifyCaptureTicket,
} from '@/lib/theme-engine/patterns/server'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import {
  insertWidgetPattern,
  validatePatternOperation,
  applyWidgetPattern,
  designPatternFromJSON,
  registerWidgetDesignPattern,
  getWidgetDesignPatterns,
} from '@/lib/theme-engine/widget-patterns'
import { ThemeRenderer } from '@/lib/theme-engine/renderer'
import { useMyPatterns } from '@/components/admin/theme-builder/useMyPatterns'
import { PatternThumbnail } from '@/components/admin/theme-builder/PatternPreview'
import { MantineProvider } from '@mantine/core'
const config = getEditorConfigForContext('home')
const base = { root: { props: {} }, content: [] }
const meta = {
  id: 'user-example',
  name: 'Saved pattern',
  description: 'Reusable content',
  category: 'Sections',
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('Canonical Pattern V1', () => {
  it('ships six genuine designs for every enabled widget type and round-trips real JSON', () => {
    expect(SYSTEM_PATTERNS.length).toBeGreaterThanOrEqual(24)
    for (const type of ['TextBlock', 'Section', 'Columns', 'FeaturedMedia']) {
      const patterns = SYSTEM_PATTERNS.filter((pattern) => pattern.widgetType === type)
      expect(patterns).toHaveLength(6)
      expect(new Set(patterns.map((pattern) => patternContentHash(pattern))).size).toBe(6)
    }
    for (const pattern of SYSTEM_PATTERNS) {
      expect(() => validatePatternJSON(pattern)).not.toThrow()
      expect(JSON.parse(JSON.stringify(pattern))).toEqual(pattern)
    }
  })
  it('serializes the full legacy-zone/inline subtree without mutating original data', () => {
    const data = {
      root: { props: {} },
      content: [{ type: 'Section', props: { id: 's' } }],
      zones: {
        's:content': [
          {
            type: 'Columns',
            props: {
              id: 'c',
              distribution: 'equal-2',
              column1: [
                {
                  type: 'TextBlock',
                  props: { id: 't', title: 'Keep this', binding: { source: 'document.title' } },
                },
              ],
            },
          },
        ],
      },
    }
    const snapshot = JSON.stringify(data)
    const record = serializeSelectedPattern(data, 's', meta)
    expect(record.payload.content[0].props.content[0].props.column1[0].props.binding).toEqual({
      source: 'document.title',
    })
    expect(record.payload.zones).toEqual({})
    expect(JSON.stringify(data)).toBe(snapshot)
    let id = 0
    const instance = instantiatePatternJSON(record, config, () => `fresh-${++id}`)
    expect(instance.props.id).toBe('fresh-1')
    expect(instance.props.content[0].props.id).toBe('fresh-2')
    expect(instance.props.content[0].props.column1[0].props.id).toBe('fresh-3')
  })
  it('renders inline Puck Slots through the current SSR renderer and preserves Section root rules', () => {
    const record = SYSTEM_PATTERNS.find((pattern) => pattern.id === 'section-split')!
    const instance = instantiatePatternJSON(record, config, () => crypto.randomUUID())
    const next = insertWidgetPattern(base, instance, 'home', config)
    expect(() => validatePatternOperation(next, base, 'home', config)).not.toThrow()
    const html = renderToStaticMarkup(
      <ThemeRenderer document={{ version: 1, template: 'home', ...next }} />,
    )
    expect(html).toContain('Nội dung nổi bật')
    expect(html).toContain('Thông tin bổ sung')
    expect(next.content[0].props.content[0].props.column1).toHaveLength(1)
    expect(inlineSlotsToZones(next).zones).not.toEqual({})
    expect(() =>
      validatePatternOperation(
        { ...base, content: [{ type: 'TextBlock', props: { id: 'wrong-root' } }] },
        base,
        'home',
        config,
      ),
    ).toThrow(/Section/)
  })
  it('applies media presentation without replacing identity, binding, or selected media', () => {
    const selected = {
      type: 'FeaturedMedia',
      props: {
        id: 'image',
        src: '/api/media/file/real.webp',
        binding: { source: 'document.featuredImage' },
        alt: 'Original',
      },
    }
    const data = insertWidgetPattern(base, selected, 'home', config)
    const pattern = designPatternFromJSON(
      SYSTEM_PATTERNS.find((record) => record.id === 'media-bordered')!,
    )
    const result = applyWidgetPattern(data, pattern, 'image', config)
    const props = result.content[0].props.content[0].props
    expect(props.id).toBe('image')
    expect(props.src).toBe(selected.props.src)
    expect(props.binding).toEqual(selected.props.binding)
    expect(props.alt).toBe('Original')
    expect(() => applyWidgetPattern(data, pattern, result.content[0].props.id, config)).toThrow(
      /incompatible/,
    )
  })
  it('preserves populated legacy zones when inline Slots are empty defaults', () => {
    const child = { type: 'TextBlock', props: { id: 'legacy-text', content: 'Legacy' } }
    const data = {
      content: [{ type: 'Section', props: { id: 'legacy-section', content: [] } }],
      zones: { 'legacy-section:content': [child] },
    }
    expect(inlineSlotsToZones(data).zones['legacy-section:content']).toEqual([child])
    expect(data.content[0].props.content).toEqual([])
  })
  it.each(['runtime', 'unsupported', 'oversized', 'unsafe URL', 'unknown Slot'])(
    'rejects %s payloads',
    (kind) => {
      const record = structuredClone(SYSTEM_PATTERNS[0]) as any
      if (kind === 'runtime') record.payload.content[0].props.dataContext = {}
      if (kind === 'unsupported') record.payload.content[0].type = record.widgetType = 'Unknown'
      if (kind === 'oversized') record.payload.content[0].props.content = 'x'.repeat(262145)
      if (kind === 'unsafe URL') record.payload.content[0].props.ctaUrl = 'javascript:alert(1)'
      if (kind === 'unknown Slot')
        record.payload.content[0].props.fakeSlot = [{ type: 'TextBlock', props: { id: 'child' } }]
      expect(() => validatePatternJSON(record)).toThrow()
    },
  )
  it('enforces depth, duplicate IDs and semantic token metadata', () => {
    const record = structuredClone(
      SYSTEM_PATTERNS.find((pattern) => pattern.id === 'section-split')!,
    )
    record.payload.content[0].props.content[0].props.id = record.payload.content[0].props.id
    expect(() => validatePatternJSON(record)).toThrow(/duplicate/)
    expect(
      collectPatternTokens({
        style: {
          background: { colorToken: 'primary' },
          spacing: { padding: { token: 'lg' } },
          typography: { typography: 'h2' },
        },
      }),
    ).toEqual(['h2', 'lg', 'primary'])
  })
  it('adapts legacy registry extensions into canonical theme patterns', () => {
    registerWidgetDesignPattern({
      id: 'test-theme-pattern',
      version: 1,
      widgetType: 'TextBlock',
      name: 'Theme extension',
      category: 'text',
      compatibility: { builderVersion: 1, widgetTypes: ['TextBlock'] },
      preview: { kind: 'text', label: 'Theme' },
      props: { style: { typography: { typography: 'h2' } } },
      tokenReferences: ['h2'],
    })
    const record = getWidgetDesignPatterns().find(
      (pattern) => pattern.id === 'test-theme-pattern',
    )!.canonical!
    expect(record.source).toBe('theme')
    expect(() => validatePatternJSON(record)).not.toThrow()
  })
})
describe('Pattern privacy and durability', () => {
  it('requires a staff session and constrains reads/updates/deletes to ownership', async () => {
    expect(await ownedPatternAccess({ req: { user: null } } as any)).toBe(false)
    expect(
      await ownedPatternAccess({ req: { user: { id: 7, role: 'site-admin' } } } as any),
    ).toEqual({ owner: { equals: 7 } })
    const record = structuredClone(SYSTEM_PATTERNS[0])
    record.source = 'user'
    const req = { user: { id: 7, role: 'site-admin' }, context: {} }
    expect(() =>
      guardPatternWrite({ data: { record, source: 'system' }, req, operation: 'create' } as any),
    ).toThrow(/immutable/)
    expect(() =>
      guardPatternWrite({ data: { record, owner: 8 }, req, operation: 'create' } as any),
    ).toThrow(/ownership/)
    expect(() =>
      guardPatternWrite({
        data: { record },
        req,
        operation: 'update',
        originalDoc: { owner: 8, record },
      } as any),
    ).toThrow(/Forbidden/)
    const result = await guardPatternWrite({ data: { record }, req, operation: 'create' } as any)
    expect(result.owner).toBe(7)
    expect(result.source).toBe('user')
    expect(result.thumbnailStatus).toBe('pending')
  })
  it('rejects modified/expired capture tickets and content changes during capture', async () => {
    const ticket = {
      key: 'section-airy',
      hash: 'abc',
      themeId: 'corporate',
      expires: Date.now() + 30000,
    }
    const token = signCaptureTicket(ticket, 'test-secret')
    expect(verifyCaptureTicket(token, 'test-secret')).toEqual(ticket)
    expect(verifyCaptureTicket(`${token}bad`, 'test-secret')).toBeNull()
    expect(
      verifyCaptureTicket(
        signCaptureTicket({ ...ticket, expires: Date.now() - 1 }, 'test-secret'),
        'test-secret',
      ),
    ).toBeNull()
    expect(() =>
      guardPatternWrite({
        data: {},
        operation: 'update',
        req: { user: { id: 7, role: 'site-admin' }, context: { expectedPatternHash: 'old' } },
        originalDoc: { owner: 7, contentHash: 'new' },
      } as any),
    ).toThrow(/changed/)
  })
  it('keeps saved JSON available when thumbnail generation fails', async () => {
    const record = structuredClone(SYSTEM_PATTERNS[0])
    record.source = 'user'
    const doc = { id: 1, name: record.name, category: record.category, record, contentHash: 'hash' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ doc }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Capture unavailable' }) })
    vi.stubGlobal('fetch', fetchMock)
    let service: ReturnType<typeof useMyPatterns>
    function Harness() {
      service = useMyPatterns('', false)
      return (
        <div>
          {service.docs.map((item) => (
            <span key={item.id}>
              {item.name}:{item.thumbnailStatus}
            </span>
          ))}
        </div>
      )
    }
    render(<Harness />)
    await act(async () => {
      const saved = await service.save(record)
      await service.thumbnail(saved)
    })
    expect(service!.docs).toHaveLength(1)
    expect(service!.docs[0].record).toEqual(record)
    expect(service!.docs[0].thumbnailStatus).toBe('failed')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })
  it('shows an explicit thumbnail fallback, never a fake successful preview', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    const record = {
      ...SYSTEM_PATTERNS.find((pattern) => pattern.widgetType === 'Section')!,
      thumbnail: { version: 1, status: 'failed' as const },
    }
    render(
      <MantineProvider>
        <PatternThumbnail record={record} />
      </MantineProvider>,
    )
    expect(screen.getByText('Thumbnail unavailable')).toBeTruthy()
  })
})
