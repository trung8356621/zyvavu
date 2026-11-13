import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { test } from 'node:test'
import { createRoleTemplate } from '@/lib/theme-engine/widget-contracts'
import { getAllWidgetManifests } from '@/lib/theme-engine/widget-registry-manifests'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'
import { PATTERN_SLOTS } from '@/lib/theme-engine/patterns/json'
import { RESPONSIVE_BREAKPOINTS } from '@/lib/style-engine/responsive-style'
import { validateTemplate } from './validate'

const corporate = getAllInstalledThemes().find(({ id }) => id === 'corporate')!
const home = (nodes: unknown[]) => ({
  version: 1, template: 'home', root: { props: {} },
  content: [{ type: 'Section', props: { id: 'hero', content: nodes } }],
})
const node = (type: string, props: Record<string, unknown> = {}) => ({ type, props: { id: 'item-1', ...props } })
const validate = (document: unknown) => validateTemplate(document, 'home', corporate.themeConfig)

test('validates bundled legacy zones, a native role document and inline responsive overrides', () => {
  for (const context of ['home', 'page', 'header', 'footer'] as const) {
    const output = validateTemplate(corporate.templates[context], context, corporate.themeConfig)
    assert.equal(output.valid, true, JSON.stringify(output))
  }
  const roleDocument = createRoleTemplate('page')
  assert.equal(validateTemplate(roleDocument, 'page', corporate.themeConfig).valid, true)
  const document = home([node('Heading', {
    text: 'Welcome', tag: 'h1',
    style: { typography: { colorToken: 'text' }, responsive: { mobile: { typography: { align: 'center' } } } },
  })])
  const before = JSON.stringify(document)
  assert.equal(validate(document).valid, true)
  assert.equal(JSON.stringify(document), before)
})

const rejectionCases = [
  ['unknown widget', home([node('Unregistered')]), 'UNSUPPORTED_WIDGET', '.type'],
  ['nested section', home([node('Section')]), 'INVALID_NESTING', '.type'],
  ['unknown style field', home([node('Heading', { style: { position: 'absolute' } })]), 'UNSUPPORTED_PROPERTY', '.position'],
  ['unsupported responsive override', home([node('Heading', { style: { responsive: { mobile: { colorToken: 'text' } } } })]), 'UNSUPPORTED_PROPERTY', '.mobile.colorToken'],
  ['non-object breakpoint', home([node('Heading', { style: { responsive: { mobile: null } } })]), 'INVALID_TYPE', '.mobile'],
  ['style domain mismatch', home([node('Image', { style: { typography: { align: 'center' } } })]), 'UNSUPPORTED_DOMAIN', '.typography'],
  ['invalid link', home([node('Button', { href: 'ftp://example.org' })]), 'INVALID_DESTINATION', '.href'],
  ['unknown color', home([node('Heading', { style: { typography: { colorToken: 'missing' } } })]), 'UNKNOWN_COLOR_TOKEN', '.colorToken'],
  ['missing ID', home([{ type: 'Heading', props: { text: 'Hello' } }]), 'INVALID_ID', '.id'],
  ['duplicate ID', home([node('Heading'), node('Text')]), 'DUPLICATE_ID', '.id'],
  ['invalid enum', home([node('Heading', { tag: 'h9' })]), 'INVALID_ENUM', '.tag'],
  ['wrong property type', home([node('Heading', { text: 1 })]), 'INVALID_TYPE', '.text'],
  ['invalid media ID', home([node('Image', { mediaId: {} })]), 'INVALID_MEDIA_ID', '.mediaId'],
  ['missing gallery source', home([node('Gallery', { items: [{ alt: 'An office' }] })]), 'REQUIRED', '.items[0].src'],
  ['unknown property', home([node('Heading', { unknown: false })]), 'UNSUPPORTED_PROPERTY', '.unknown'],
  ['wrong context', { ...home([]), template: 'single' }, 'CONTEXT_MISMATCH', '.template'],
  ['orphan legacy zone', { ...home([]), zones: { 'missing:content': [] } }, 'INVALID_PARENT_SLOT', '["missing:content"]'],
  ['inactive column', home([node('Columns', { distribution: '1', column2: [node('Heading', { id: 'nested' })] })]), 'INACTIVE_COLUMN', '.column2[0]'],
] as const

for (const [name, document, code, path] of rejectionCases) {
  test(`rejects ${name}`, () => {
    const output = validate(document)
    assert.equal(output.valid, false)
    assert(output.errors.some((issue) => issue.code === code && issue.path.endsWith(path)), JSON.stringify(output))
  })
}

