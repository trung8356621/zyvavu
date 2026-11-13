import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { getComponentStyleCapabilities } from '@/lib/style-engine/capabilities'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import { validatePatternJSON } from '@/lib/theme-engine/patterns/json'
import { getAllWidgetManifests } from '@/lib/theme-engine/widget-registry-manifests'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { BANNER_SLIDER_STYLE_TARGETS, stripSlideItemMargin } from '@/widgets/BannerSlider/style-targets'
import { normalizeSlidesPerView } from '@/widgets/BannerSlider/normalize-slides-per-view'
import { BannerSliderFrontend } from '@/widgets/BannerSlider/frontend'
import {
  findEnclosingBannerSlide,
  nextSlideIndexAfterDelete,
} from '@/widgets/BannerSlider/banner-slide-ops'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { LivePatternPreview } from '@/components/admin/theme-builder/PatternPreview'
import {
  widgetLibraryCategory,
  widgetLibraryPatternCategory,
} from '@/components/admin/theme-builder/WidgetPatternLibrary'
import {
  auditLibraryListWidgetGroups,
  LIBRARY_LIST_WIDGET_GROUPS,
} from '@/lib/theme-engine/library-list-widgets'
import {
  designPatternFromJSON,
  instantiatePattern,
  insertWidgetPattern,
  resolveInsertDestination,
  slotAcceptsType,
  validatePatternOperation,
} from '@/lib/theme-engine/widget-patterns'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import type { Data } from '@puckeditor/core'

const state = vi.hoisted(() => ({ current: null as any }))
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (selector: (value: any) => unknown) => selector(state.current),
}))
vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import { WidgetPatternLibrary } from '@/components/admin/theme-builder/WidgetPatternLibrary'

const BANNER_PATTERN_IDS = [
  'banner-slider-hero',
  'banner-slider-editorial',
  'banner-slider-minimal',
] as const
const COUNTER_PATTERN_IDS = [
  'counter-single-highlight',
  'counter-stats-row',
  'counter-editorial-milestone',
] as const

