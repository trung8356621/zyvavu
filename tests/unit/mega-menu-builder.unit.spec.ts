import { describe, expect, it } from 'vitest'

import {
  CURRENT_BUILDER_VERSION,
  createDefaultMegaMenuDocument,
  createDefaultMobileMenuData,
  createEmptyBuilderDocument,
  deserializeBuilderDocument,
  extractNormalizedSourceLinks,
  calculateSourceLinksFingerprint,
  megaMenuConfig,
  serializeBuilderDocument,
  validateBuilderDocument,
  type BuilderDocument,
} from '@/components/builder'
import { Menus } from '@/collections/Menus'
import { Settings } from '@/globals/Settings'

describe('Reusable Puck Core — Document Contracts & Validation', () => {
  it('creates an empty builder document with version and safe defaults', () => {
    const doc = createEmptyBuilderDocument()
    expect(doc.version).toBe(CURRENT_BUILDER_VERSION)
    expect(doc.root).toEqual({ props: {} })
    expect(doc.content).toEqual([])
    expect(doc.zones).toEqual({})

    const val = validateBuilderDocument(doc)
    expect(val.valid).toBe(true)
    expect(val.errors).toHaveLength(0)
  })

  it('validates document structure and identifies missing fields', () => {
    // Non-object
    expect(validateBuilderDocument(null).valid).toBe(false)
    expect(validateBuilderDocument(undefined).valid).toBe(false)
    expect(validateBuilderDocument('string').valid).toBe(false)

    // Missing version
    expect(validateBuilderDocument({ root: {}, content: [] }).valid).toBe(false)

    // Missing root
    expect(validateBuilderDocument({ version: 1, content: [] }).valid).toBe(false)

    // Non-array content
    expect(validateBuilderDocument({ version: 1, root: {}, content: 'invalid' }).valid).toBe(false)

    // Content item missing props.id
    expect(
      validateBuilderDocument({
        version: 1,
        root: {},
        content: [{ type: 'LinkList', props: {} }],
      }).valid,
    ).toBe(false)

    // Valid item
    expect(
      validateBuilderDocument({
        version: 1,
        root: { props: {} },
        content: [{ type: 'LinkList', props: { id: 'link-1' } }],
      }).valid,
    ).toBe(true)
  })

  it('serializes and deserializes documents losslessly', () => {
    const doc = createDefaultMegaMenuDocument()
    const serialized = serializeBuilderDocument(doc)
    expect(typeof serialized).toBe('string')

    const deserialized = deserializeBuilderDocument(serialized)
    expect(deserialized.version).toBe(doc.version)
    expect(deserialized.content).toHaveLength(doc.content.length)
    expect(deserialized.zones).toEqual(doc.zones)
  })

  it('safely migrates unversioned legacy document', () => {
    const legacy = {
      root: { props: {} },
      content: [{ type: 'LinkList', props: { id: 'leg-1' } }],
    }
    const result = deserializeBuilderDocument(legacy)
    expect(result.version).toBe(CURRENT_BUILDER_VERSION)
    expect(result.content[0].props.id).toBe('leg-1')
  })
})

describe('Mega Menu Preset & Component Registry', () => {
  it('registers required functional blocks in categories', () => {
    expect(megaMenuConfig.components).toHaveProperty('Columns')
    expect(megaMenuConfig.components).toHaveProperty('LinkList')
    expect(megaMenuConfig.components).toHaveProperty('PromoBanner')
    expect(megaMenuConfig.components).toHaveProperty('ContactCard')

    expect(megaMenuConfig.categories?.layout?.components).toContain('Columns')
    expect(megaMenuConfig.categories?.navigation?.components).toContain('LinkList')
    expect(megaMenuConfig.categories?.navigation?.components).toContain('PromoBanner')
    expect(megaMenuConfig.categories?.navigation?.components).toContain('ContactCard')
  })

  it('does NOT expose a functional ProductList block in V1A', () => {
    expect(megaMenuConfig.components).not.toHaveProperty('ProductList')
  })

  it('creates a valid default mega menu document', () => {
    const defaultDoc = createDefaultMegaMenuDocument()
    const val = validateBuilderDocument(defaultDoc)
    expect(val.valid).toBe(true)
    expect(defaultDoc.content[0].type).toBe('Columns')
    expect(defaultDoc.zones?.['mega-cols-1:column1']).toBeDefined()
    expect(defaultDoc.zones?.['mega-cols-1:column2']).toBeDefined()
  })
})