test('application required capability is enforced', () => {
  const result = validateTemplate({ ...home([]), template: 'page' }, 'page', corporate.themeConfig)
  assert(result.errors.some(({ code, message }) => code === 'TEMPLATE_POLICY' && message.includes('document.content')))
})

test('MCP client initializes, discovers and reads through the actual stdio process', { timeout: 40000 }, async (t) => {
  const marker = 'phase1-test-secret-never-serialize'
  const processEnv = { ...process.env, PAYLOAD_SECRET: marker, DATABASE_URL: 'disabled-for-mcp-test' }
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/mcp/stdio.ts'], {
    env: processEnv, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const exited = once(child, 'exit')
  t.after(() => { if (child.exitCode === null) child.kill() })
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()
  let stderr = ''
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk })
  let id = 0
  async function request(method: string, params?: object) {
    const requestId = ++id
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n')
    const { value, done } = await lines.next()
    assert(!done, stderr)
    assert(!value.includes(marker))
    const response = JSON.parse(value)
    assert.equal(response.id, requestId)
    return response
  }
  async function call(name: string, args?: object) {
    const { result, error } = await request('tools/call', { name, arguments: args })
    assert.equal(error, undefined)
    return { isError: result.isError, data: JSON.parse(result.content[0].text) }
  }

  assert.equal((await request('tools/list')).error.code, -32002)
  const initialized = await request('initialize', {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'phase1-test', version: '1.0' },
  })
  assert.equal(initialized.result.protocolVersion, '2025-11-25')
  assert.deepEqual(initialized.result.capabilities, { tools: {}, resources: {} })
  child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n')

  const { result: { tools } } = await request('tools/list')
  const phase1Tools = [
    'zyvavu_get_capabilities',
    'zyvavu_get_schema_version',
    'zyvavu_list_widgets',
    'zyvavu_get_layout_rules',
    'zyvavu_validate_template',
    'zyvavu_validate_website_plan',
    'zyvavu_list_themes',
    'zyvavu_get_theme',
    'zyvavu_get_theme_tokens',
    'zyvavu_get_theme_customize_schema',
    'zyvavu_validate_theme_import',
    'zyvavu_list_templates',
    'zyvavu_get_template',
    'zyvavu_get_widget_schema',
    'zyvavu_get_style_schema',
  ]
  const stage0Tools = [
    'zyvavu_get_capability_snapshot',
    'zyvavu_assess_theme_requirements',
    'zyvavu_validate_capability_assessment',
    'zyvavu_resolve_capability_assessment',
  ]
  const phase2aTools = [
    'zyvavu_theme_customize_list',
    'zyvavu_theme_customize_get',
    'zyvavu_theme_customize_validate',
    'zyvavu_theme_customize_update',
    'zyvavu_theme_customize_create',
  ]
  assert.equal(tools.length, phase1Tools.length + stage0Tools.length + phase2aTools.length)
  for (const name of [...phase1Tools, ...stage0Tools, ...phase2aTools]) {
    assert(tools.some((tool: { name: string }) => tool.name === name), name)
  }
  for (const tool of tools) {
    const mutating = phase2aTools.includes(tool.name) && tool.name !== 'zyvavu_theme_customize_list'
      && tool.name !== 'zyvavu_theme_customize_get' && tool.name !== 'zyvavu_theme_customize_validate'
    assert.equal(tool.annotations.readOnlyHint, !mutating)
    assert.equal(tool.inputSchema.type, 'object')
    assert.equal(tool.inputSchema.additionalProperties, false)
    for (const key of tool.inputSchema.required) assert(Object.hasOwn(tool.inputSchema.properties, key))
  }
  const capabilities = (await call('zyvavu_get_capabilities')).data
  assert(capabilities.disabled.includes('payload settings writes from default MCP path'))
  assert(capabilities.disabled.includes('embedded LLM calls'))
  const surfaceOf = (name: string) => tools.find((tool: { name: string }) => tool.name === name)._meta['zyvavu/surface']
  assert.equal(surfaceOf('zyvavu_validate_template'), 'public')
  assert.equal(surfaceOf('zyvavu_get_capability_snapshot'), 'public')
  assert.equal(surfaceOf('zyvavu_get_theme_tokens'), 'theme-customize')
  assert.equal(surfaceOf('zyvavu_get_widget_schema'), 'theme-builder')
  assert.equal(capabilities.surfaces.flatMap(({ tools }: { tools: string[] }) => tools).length, tools.length)
  const rules = await request('resources/read', { uri: 'zyvavu://catalog/rules' })
  assert(JSON.parse(rules.result.contents[0].text).composition.section)
  const catalog = await request('resources/list')
  assert.equal(catalog.result.resources.find(({ uri }: { uri: string }) => uri === 'zyvavu://catalog/widgets')._meta['zyvavu/surface'], 'theme-builder')
  assert.deepEqual((await call('zyvavu_list_themes')).data.themes.map(({ id }: { id: string }) => id),
    getAllInstalledThemes().map(({ id }) => id))
  const tokens = (await call('zyvavu_get_theme_tokens', { themeId: 'corporate' })).data
  assert.deepEqual(tokens.tokens, corporate.themeConfig.tokens)
  assert.equal(tokens.cssTokens['--zyvavu-primary'].resolvedValue, corporate.themeConfig.tokens.colors.primary)
  assert.equal(tokens.cssTokens['--zyvavu-theme-h1-size'].resolvedValue, corporate.themeConfig.tokens.typography.h1?.size)
  assert(tokens.presets.typography.length)
  const industrial = (await call('zyvavu_get_theme_tokens', { themeId: 'industrial' })).data
  assert.notEqual(industrial.cssTokens['--zyvavu-primary'].resolvedValue, tokens.cssTokens['--zyvavu-primary'].resolvedValue)
  const schema = (await call('zyvavu_get_theme_customize_schema')).data
  const schemaResource = await request('resources/read', { uri: industrial.schemaResource })
  assert.deepEqual(JSON.parse(schemaResource.result.contents[0].text), schema)
  assert.deepEqual(Object.keys(schema.tokens.properties).sort(), Object.keys(industrial.tokens).sort())
  assert.deepEqual(Object.keys(schema.tokens.properties.typography.properties).sort(),
    Object.keys(industrial.tokens.typography).sort())
  assert.equal(schema.responsive.themeTokenOverrides, false)
  const artifact = { themeId: 'mcp-blog-test-2', tokens: industrial.tokens }
  const validateImport = (document: unknown) => call('zyvavu_validate_theme_import', {
    themeId: artifact.themeId, document,
  })
  assert.equal((await validateImport(artifact)).data.valid, true)
  assert.equal((await validateImport({ ...artifact, themeId: 'another-theme' })).data.valid, false)
  assert.equal((await validateImport({ tokens: { responsive: {}, shadow: 'none' } })).data.valid, false)
  assert.equal((await validateImport({ tokens: { layout: { pageSpacing: '2vw' } } })).data.valid, false)
  assert.equal((await call('zyvavu_get_theme_tokens', { themeId: artifact.themeId, source: 'live' })).data.code, 'ACCESS_DENIED')
  assert.equal((await call('zyvavu_get_theme_tokens', { themeId: 'corporate', source: 'live' })).data.code, 'ACCESS_DENIED')
  assert.equal((await call('zyvavu_get_style_schema', { type: 'Heading', themeId: 'corporate', source: 'live' })).data.code, 'ACCESS_DENIED')
  assert.deepEqual((await call('zyvavu_get_template', { themeId: 'corporate', context: 'page' })).data.document,
    corporate.templates.page)
  assert.equal((await call('zyvavu_get_theme', { themeId: 'corporate', source: 'live' })).data.code, 'ACCESS_DENIED')
  assert.equal((await call('zyvavu_list_templates', { themeId: 'corporate', source: 'live' })).isError, true)
  assert.equal((await call('zyvavu_get_theme', { themeId: marker })).data.code, 'NOT_FOUND')
  assert.equal((await call('zyvavu_get_theme', { themeId: 'corporate', accessToken: 'unused' })).data.code, 'INVALID_ARGUMENTS')
  assert.equal((await request('tools/call', { name: 'zyvavu_save_template' })).error.code, -32602)
  assert.equal((await request('resources/read', { uri: 'file:///test-private-file' })).error.message, 'Resource not found')

  const { widgets } = (await call('zyvavu_list_widgets')).data
  assert.deepEqual(widgets.map(({ type }: { type: string }) => type), Object.keys(getAllWidgetManifests()))
  assert(widgets.find(({ type }: { type: string }) => type === 'Heading').capabilities.includes('atom.heading'))
  assert(widgets.every((widget: object) => !Object.hasOwn(widget, 'defaults'))) 
  const heading = (await call('zyvavu_get_widget_schema', { type: 'Heading' })).data
  assert.equal(heading.defaults.tag, 'h2')
  assert(heading.styleDomains.includes('typography'))
  const button = (await call('zyvavu_get_widget_schema', { type: 'Button' })).data
  assert.equal(button.links.destinations.popup.enabled, false)
  const layout = (await call('zyvavu_get_layout_rules')).data
  assert.deepEqual(layout.slots, PATTERN_SLOTS)
  assert.equal(layout.nestedSections, false)
  const style = (await call('zyvavu_get_style_schema', { type: 'Heading', themeId: 'corporate' })).data
  assert.deepEqual(style.responsive.breakpoints, RESPONSIVE_BREAKPOINTS)
  assert.equal(style.effectiveTypography.basePreset, 'h2')
  const resource = await request('resources/read', { uri: 'zyvavu://catalog/layout' })
  assert.deepEqual(JSON.parse(resource.result.contents[0].text), layout)
  const document = corporate.templates.home
  assert.equal((await call('zyvavu_validate_template', { themeId: 'corporate', context: 'home', document })).data.valid, true)
  const plan = (await call('zyvavu_validate_website_plan', {
    themeId: 'corporate', pages: [{ path: '/', context: 'home', document }],
  })).data
  assert.equal(plan.valid, true)
  assert.equal(plan.routeAvailability, 'UNVERIFIED')
  const [hero] = plan.pages[0].sections
  assert.equal(hero.id, 'corp-home-hero-section')
  assert(hero.widgets.some(({ type }: { type: string }) => type === 'TextBlock'))
  assert(hero.colorTokens.includes('surface'))
  child.stdin.end()
  assert.deepEqual(await exited, [0, null])
  assert.equal(stderr, '')
})