beforeEach(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  state.current = {
    config: getEditorConfigForContext('home'),
    appState: { data: { root: { props: {} }, content: [] } },
    selectedItem: null,
    dispatch: vi.fn(),
    getPermissions: vi.fn().mockReturnValue({ insert: true, edit: true }),
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BannerSlider + AnimatedCounter registry', () => {
  it('registers manifests and maps library categories', () => {
    const manifests = getAllWidgetManifests()
    expect(manifests.BannerSlider?.id).toBe('BannerSlider')
    expect(manifests.SlideItem?.id).toBe('SlideItem')
    expect(manifests.AnimatedCounter?.id).toBe('AnimatedCounter')
    expect(widgetLibraryCategory('BannerSlider')).toBe('bannerSlider')
    expect(widgetLibraryCategory('AnimatedCounter')).toBe('animatedCounter')
    expect(widgetLibraryCategory('Columns')).toBe('layout')
    expect(state.current.config.components.BannerSlider).toBeTruthy()
    expect(state.current.config.components.AnimatedCounter).toBeTruthy()
    expect(state.current.config.components.SlideItem).toBeTruthy()
  })

  it('locks BannerSlider root Style domains and keeps SlideItem/Counter domains', () => {
    expect(getComponentStyleCapabilities('BannerSlider')).toEqual([])
    expect(getComponentStyleCapabilities('SlideItem')).toContain('background')
    expect(getComponentStyleCapabilities('AnimatedCounter')).toContain('typography')
  })

  it('exposes Banner Item Style Target beside Arrows and Pagination', () => {
    expect(BANNER_SLIDER_STYLE_TARGETS.map((t) => t.id)).toEqual([
      'bannerItem',
      'arrows',
      'pagination',
    ])
    expect(state.current.config.components.BannerSlider.defaultProps.slidesPerView).toBe(1)
    expect(state.current.config.components.BannerSlider.fields.slidesPerView).toBeTruthy()
  })

  it('defaults slidesPerView to 1 for missing legacy values', () => {
    expect(normalizeSlidesPerView(undefined)).toBe(1)
    expect(normalizeSlidesPerView(null)).toBe(1)
    expect(normalizeSlidesPerView(0)).toBe(1)
    expect(normalizeSlidesPerView(1)).toBe(1)
    expect(normalizeSlidesPerView(2.8)).toBe(2)
    expect(normalizeSlidesPerView(99)).toBe(6)
  })

  it('finds enclosing Banner Item from nested widgets and maps delete index', () => {
    const data = {
      root: { props: {} },
      content: [
        {
          type: 'Section',
          props: {
            id: 's1',
            content: [
              {
                type: 'BannerSlider',
                props: {
                  id: 'banner',
                  slides: [
                    {
                      type: 'SlideItem',
                      props: {
                        id: 'slide-a',
                        content: [
                          {
                            type: 'Columns',
                            props: {
                              id: 'cols',
                              column1: [{ type: 'Image', props: { id: 'img-deep' } }],
                            },
                          },
                        ],
                      },
                    },
                    { type: 'SlideItem', props: { id: 'slide-b', content: [] } },
                  ],
                },
              },
            ],
          },
        },
      ],
    }
    expect(findEnclosingBannerSlide(data as any, 'img-deep')).toEqual({
      sliderId: 'banner',
      slideId: 'slide-a',
      slideIndex: 0,
      zone: 'banner:slides',
    })
    expect(nextSlideIndexAfterDelete(0, 1)).toBe(0)
    expect(nextSlideIndexAfterDelete(1, 1)).toBe(0)
    expect(nextSlideIndexAfterDelete(0, 0)).toBe(0)
  })

  it('resolves arrow Left/Right margin tokens to CSS offsets', () => {
    const css = resolveWidgetStyles({
      spacing: { margin: { leftToken: 'md', rightToken: 'lg' } },
    })
    expect(css.marginLeft).toBeTruthy()
    expect(css.marginRight).toBeTruthy()
  })

  it('renders Embla track children horizontally for ReactNode slides', () => {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IO)
    const { container } = render(
      <BannerSliderFrontend
        id="slider"
        slidesPerView={2}
        showArrows
        showPagination
        autoplay={false}
        slides={[
          <div key="a" data-testid="slide-a">
            A
          </div>,
          <div key="b" data-testid="slide-b">
            B
          </div>,
          <div key="c" data-testid="slide-c">
            C
          </div>,
        ]}
      />,
    )
    const track = container.querySelector('.zyvavu-widget-banner-slider__track') as HTMLElement
    expect(track).toBeTruthy()
    expect(track.style.display).toBe('flex')
    expect(container.querySelector('[data-slides-per-view="2"]')).toBeTruthy()
    expect(screen.getByLabelText('Previous slide')).toBeTruthy()
    expect(screen.getByLabelText('Next slide')).toBeTruthy()
  })

  it('treats ThemeRenderer Fragment slots as ReactNode, not Slides components', () => {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IO)
    const { container } = render(
      <BannerSliderFrontend
        id="slider"
        autoplay={false}
        slides={
          <>
            <div data-testid="frag-a">A</div>
            <div data-testid="frag-b">B</div>
          </>
        }
      />,
    )
    expect(container.querySelector('.zyvavu-widget-banner-slider__track')).toBeTruthy()
    expect(screen.getByTestId('frag-a').textContent).toBe('A')
    expect(screen.getByTestId('frag-b').textContent).toBe('B')
  })

  it('strips SlideItem margin including responsive payloads', () => {
    const stripped = stripSlideItemMargin({
      spacing: { margin: { token: 'lg' }, padding: { token: 'md' } },
      responsive: {
        tablet: { spacing: { margin: { topToken: 'sm' }, padding: { token: 'sm' } } },
      },
    })
    expect(stripped?.spacing?.margin).toBeUndefined()
    expect(stripped?.spacing?.padding).toEqual({ token: 'md' })
    expect(stripped?.responsive?.tablet?.spacing?.margin).toBeUndefined()
    expect(stripped?.responsive?.tablet?.spacing?.padding).toEqual({ token: 'sm' })
  })
})