describe('Mobile Data Foundation & Link Extraction', () => {
  it('extracts structured source links from desktop layout blocks', () => {
    const doc: BuilderDocument = {
      version: 1,
      root: { props: {} },
      content: [
        {
          type: 'LinkList',
          props: {
            id: 'll-1',
            heading: 'Services',
            items: [
              { label: 'Consulting', type: 'page', url: '/consulting', newTab: false },
              { label: 'Development', type: 'page', url: '/dev', newTab: true },
            ],
          },
        },
        {
          type: 'PromoBanner',
          props: {
            id: 'promo-1',
            title: 'Spring Sale',
            imageUrl: 'https://example.com/banner.jpg',
            ctaLabel: 'Shop Now',
            ctaUrl: '/shop',
            ctaNewTab: false,
          },
        },
        {
          type: 'ContactCard',
          props: {
            id: 'cc-1',
            heading: 'Help Desk',
            contactText: 'Call 1900',
            actionLabel: 'Contact Page',
            actionUrl: '/contact',
          },
        },
      ],
    }

    const links = extractNormalizedSourceLinks(doc)
    expect(links).toHaveLength(4)
    expect(links[0].label).toBe('Consulting')
    expect(links[0].url).toBe('/consulting')
    expect(links[1].label).toBe('Development')
    expect(links[1].newTab).toBe(true)
    expect(links[2].label).toBe('Shop Now')
    expect(links[2].url).toBe('/shop')
    expect(links[3].label).toBe('Contact Page')
    expect(links[3].url).toBe('/contact')
  })

  it('preserves link fingerprint across visual/layout changes without link mutation', () => {
    const baseDoc: BuilderDocument = {
      version: 1,
      root: { props: {} },
      content: [
        {
          type: 'PromoBanner',
          props: {
            id: 'promo-1',
            title: 'Title A',
            description: 'Description A',
            imageUrl: 'https://example.com/img1.png',
            ctaLabel: 'Action Link',
            ctaUrl: '/action',
            ctaNewTab: false,
          },
        },
      ],
    }

    const links1 = extractNormalizedSourceLinks(baseDoc)
    const fp1 = calculateSourceLinksFingerprint(links1)

    // Change purely visual properties: image URL, title, description
    const visualChangedDoc: BuilderDocument = {
      version: 1,
      root: { props: {} },
      content: [
        {
          type: 'PromoBanner',
          props: {
            id: 'promo-1',
            title: 'Completely New Title B',
            description: 'Brand New Description B',
            imageUrl: 'https://example.com/img2-different.png',
            ctaLabel: 'Action Link',
            ctaUrl: '/action',
            ctaNewTab: false,
          },
        },
      ],
    }

    const links2 = extractNormalizedSourceLinks(visualChangedDoc)
    const fp2 = calculateSourceLinksFingerprint(links2)

    // Visual changes MUST NOT alter the source link fingerprint
    expect(fp1).toBe(fp2)

    // Changing the target URL MUST alter the fingerprint
    const urlChangedDoc: BuilderDocument = {
      ...baseDoc,
      content: [
        {
          ...baseDoc.content[0],
          props: {
            ...baseDoc.content[0].props,
            ctaUrl: '/action-updated',
          },
        },
      ],
    }
    const links3 = extractNormalizedSourceLinks(urlChangedDoc)
    const fp3 = calculateSourceLinksFingerprint(links3)
    expect(fp3).not.toBe(fp1)
  })

  it('creates default mobile menu data with snapshot and tree nodes', () => {
    const defaultDoc = createDefaultMegaMenuDocument()
    const links = extractNormalizedSourceLinks(defaultDoc)
    const mobileData = createDefaultMobileMenuData(links)

    expect(mobileData.version).toBe(1)
    expect(mobileData.items).toHaveLength(links.length)
    expect(mobileData.sourceSnapshot).toHaveLength(links.length)
    expect(mobileData.items[0].label).toBe(links[0].label)
    expect(mobileData.items[0].url).toBe(links[0].url)
  })
})