test('Architecture Auditor rejects invalid BannerSlider children and SlideItem margin', () => {
  const invalidChild = validate(home([{
    type: 'BannerSlider',
    props: {
      id: 'slider-1',
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      showArrows: true,
      showPagination: true,
      paginationMode: 'dots',
      slides: [{ type: 'Heading', props: { id: 'bad-child', text: 'Nope', tag: 'h2' } }],
    },
  }]))
  assert(invalidChild.errors.some((issue) => issue.code === 'INVALID_SLIDER_CHILD'))

  const counterInSlides = validate(home([{
    type: 'BannerSlider',
    props: {
      id: 'slider-counter-bad',
      slidesPerView: 1,
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      showArrows: true,
      showPagination: true,
      paginationMode: 'dots',
      slides: [{
        type: 'AnimatedCounter',
        props: {
          id: 'counter-in-slides',
          targetValue: 10,
          durationMs: 1000,
          prefix: '',
          suffix: '',
          decimals: 0,
          useGrouping: false,
          triggerOnce: true,
          label: '',
        },
      }],
    },
  }]))
  assert(counterInSlides.errors.some((issue) => issue.code === 'INVALID_SLIDER_CHILD'))

  const forbiddenMargin = validate(home([{
    type: 'BannerSlider',
    props: {
      id: 'slider-2',
      autoplay: false,
      intervalMs: 5000,
      loop: true,
      showArrows: true,
      showPagination: true,
      paginationMode: 'dots',
      slides: [{
        type: 'SlideItem',
        props: {
          id: 'slide-1',
          style: { spacing: { margin: { token: 'lg' }, padding: { token: 'md' } } },
          content: [],
        },
      }],
    },
  }]))
  assert(forbiddenMargin.errors.some((issue) => issue.code === 'FORBIDDEN_MARGIN'))
})