describe('BannerSlider + AnimatedCounter patterns', () => {
  it('registers six usable system patterns', () => {
    for (const id of [...BANNER_PATTERN_IDS, ...COUNTER_PATTERN_IDS]) {
      const pattern = SYSTEM_PATTERNS.find((entry) => entry.id === id)
      expect(pattern, id).toBeTruthy()
      expect(() => validatePatternJSON(pattern!)).not.toThrow()
    }
  })

  it('renders BannerSlider pattern previews without treating {type,props} as React children', () => {
    for (const id of BANNER_PATTERN_IDS) {
      const record = SYSTEM_PATTERNS.find((entry) => entry.id === id)!
      expect(() =>
        render(
          <MantineProvider>
            <LivePatternPreview record={record} />
          </MantineProvider>,
        ),
      ).not.toThrow()
      cleanup()
    }
  })

  it('exposes dedicated Banner Slider and Animated Counter List Widget groups', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(
      <MantineProvider>
        <WidgetPatternLibrary context="home" beforeOperation={() => true} />
      </MantineProvider>,
    )
    expect(screen.getByRole('button', { name: 'Banner Slider' }).querySelector('.lucide-gallery-horizontal')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Animated Counter' }).querySelector('.lucide-hash')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Layout' }))
    expect(screen.queryByRole('button', { name: 'Insert Banner Slider' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Insert Animated Counter' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Insert Columns Layout' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Banner Slider' }))
    expect(screen.getByRole('button', { name: 'Insert Banner Slider' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert Hero Image Slider' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert Editorial Featured Slider' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert Minimal Image Slider' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Insert Animated Counter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Insert Single Highlight Counter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Insert Slide Item' })).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search widgets and patterns' }), {
      target: { value: 'Counter' },
    })
    expect(screen.queryByRole('button', { name: 'Insert Animated Counter' })).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search widgets and patterns' }), {
      target: { value: '' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Animated Counter' }))
    expect(screen.getByRole('button', { name: 'Insert Animated Counter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert Single Highlight Counter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert Statistics Row' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert Editorial Milestone' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Insert Banner Slider' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Insert Hero Image Slider' })).toBeNull()
  })

  it('audits List Widget group mappings', () => {
    const patterns = SYSTEM_PATTERNS.map((pattern) => ({
      id: pattern.id,
      widgetType: pattern.widgetType,
    }))
    const findings = auditLibraryListWidgetGroups({
      visibleWidgetTypes: ['BannerSlider', 'AnimatedCounter', 'Columns'],
      patternIds: [
        ...BANNER_PATTERN_IDS,
        ...COUNTER_PATTERN_IDS,
      ],
      groupOfWidget: widgetLibraryCategory,
      groupOfPattern: (patternId, widgetType) =>
        widgetLibraryPatternCategory({ id: patternId, widgetType }),
      patterns,
    })
    expect(findings).toEqual([])
    expect(LIBRARY_LIST_WIDGET_GROUPS).toHaveLength(2)
    expect(widgetLibraryPatternCategory({ id: 'counter-stats-row', widgetType: 'Columns' })).toBe(
      'animatedCounter',
    )
  })
})

describe('Library insert destination resolution', () => {
  const config = getEditorConfigForContext('home')
  const singleConfig = getEditorConfigForContext('single')

  it('rejects AnimatedCounter in BannerSlider slides and falls back to last Section', () => {
    expect(slotAcceptsType(config, 'BannerSlider', 'slides', 'AnimatedCounter')).toBe(false)
    expect(slotAcceptsType(config, 'Section', 'content', 'AnimatedCounter')).toBe(true)
    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: 'Section',
          props: {
            id: 's1',
            content: [
              {
                type: 'BannerSlider',
                props: {
                  id: 'banner',
                  slides: [{ type: 'SlideItem', props: { id: 'slide', content: [] } }],
                },
              },
            ],
          },
        },
      ],
    }
    const preferred = { ownerId: 'banner', slot: 'slides' }
    expect(resolveInsertDestination(data, 'AnimatedCounter', config, preferred)).toEqual({
      ownerId: 's1',
      slot: 'content',
    })
  })

  it('creates a Section wrapper when no valid container exists (one Undo step)', () => {
    const blank: Data = { root: { props: {} }, content: [] }
    let n = 0
    const item = {
      type: 'AnimatedCounter',
      props: { ...config.components.AnimatedCounter.defaultProps, id: 'counter-1' },
    }
    const next = insertWidgetPattern(blank, item, 'home', config, undefined, () => `wrap-${++n}`)
    expect(next.content).toHaveLength(1)
    expect(next.content[0].type).toBe('Section')
    expect(next.content[0].props.content[0].type).toBe('AnimatedCounter')
    expect(() => validatePatternOperation(next, blank, 'home', config)).not.toThrow()
  })

  it('inserts AnimatedCounter into selected Section and keeps existing widgets', () => {
    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: 'Section',
          props: {
            id: 's1',
            content: [{ type: 'Heading', props: { id: 'h1', text: 'Keep me' } }],
          },
        },
      ],
    }
    const item = {
      type: 'AnimatedCounter',
      props: { ...config.components.AnimatedCounter.defaultProps, id: 'counter-2' },
    }
    const dest = resolveInsertDestination(data, 'AnimatedCounter', config, {
      ownerId: 's1',
      slot: 'content',
    })
    const next = insertWidgetPattern(data, item, 'home', config, dest)
    expect(next.content[0].props.content.map((n: any) => n.type)).toEqual([
      'Heading',
      'AnimatedCounter',
    ])
  })

  it('allows Single Post draft insert without PostContent; Save still requires it', () => {
    const draft: Data = {
      root: { props: {} },
      content: [
        {
          type: 'Section',
          props: {
            id: 's1',
            content: [{ type: 'PostTitle', props: { id: 'title' } }],
          },
        },
      ],
    }
    const item = {
      type: 'AnimatedCounter',
      props: { ...singleConfig.components.AnimatedCounter.defaultProps, id: 'counter-3' },
    }
    const dest = resolveInsertDestination(draft, 'AnimatedCounter', singleConfig, {
      ownerId: 's1',
      slot: 'content',
    })
    const next = insertWidgetPattern(draft, item, 'single', singleConfig, dest)
    expect(() => validatePatternOperation(next, draft, 'single', singleConfig)).not.toThrow()
    expect(next.content[0].props.content.some((n: any) => n.type === 'PostTitle')).toBe(true)
    const saveCheck = validateThemeTemplateDocument(
      { version: 1, template: 'single', root: next.root, content: next.content, zones: {} },
      'single',
    )
    expect(saveCheck.valid).toBe(false)
    expect(saveCheck.errors.some((e) => e.includes('document.content'))).toBe(true)
  })

  it('wraps a counter preset once in Section and does not double-wrap Section roots', () => {
    const blank: Data = { root: { props: {} }, content: [] }
    const record = SYSTEM_PATTERNS.find((p) => p.id === 'counter-single-highlight')!
    let n = 0
    const item = instantiatePattern(designPatternFromJSON(record), config, () => `id-${++n}`)
    expect(item.type).toBe('AnimatedCounter')
    const next = insertWidgetPattern(blank, item, 'home', config, undefined, () => `wrap-${++n}`)
    expect(next.content).toHaveLength(1)
    expect(next.content[0].type).toBe('Section')
    expect(next.content[0].props.content[0].type).toBe('AnimatedCounter')
    const sectionRoot = {
      type: 'Section',
      props: { id: 'preset-section', content: [item] },
    }
    const withSection = insertWidgetPattern(
      blank,
      sectionRoot,
      'home',
      config,
      undefined,
      () => `wrap-${++n}`,
    )
    expect(withSection.content).toHaveLength(1)
    expect(withSection.content[0].props.id).toBe('preset-section')
  })
})