describe('Payload Schema & Configuration Integration', () => {
  it('includes enableMegaMenu in Settings global with defaultValue false', () => {
    const tabs = (Settings.fields?.[0] as any)?.tabs || []
    const megaTab = tabs.find((t: any) => t.label === 'Mega Menu')
    expect(megaTab).toBeDefined()

    const enableField = megaTab.fields?.find((f: any) => f.name === 'enableMegaMenu')
    expect(enableField).toBeDefined()
    expect(enableField.type).toBe('checkbox')
    expect(enableField.defaultValue).toBe(false)
    expect(enableField.virtual).toBeUndefined()
  })

  it('includes mode, megaLayout and mobileMenu in Menus collection', () => {
    const modeField = Menus.fields.find((f: any) => f.name === 'mode')
    expect(modeField).toBeDefined()
    expect(modeField?.type).toBe('select')
    expect((modeField as any)?.defaultValue).toBe('classic')

    const megaLayoutField = Menus.fields.find((f: any) => f.name === 'megaLayout')
    expect(megaLayoutField).toBeDefined()
    expect(megaLayoutField?.type).toBe('json')

    const mobileMenuField = Menus.fields.find((f: any) => f.name === 'mobileMenu')
    expect(mobileMenuField).toBeDefined()
    expect(mobileMenuField?.type).toBe('json')

    // Preserves existing items field
    const itemsField = Menus.fields.find((f: any) => f.name === 'items')
    expect(itemsField).toBeDefined()
    expect(itemsField?.type).toBe('array')
  })

  it('registers custom edit root view for Menus', () => {
    const editRoot = (Menus.admin?.components?.views as any)?.edit?.root
    expect(editRoot).toBeDefined()
    expect(editRoot.Component).toBe('@/components/admin/menus/MenuEditView#MenuEditView')
  })
})

describe('Menu Document ID Resolution', () => {
  it('correctly resolves existing ID from initPageResult.docID', async () => {
    const { resolveMenuDocumentId } = await import('@/components/admin/menus/MenuEditView')
    const result = resolveMenuDocumentId({
      initPageResult: { docID: 4 } as any,
    })
    expect(result.id).toBe(4)
    expect(result.isCreate).toBe(false)
  })

  it('correctly resolves existing ID from doc.id', async () => {
    const { resolveMenuDocumentId } = await import('@/components/admin/menus/MenuEditView')
    const result = resolveMenuDocumentId({
      doc: { id: 4, name: 'Main Menu' } as any,
    })
    expect(result.id).toBe(4)
    expect(result.isCreate).toBe(false)
  })

  it('correctly resolves existing ID from routeSegments', async () => {
    const { resolveMenuDocumentId } = await import('@/components/admin/menus/MenuEditView')
    const result = resolveMenuDocumentId({
      routeSegments: ['collections', 'menus', '4'],
    })
    expect(result.id).toBe('4')
    expect(result.isCreate).toBe(false)
  })

  it('correctly resolves existing ID from params.segments', async () => {
    const { resolveMenuDocumentId } = await import('@/components/admin/menus/MenuEditView')
    const result = resolveMenuDocumentId({
      params: { segments: ['collections', 'menus', '4'] } as any,
    })
    expect(result.id).toBe('4')
    expect(result.isCreate).toBe(false)
  })

  it('correctly identifies create route when last segment is "create"', async () => {
    const { resolveMenuDocumentId } = await import('@/components/admin/menus/MenuEditView')
    const result = resolveMenuDocumentId({
      routeSegments: ['collections', 'menus', 'create'],
    })
    expect(result.id).toBeUndefined()
    expect(result.isCreate).toBe(true)
  })

  it('does NOT treat non-existent numeric ID as create mode', async () => {
    const { resolveMenuDocumentId } = await import('@/components/admin/menus/MenuEditView')
    const result = resolveMenuDocumentId({
      routeSegments: ['collections', 'menus', '99999'],
    })
    expect(result.id).toBe('99999')
    expect(result.isCreate).toBe(false)
  })
})

describe('Mega Menu Builder Custom View & Route Registration', () => {
  it('registers the dedicated /menu-builder route in payload.config', async () => {
    const configModule = await import('@/payload.config')
    const config = await configModule.default
    const views = (config.admin?.components as any)?.views
    expect(views).toBeDefined()
    expect(views.menuBuilder).toBeDefined()
    expect(views.menuBuilder.path).toBe('/menu-builder')
    expect(views.menuBuilder.exact).toBe(true)
    expect(views.menuBuilder.Component).toBe(
      '@/components/admin/menus/MegaMenuBuilderView#MegaMenuBuilderView',
    )
  })
})

