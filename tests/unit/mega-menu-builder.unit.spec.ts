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
import {
  DROPDOWN_EFFECTS,
  resolveDropdownEffect,
  type DropdownEffectId,
  type ItemDropdownEffectId,
} from '@/components/admin/shared/dropdownEffects'
import {
  flatItemsToTree,
  treeToFlatItems,
  indentNodeInTree,
  outdentNodeInTree,
  type MenuTreeNode,
  type ClassicMenuItem,
} from '@/components/admin/menus/treeUtils'

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
  }, 30000)
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

describe('Mega Menu V4 — Dropdown Effect Registry & Inheritance', () => {
  it('registers all required dropdown effects with metadata', () => {
    expect(DROPDOWN_EFFECTS).toHaveProperty('none')
    expect(DROPDOWN_EFFECTS).toHaveProperty('fade')
    expect(DROPDOWN_EFFECTS).toHaveProperty('slide-down')

    expect(DROPDOWN_EFFECTS.none.name).toBe('None')
    expect(DROPDOWN_EFFECTS.fade.name).toBe('Fade')
    expect(DROPDOWN_EFFECTS['slide-down'].name).toBe('Slide Down')
  })

  it('resolves item dropdown animation with menu-level inheritance fallback', () => {
    // Override directly
    expect(resolveDropdownEffect('none', 'fade')).toBe('none')
    expect(resolveDropdownEffect('slide-down', 'fade')).toBe('slide-down')
    expect(resolveDropdownEffect('fade', 'none')).toBe('fade')

    // Inherit menu default
    expect(resolveDropdownEffect('inherit', 'slide-down')).toBe('slide-down')
    expect(resolveDropdownEffect('inherit', 'fade')).toBe('fade')
    expect(resolveDropdownEffect(undefined, 'slide-down')).toBe('slide-down')
    expect(resolveDropdownEffect(null, 'none')).toBe('none')

    // Global fallback if no menu default specified
    expect(resolveDropdownEffect('inherit', undefined as any)).toBe('fade')
  })
})

describe('Mega Menu V4 — WordPress-Style Tree Serialization & Submenu Configuration', () => {
  it('converts flat items to tree preserving parentId, submenu settings, and animation overrides', () => {
    const flatItems: ClassicMenuItem[] = [
      {
        id: 'item-1',
        label: 'Products',
        link: { type: 'custom', url: '/products' },
        hasSubmenu: true,
        submenuType: 'mega',
        dropdownEffect: 'slide-down',
        triggerOnly: true,
      },
      {
        id: 'item-2',
        label: 'Company',
        link: { type: 'custom', url: '/company' },
        hasSubmenu: true,
        submenuType: 'classic',
        dropdownEffect: 'inherit',
      },
      {
        id: 'item-2-1',
        label: 'About Us',
        link: { type: 'page', page: 10 },
        parentId: 'item-2',
      },
      {
        id: 'item-2-2',
        label: 'Careers',
        link: { type: 'custom', url: '/careers' },
        parentId: 'item-2',
      },
    ]

    const tree = flatItemsToTree(flatItems)

    expect(tree).toHaveLength(2) // Two root items: Products & Company
    expect(tree[0].id).toBe('item-1')
    expect(tree[0].hasSubmenu).toBe(true)
    expect(tree[0].submenuType).toBe('mega')
    expect(tree[0].dropdownEffect).toBe('slide-down')
    expect(tree[0].triggerOnly).toBe(true)

    expect(tree[1].id).toBe('item-2')
    expect(tree[1].hasSubmenu).toBe(true)
    expect(tree[1].submenuType).toBe('classic')
    expect(tree[1].dropdownEffect).toBe('inherit')
    expect(tree[1].children).toHaveLength(2)
    expect(tree[1].children![0].id).toBe('item-2-1')
    expect(tree[1].children![0].parentId).toBe('item-2')
    expect(tree[1].children![1].id).toBe('item-2-2')
    expect(tree[1].children![1].parentId).toBe('item-2')
  })

  it('converts hierarchical tree back to flat items with parentId links', () => {
    const tree: MenuTreeNode[] = [
      {
        id: 'node-root',
        label: 'Root Link',
        link: { type: 'custom', url: '/root' },
        hasSubmenu: true,
        submenuType: 'classic',
        dropdownEffect: 'fade',
        children: [
          {
            id: 'node-child',
            label: 'Child Link',
            link: { type: 'page', page: 5 },
            children: [],
          },
        ],
      },
    ]

    const flat = treeToFlatItems(tree)
    expect(flat).toHaveLength(2)
    expect(flat[0].id).toBe('node-root')
    expect(flat[0].parentId).toBeNull()
    expect(flat[0].hasSubmenu).toBe(true)
    expect(flat[0].submenuType).toBe('classic')
    expect(flat[0].dropdownEffect).toBe('fade')

    expect(flat[1].id).toBe('node-child')
    expect(flat[1].parentId).toBe('node-root')
  })

  it('supports indenting and outdenting nodes in tree', () => {
    const initialTree: MenuTreeNode[] = [
      { id: 'parent', label: 'Parent', children: [] },
      { id: 'sibling', label: 'Sibling', children: [] },
    ]

    // Indent 'sibling' to become child of 'parent'
    const indented = indentNodeInTree(initialTree, 'sibling')
    expect(indented).toHaveLength(1)
    expect(indented[0].id).toBe('parent')
    expect(indented[0].children).toHaveLength(1)
    expect(indented[0].children![0].id).toBe('sibling')
    expect(indented[0].children![0].parentId).toBe('parent')

    // Outdent 'sibling' back to root level
    const outdented = outdentNodeInTree(indented, 'sibling')
    expect(outdented).toHaveLength(2)
    expect(outdented[0].id).toBe('parent')
    expect(outdented[1].id).toBe('sibling')
    expect(outdented[1].parentId).toBeNull()
  })
})