test('Architecture Auditor accepts BannerSlider with two SlideItems, slidesPerView, and Counter in valid slots', () => {
  const withField = validate(home([
    {
      type: 'BannerSlider',
      props: {
        id: 'slider-ok',
        slidesPerView: 2,
        autoplay: true,
        intervalMs: 5000,
        loop: true,
        showArrows: true,
        showPagination: true,
        paginationMode: 'dots',
        controlsStyle: {
          arrows: { spacing: { padding: { token: 'sm' } } },
          pagination: { typography: { colorToken: 'primary' } },
        },
        slides: [
          {
            type: 'SlideItem',
            props: {
              id: 'slide-ok-a',
              style: { spacing: { padding: { token: 'md' } } },
              content: [
                { type: 'Heading', props: { id: 'h-ok', text: 'Hello', tag: 'h2' } },
                {
                  type: 'AnimatedCounter',
                  props: {
                    id: 'counter-in-slide',
                    targetValue: 42,
                    durationMs: 1200,
                    prefix: '',
                    suffix: '+',
                    decimals: 0,
                    useGrouping: true,
                    triggerOnce: true,
                    label: 'Wins',
                  },
                },
              ],
            },
          },
          {
            type: 'SlideItem',
            props: {
              id: 'slide-ok-b',
              style: { spacing: { padding: { token: 'md' } } },
              content: [{ type: 'Text', props: { id: 't-ok', text: 'Second slide' } }],
            },
          },
        ],
      },
    },
    {
      type: 'AnimatedCounter',
      props: {
        id: 'counter-section',
        targetValue: 100,
        durationMs: 1200,
        prefix: '',
        suffix: '+',
        decimals: 0,
        useGrouping: true,
        triggerOnce: true,
        label: 'Section wins',
      },
    },
  ]))
  assert.equal(withField.valid, true, JSON.stringify(withField.errors))

  // Legacy documents omitting slidesPerView stay valid; runtime defaults to 1.
  const legacy = validate(home([{
    type: 'BannerSlider',
    props: {
      id: 'slider-legacy',
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      showArrows: true,
      showPagination: true,
      paginationMode: 'dots',
      slides: [{
        type: 'SlideItem',
        props: { id: 'slide-legacy', content: [] },
      }],
    },
  }]))
  assert.equal(legacy.valid, true, JSON.stringify(legacy.errors))

  const badPerView = validate(home([{
    type: 'BannerSlider',
    props: {
      id: 'slider-bad-view',
      slidesPerView: 9,
      autoplay: true,
      intervalMs: 5000,
      loop: true,
      showArrows: true,
      showPagination: true,
      paginationMode: 'dots',
      slides: [{ type: 'SlideItem', props: { id: 'slide-bad-view', content: [] } }],
    },
  }]))
  assert(badPerView.errors.some((issue) => issue.code === 'INVALID_ENUM' && issue.path.includes('slidesPerView')))
})