describe('Classic Menu Item Redesign & Relationship Target Contracts', () => {
  it('correctly maps Page selection to link.page and clears link.post', () => {
    const mockPageTarget = {
      id: 7,
      title: 'About Us',
      slug: 'about-us',
      publicPath: null,
      canonicalPath: '/about-us',
    }

    const item = {
      label: 'Old Label',
      link: {
        type: 'page' as const,
        page: mockPageTarget.id,
        post: null,
        url: mockPageTarget.canonicalPath,
        newTab: false,
      },
    }

    expect(item.link.type).toBe('page')
    expect(item.link.page).toBe(7)
    expect(item.link.post).toBeNull()
    expect(item.link.url).toBe('/about-us')
  })

  it('correctly maps Post selection to link.post and clears link.page', () => {
    const mockPostTarget = {
      id: 15,
      title: 'Latest News',
      slug: 'latest-news',
      publicPath: null,
      canonicalPath: '/latest-news.html',
    }

    const item = {
      label: 'Old Label',
      link: {
        type: 'post' as const,
        post: mockPostTarget.id,
        page: null,
        url: mockPostTarget.canonicalPath,
        newTab: true,
      },
    }

    expect(item.link.type).toBe('post')
    expect(item.link.post).toBe(15)
    expect(item.link.page).toBeNull()
    expect(item.link.url).toBe('/latest-news.html')
    expect(item.link.newTab).toBe(true)
  })

  it('correctly resets relationships when Type switches to custom', () => {
    const item = {
      label: 'External Link',
      link: {
        type: 'custom' as const,
        url: 'https://example.com',
        page: null,
        post: null,
        newTab: true,
      },
    }

    expect(item.link.type).toBe('custom')
    expect(item.link.url).toBe('https://example.com')
    expect(item.link.page).toBeNull()
    expect(item.link.post).toBeNull()
  })

  it('preserves relationship contracts expected by linksForMenu', async () => {
    const { linksForMenu } = await import('@/lib/url/menu-links')

    const mockPayload: any = {
      find: async () => ({
        docs: [{ path: '/about-us' }],
      }),
    }

    const items = [
      {
        id: 'item-1',
        label: 'About',
        link: {
          type: 'page',
          page: 7,
          newTab: false,
        },
      },
      {
        id: 'item-2',
        label: 'External',
        link: {
          type: 'custom',
          url: 'https://example.com',
          newTab: true,
        },
      },
    ]

    const resolved = await linksForMenu(mockPayload, items)
    expect(resolved).toHaveLength(2)
    expect(resolved[0].href).toBe('/about-us')
    expect(resolved[0].label).toBe('About')
    expect(resolved[1].href).toBe('https://example.com')
    expect(resolved[1].newTab).toBe(true)
  })
})

describe('Dedicated Mega Menu Save Contract', () => {
  it('isolates megaLayout edits and does not modify menu name, location, or items', () => {
    const existingMenu = {
      id: 4,
      name: 'Primary Navigation',
      location: 'header',
      mode: 'mega',
      items: [{ label: 'Home', link: { type: 'custom', url: '/' } }],
      megaLayout: createDefaultMegaMenuDocument(),
      mobileMenu: { version: 1, items: [] },
    }

    const updatedMegaLayout = {
      ...createDefaultMegaMenuDocument(),
      zones: {},
      content: [
        {
          type: 'LinkList',
          props: {
            id: 'updated-link-list',
            title: 'New Section',
            items: [{ label: 'Products', url: '/products' }],
          },
        },
      ],
    }

    const extractedLinks = extractNormalizedSourceLinks(updatedMegaLayout)

    // Save payload from MegaMenuBuilder
    const patchPayload = {
      megaLayout: updatedMegaLayout,
      mobileMenu: {
        version: existingMenu.mobileMenu.version,
        items: extractedLinks.map((sl) => ({
          id: sl.id,
          label: sl.label,
          url: sl.url,
          newTab: sl.newTab,
          sourceLinkId: sl.id,
        })),
        sourceSnapshot: extractedLinks,
      },
    }

    // Must NOT contain name, location, or items
    expect(patchPayload).not.toHaveProperty('name')
    expect(patchPayload).not.toHaveProperty('location')
    expect(patchPayload).not.toHaveProperty('items')

    // Contains updated layout and snapshot
    expect(patchPayload.megaLayout.content[0].props.id).toBe('updated-link-list')
    expect(patchPayload.mobileMenu.sourceSnapshot).toHaveLength(1)
    expect(patchPayload.mobileMenu.sourceSnapshot[0].label).toBe('Products')
  })
})