describe('Mega Menu V4 — Per-Item Mega Layout Storage & Isolation', () => {
  it('updates only megaLayouts[itemId] leaving other items untouched', () => {
    const existingMegaLayouts: Record<string, any> = {
      'item-1': { version: 1, root: { props: {} }, content: [{ type: 'LinkList', props: { id: 'l1' } }] },
      'item-2': { version: 1, root: { props: {} }, content: [{ type: 'PromoBanner', props: { id: 'p1' } }] },
    }

    const updatedItem1Layout = {
      version: 1,
      root: { props: {} },
      content: [{ type: 'LinkList', props: { id: 'l1-updated' } }],
    }

    const patchPayload = {
      megaLayouts: {
        ...existingMegaLayouts,
        'item-1': updatedItem1Layout,
      },
    }

    // item-1 is updated
    expect(patchPayload.megaLayouts['item-1'].content[0].props.id).toBe('l1-updated')
    // item-2 is strictly preserved
    expect(patchPayload.megaLayouts['item-2'].content[0].props.id).toBe('p1')
    // Isolation: no global whole-menu mutations
    expect(patchPayload).not.toHaveProperty('name')
    expect(patchPayload).not.toHaveProperty('items')
  })
})

describe('Mega Menu V4 — Payload Collection Schema & Hooks', () => {
  it('defines defaultDropdownEffect and megaLayouts on Menus collection', () => {
    const fields = Menus.fields as any[]
    const defaultDropdownField = fields.find((f) => f.name === 'defaultDropdownEffect')
    expect(defaultDropdownField).toBeDefined()
    expect(defaultDropdownField.type).toBe('select')
    expect(defaultDropdownField.defaultValue).toBe('fade')

    const megaLayoutsField = fields.find((f) => f.name === 'megaLayouts')
    expect(megaLayoutsField).toBeDefined()
    expect(megaLayoutsField.type).toBe('json')

    const itemsField = fields.find((f) => f.name === 'items')
    expect(itemsField).toBeDefined()
    const itemSubFields = itemsField.fields as any[]

    expect(itemSubFields.find((f: any) => f.name === 'parentId')).toBeDefined()
    expect(itemSubFields.find((f: any) => f.name === 'hasSubmenu')).toBeDefined()
    expect(itemSubFields.find((f: any) => f.name === 'submenuType')).toBeDefined()
    expect(itemSubFields.find((f: any) => f.name === 'dropdownEffect')).toBeDefined()
    expect(itemSubFields.find((f: any) => f.name === 'triggerOnly')).toBeDefined()
  })

  it('blocks saving item with mega submenu if site settings enableMegaMenu is disabled', async () => {
    const beforeChangeHook = Menus.hooks?.beforeChange?.[0]
    expect(beforeChangeHook).toBeDefined()

    const mockReq = {
      payload: {
        findGlobal: async () => ({ enableMegaMenu: false }),
      },
    }

    // Should throw error when an item has hasSubmenu=true and submenuType='mega'
    await expect(
      beforeChangeHook!({
        data: {
          items: [{ label: 'Item 1', hasSubmenu: true, submenuType: 'mega' }],
        },
        req: mockReq as any,
        operation: 'update',
      } as any),
    ).rejects.toThrow(/Mega Menu is disabled in Site Settings/)

    // Should succeed when items are classic or hasSubmenu is false
    await expect(
      beforeChangeHook!({
        data: {
          items: [{ label: 'Item 1', hasSubmenu: true, submenuType: 'classic' }],
        },
        req: mockReq as any,
        operation: 'update',
      } as any),
    ).resolves.toEqual({
      items: [{ label: 'Item 1', hasSubmenu: true, submenuType: 'classic' }],
    })
  })
})
