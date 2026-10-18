import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { getFrontendWidget } from '@/lib/theme-engine/widget-registry-frontend'
import { getStyleModalDomains, resetStyleDomain } from '@/lib/style-engine/domains'
import {
  WIDGET_DESIGN_PATTERNS,
  instantiatePattern,
  insertWidgetPattern,
  applyWidgetPattern,
  validatePatternOperation,
} from '@/lib/theme-engine/widget-patterns'
import { resolveSectionLayerStyles } from '@/lib/style-engine/serializer'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { replayAnimation, replayWidgetAnimation } from '@/lib/style-engine/animation-replay'
import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import { AnimationPresetControls } from '@/components/admin/shared/AnimationPresetPicker'
import type { Data } from '@puckeditor/core'

beforeEach(() => {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(() => {
  cleanup()
  stylePreviewStore.clearPreview()
  vi.restoreAllMocks()
})
const config = getEditorConfigForContext('home')
const blank: Data = { root: { props: {} }, content: [] }
let sequence = 0
const nextId = () => `new-${++sequence}`

describe('Visual Builder UX V2 contracts', () => {
  it('exposes the four global domains for every widget and text-only Typography', () => {
    for (const type of [
      'Section',
      'Columns',
      'Header',
      'HeaderNav',
      'ProductHeader',
      'TextBlock',
    ]) {
      expect(getStyleModalDomains(type).slice(0, 4)).toEqual([
        'animation',
        'background',
        'spacing',
        'borders',
      ])
    }
    expect(getStyleModalDomains('Section')).toHaveLength(4)
    expect(getStyleModalDomains('Columns')).not.toContain('typography')
    expect(getStyleModalDomains('TextBlock')).toContain('typography')
    expect(getStyleModalDomains('HeaderAction')).toContain('button')
    expect(getStyleModalDomains('HeaderAction')).not.toContain('typography')
  })
  it('resets only the active domain and preserves semantic/other styles', () => {
    expect(
      resetStyleDomain(
        {
          background: { colorToken: 'primary' },
          typography: { typography: 'h2' },
          border: { style: 'solid' },
        },
        'background',
      ),
    ).toEqual({ typography: { typography: 'h2' }, border: { style: 'solid' } })
  })
  it('renders global background/layout/borders through both editor and frontend registries', () => {
    const props = {
      id: 'text-1',
      title: 'Hello',
      style: {
        background: {
          mode: 'color',
          colorToken: 'primary',
          pattern: { preset: 'dots', opacity: 0.2 },
        },
        border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
        dimensions: { minHeight: 'sm' },
      },
    }
    const Frontend = getFrontendWidget('TextBlock')!.component
    const editor = renderToStaticMarkup(
      React.createElement(config.components.TextBlock.render as React.ComponentType<any>, props),
    )
    const frontend = renderToStaticMarkup(<Frontend {...props} />)
    for (const markup of [editor, frontend]) {
      expect(markup).toContain('data-widget-style-surface="text-1"')
      expect(markup).toContain('radial-gradient')
      expect(markup).toContain('min-height:200px')
      expect(markup).toContain('border:')
      expect(markup).toContain('Hello')
    }
  })
  it('instantiates curated patterns with unique IDs and Section-only root placement', () => {
    const pattern = WIDGET_DESIGN_PATTERNS.find((entry) => entry.id === 'text-card')!
    const a = instantiatePattern(pattern, config, nextId)
    const b = instantiatePattern(pattern, config, nextId)
    expect(a.props.id).not.toBe(b.props.id)
    const next = insertWidgetPattern(blank, a, 'home', config, undefined, nextId)
    expect(next.content[0].type).toBe('Section')
    expect(next.content[0].props.content[0]).toEqual(a)
    expect(() => validatePatternOperation(next, blank, 'home', config)).not.toThrow()
    expect(blank.content).toHaveLength(0)
  })
  it('preserves bindings/IDs/slots on apply and rejects locked widgets', () => {
    const pattern = WIDGET_DESIGN_PATTERNS.find((entry) => entry.id === 'text-card')!
    const item = {
      type: 'TextBlock',
      props: {
        id: 'bound',
        title: 'Original',
        binding: { source: 'document.title' },
        style: { animation: { preset: 'fade' } },
      },
    }
    const doc = insertWidgetPattern(blank, item, 'home', config, undefined, nextId)
    const next = applyWidgetPattern(doc, pattern, 'bound', config)
    const props = next.content[0].props.content[0].props
    expect(props.id).toBe('bound')
    expect(props.title).toBe('Original')
    expect(props.binding).toEqual(item.props.binding)
    expect(props.style.animation).toEqual(item.props.style.animation)
    doc.content[0].props.content[0].props.lock = { canEditProps: false }
    expect(() => applyWidgetPattern(doc, pattern, 'bound', config)).toThrow(/locked/)
  })
  it('validates nested slots, IDs, unique and required policies before mutation', () => {
    const invalid = {
      ...blank,
      content: [
        {
          type: 'Section',
          props: { id: 's', content: [{ type: 'Section', props: { id: 'nested' } }] },
        },
      ],
    }
    expect(() => validatePatternOperation(invalid, blank, 'home', config)).toThrow(/slot/)
    const doc = {
      ...blank,
      content: [
        {
          type: 'Section',
          props: { id: 's', content: [{ type: 'TextBlock', props: { id: 's' } }] },
        },
      ],
    }
    expect(() => validatePatternOperation(doc, blank, 'home', config)).toThrow(/Duplicate/)
    const pageConfig = getEditorConfigForContext('page')
    const page = {
      ...blank,
      content: [
        {
          type: 'Section',
          props: {
            id: 's',
            content: [
              { type: 'PostContent', props: { id: 'body' } },
              { type: 'PostContent', props: { id: 'body-2' } },
            ],
          },
        },
      ],
    }
    expect(() => validatePatternOperation(page, blank, 'page', pageConfig)).toThrow(/Only one/)
    expect(() => validatePatternOperation(blank, blank, 'page', pageConfig)).toThrow(/requires/)
  })
  it('preserves the native sticky header and direct grid children', () => {
    const Header = getFrontendWidget('Header')!.component
    const header = render(
      <Header id="header" sticky style={{ background: { colorToken: 'primary' } }} />,
    )
    const root = header.container.firstElementChild as HTMLElement
    expect(root.tagName).toBe('HEADER')
    expect(root.style.position).toBe('sticky')
    header.unmount()
    const Columns = getFrontendWidget('Columns')!.component
    const columns = render(
      <Columns
        id="cols"
        distribution="equal-2"
        column1={<span>A</span>}
        column2={<span>B</span>}
        style={{ background: { pattern: { preset: 'dots' } } }}
      />,
    )
    expect((columns.container.firstElementChild as HTMLElement).style.display).toBe('grid')
    expect(columns.container.querySelector('.zyvavu-widget-columns')?.textContent).toContain('A')
  })
  it('updates previews without replacing the widget DOM or committing document props', () => {
    const props = { id: 'stable', title: 'Stable heading', style: {} }
    const Editor = config.components.TextBlock.render as React.ComponentType<any>
    const view = render(<Editor {...props} />)
    const heading = view.container.querySelector('.zyvavu-widget-text__title')
    act(() => stylePreviewStore.setPreview('stable', { background: { colorToken: 'primary' } }))
    expect(view.container.querySelector('.zyvavu-widget-text__title')).toBe(heading)
    expect(props.style).toEqual({})
    act(() => stylePreviewStore.clearPreview('stable'))
    expect(view.container.querySelector('.zyvavu-widget-text__title')).toBe(heading)
  })
  it('guards domain switching until the active draft is resolved', async () => {
    const base = {
      opened: true,
      anchorEl: null,
      componentType: 'TextBlock',
      componentId: 'switch',
      currentStyle: { background: { colorToken: 'primary' } },
      onClose: vi.fn(),
      onUpdateStyle: vi.fn(),
    }
    const view = render(
      <MantineProvider>
        <WidgetStyleContextMenu {...base} domain="background" />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset domain' }))
    view.rerender(
      <MantineProvider>
        <WidgetStyleContextMenu {...base} domain="animation" requestNonce={1} />
      </MantineProvider>,
    )
    expect(await screen.findByText('Unapplied changes')).toBeTruthy()
    expect(base.onUpdateStyle).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(stylePreviewStore.getPreview('switch')).toBeNull()
    expect(await screen.findByRole('button', { name: 'Test Animation' })).toBeTruthy()
  })
  it('replays a scoped widget inside the Puck iframe', () => {
    const host = document.createElement('div')
    host.className = 'zyvavu-puck-host-wrapper'
    const iframe = document.createElement('iframe')
    host.append(iframe)
    document.body.append(host)
    const doc = iframe.contentDocument!
    const sample = doc.createElement('div')
    sample.dataset.widgetStyleSurface = 'framed'
    doc.body.append(sample)
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn(), onfinish: null })
    sample.animate = animate
    const result = replayWidgetAnimation('framed', {
      preset: 'lift',
      trigger: 'hover',
      target: 'widget',
    })
    expect(result.message).toBeUndefined()
    expect(animate).toHaveBeenCalledOnce()
    result.cancel()
    host.remove()
  })
  it('validates pattern options and keeps opacity on the background layer', () => {
    expect(
      validateUniversalStyle({
        background: { pattern: { preset: 'custom-svg', opacity: 2, scale: 'raw', svg: '<svg />' } },
      }).valid,
    ).toBe(false)
    const layers = resolveSectionLayerStyles({
      background: {
        pattern: { preset: 'grid', colorToken: 'primary', opacity: 0.25, scale: 'lg' },
      },
    })
    expect(layers.patternStyle.opacity).toBe(0.25)
    expect(layers.patternStyle.backgroundSize).toBe('48px 48px')
    expect(layers.rootStyle.opacity).toBeUndefined()
    expect(layers.patternStyle.color).toContain('primary')
  })
  it('replays the existing canvas element with finite WAAPI and no document/store mutation', () => {
    const element = document.createElement('div')
    element.dataset.widgetStyleSurface = 'canvas-1'
    document.body.append(element)
    const cancel = vi.fn()
    const animate = vi.fn().mockReturnValue({ cancel, onfinish: null })
    element.animate = animate
    const effect = { preset: 'pulse', trigger: 'loop', target: 'widget' } as const
    const result = replayWidgetAnimation('canvas-1', effect)
    expect(animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ iterations: 1, fill: 'none' }),
    )
    expect(element.isConnected).toBe(true)
    expect(stylePreviewStore.getPreview('canvas-1')).toBeNull()
    result.cancel()
    expect(cancel).toHaveBeenCalled()
    element.remove()
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    replayAnimation(element, effect)
    expect(animate).toHaveBeenCalledTimes(1)
  })
  it('opens one independent domain with Apply/Cancel and preserves unrelated fields on Reset', () => {
    const apply = vi.fn()
    const original = {
      typography: { typography: 'h2' },
      background: { mode: 'color' as const, colorToken: 'primary' },
    }
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          domain="background"
          anchorEl={null}
          componentType="TextBlock"
          componentId="t"
          currentStyle={original}
          onClose={vi.fn()}
          onUpdateStyle={apply}
        />
      </MantineProvider>,
    )
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain('Background:')
    expect(screen.queryByRole('tab', { name: 'Type' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reset domain' }))
    expect(stylePreviewStore.getPreview('t')?.typography).toEqual(original.typography)
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }))
    expect(apply).toHaveBeenCalledWith({ typography: original.typography })
  })
  it('plays hover/focus samples on the sample element only and keeps Scroll disabled', () => {
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn(), onfinish: null })
    const previous = HTMLElement.prototype.animate
    HTMLElement.prototype.animate = animate
    render(
      <MantineProvider>
        <AnimationPresetControls target="widget" onChange={vi.fn()} />
      </MantineProvider>,
    )
    fireEvent.focus(screen.getByRole('button', { name: 'Fade' }))
    expect(animate).toHaveBeenCalled()
    expect(
      screen.getByRole('tab', { name: 'Scroll (shell)' }).getAttribute('data-disabled'),
    ).not.toBeNull()
    HTMLElement.prototype.animate = previous
  })
})