test('MCP widget contracts expose BannerSlider style targets and slidesPerView', async () => {
  const { widgetContract, getLayoutRules } = await import('./catalog')
  const slider = widgetContract('BannerSlider')
  assert.deepEqual(slider?.styleTargets?.map((target) => target.id), [
    'bannerItem',
    'arrows',
    'pagination',
  ])
  assert.equal(slider?.styleTargets?.[0]?.persistOn, 'SlideItem')
  assert.equal(slider?.styleTargets?.[0]?.editorSelectionOnly, true)
  assert.equal(slider?.restrictions?.rootStylePanel, false)
  assert.equal(slider?.restrictions?.slidesPerView?.default, 1)
  assert.deepEqual(slider?.enums?.slidesPerView, [1, 2, 3, 4, 5, 6])
  assert.equal(slider?.defaults?.slidesPerView, 1)
  assert.equal(slider?.libraryGroup, 'bannerSlider')
  assert.equal(slider?.nesting?.composition?.includes('SlideItem'), true)
  const slide = widgetContract('SlideItem')
  assert(slide?.restrictions?.forbiddenStyle?.includes('spacing.margin'))
  assert.equal(slide?.librarySlotOnly, true)
  assert.deepEqual(slide?.nesting?.parentSlots, { BannerSlider: ['slides'] })
  const counter = widgetContract('AnimatedCounter')
  assert(counter?.styleDomains.includes('typography'))
  assert.equal(counter?.libraryGroup, 'animatedCounter')
  assert.equal(counter?.restrictions?.notCountdown, true)
  assert.equal(Object.hasOwn(counter?.nesting?.parentSlots ?? {}, 'BannerSlider'), false)
  const layout = getLayoutRules()
  assert.equal(layout.bannerSlider.slidesPerView.field, 'slidesPerView')
  assert.equal(layout.animatedCounter.notCountdown, true)
})

test('MCP layout rules expose user-facing List Widget groups', async () => {
  const { getLayoutRules } = await import('./catalog')
  const layout = getLayoutRules()
  assert.deepEqual(
    layout.listWidgetGroups.map((group) => group.id),
    ['bannerSlider', 'animatedCounter'],
  )
  assert.deepEqual(layout.listWidgetGroups[0].patternIds, [
    'banner-slider-hero',
    'banner-slider-editorial',
    'banner-slider-minimal',
  ])
  assert.deepEqual(layout.listWidgetGroups[1].patternIds, [
    'counter-single-highlight',
    'counter-stats-row',
    'counter-editorial-milestone',
  ])
})
