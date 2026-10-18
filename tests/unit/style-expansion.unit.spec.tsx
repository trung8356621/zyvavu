import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import { getComponentStyleCapabilities } from '@/lib/style-engine/capabilities'
import {
  ANIMATION_CSS,
  animationAttributes,
  compatibleAnimations,
  isAnimationSupported,
} from '@/lib/style-engine/animation-presets'
import {
  animationToDropdown,
  dropdownToAnimation,
  resolveDropdownEffect,
} from '@/components/admin/shared/dropdownEffects'
import { resolveWidgetStyles, resolveSectionLayerStyles } from '@/lib/style-engine/serializer'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import { HeaderActionFrontend } from '@/widgets/HeaderAction/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemImageFrontend } from '@/widgets/ItemImage/frontend'
import { ColumnsFrontend } from '@/widgets/Columns/frontend'
import { FeaturedMediaFrontend } from '@/widgets/FeaturedMedia/frontend'
import {
  ButtonStyleControl,
  BUTTON_STYLE_GROUPS,
} from '@/components/admin/theme-builder/style-controls/ButtonStyleControl'
import { AnimationPresetPicker } from '@/components/admin/shared/AnimationPresetPicker'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => {
  cleanup()
  stylePreviewStore.clearPreview()
})

describe('Style expansion contracts', () => {
  it('does not infer working controls for unimplemented renderers', () => {
    expect(
      getComponentStyleCapabilities('Unknown', { capabilities: ['layout.text'] } as never),
    ).toEqual([])
    expect(getComponentStyleCapabilities('HeaderNav')).toEqual([])
    expect(getComponentStyleCapabilities('HeaderAction')).toContain('button')
    expect(getComponentStyleCapabilities('ItemLink', undefined, { variant: 'link' })).not.toContain(
      'button',
    )
    expect(getComponentStyleCapabilities('ItemLink', undefined, { variant: 'button' })).toContain(
      'button',
    )
    expect(getComponentStyleCapabilities('PostMeta')).toContain('typography')
  })

  it('serializes linked/unlinked borders, corners, layers and geometry for widgets and sections', () => {
    const style: UniversalStyle = {
      border: {
        linked: false,
        style: 'solid',
        widthToken: 'thin',
        sides: {
          top: { style: 'none' },
          left: { style: 'dashed', widthToken: 'thick', colorToken: 'primary' },
        },
      },
      radius: { radiusToken: 'sm', linked: false, corners: { topLeft: 'pill' } },
      shadow: { shadowToken: 'shadowStrong', layers: ['shadowSoft', 'shadowMedium'] },
      spacing: { padding: { token: 'lg' }, margin: { token: 'sm' } },
      dimensions: { containerWidth: 'narrowWidth', minHeight: 'md', align: 'center' },
    }
    const css = resolveWidgetStyles(style)
    expect(css.borderTop).toBe('none')
    expect(css.borderLeft).toContain('4px dashed')
    expect(css.borderTopLeftRadius).toBe('9999px')
    expect(css.boxShadow).toContain('0 2px 8px')
    expect(css.boxShadow).toContain('0 8px 24px')
    expect(css.boxShadow).not.toContain('0 16px 40px')
    expect(css.minHeight).toBe('400px')
    expect(css.textAlign).toBe('center')
    const section = resolveSectionLayerStyles(style)
    expect(section.rootStyle.borderLeft).toBe(css.borderLeft)
    expect(section.rootStyle.padding).toBe(css.padding)
    const inlineSection = renderToStaticMarkup(<section style={section.rootStyle} />)
    expect(inlineSection.indexOf('padding:')).toBeGreaterThan(inlineSection.indexOf('padding-top:'))
    expect(section.containerStyle.maxWidth).toContain('container-narrow')
    expect(resolveWidgetStyles({})).toEqual({})
    expect(
      resolveWidgetStyles({
        ...style,
        border: { ...style.border, linked: true },
        radius: { ...style.radius, linked: true },
      }).borderTopLeftRadius,
    ).toBeUndefined()
  })

  it.each([
    { dimensions: { containerWidth: '500px' } },
    { spacing: { padding: { token: '8px' } } },
    { border: { sides: { left: { colorToken: '#fff' } } } },
    { radius: { corners: { topLeft: '20px' } } },
    { shadow: { layers: ['custom-css'] } },
    { animation: { preset: 'scroll-fade', trigger: 'scroll', target: 'widget' } },
    { button: { version: 1, normal: { preset: 'theme' } } },
  ])('rejects unsupported or raw style values: %j', (style) => {
    expect(validateUniversalStyle(style).valid).toBe(false)
  })

  it('uses a single animation registry with compatible legacy dropdown values', () => {
    for (const value of ['none', 'fade', 'slide-down'] as const)
      expect(animationToDropdown(dropdownToAnimation(value))).toBe(value)
    expect(resolveDropdownEffect('inherit', 'slide-down')).toBe('slide-down')
    expect(compatibleAnimations('dropdown').map((p) => p.id)).toEqual([
      'none',
      'fade',
      'slide-down',
    ])
    expect(isAnimationSupported({ preset: 'lift', trigger: 'entrance', target: 'widget' })).toBe(
      false,
    )
    expect(
      animationAttributes({ preset: 'pulse', trigger: 'loop', target: 'section' }),
    ).toMatchObject({ 'data-zyvavu-motion': 'pulse' })
    expect(
      animationAttributes({ preset: 'scroll-fade', trigger: 'scroll', target: 'widget' }),
    ).toEqual({})
    expect(ANIMATION_CSS).toContain('prefers-reduced-motion: no-preference')
    expect(ANIMATION_CSS).not.toContain('visibility: hidden')
  })

  it('applies actual styles to text, box, media and CTA renderers while retaining URLs/tags', () => {
    const style: UniversalStyle = {
      typography: { typography: 'p2', colorToken: 'primary' },
      spacing: { padding: { token: 'lg' } },
      border: { style: 'dashed', widthToken: 'thick', colorToken: 'border' },
    }
    const context = {
      type: 'home' as const,
      item: { title: 'Item', url: '/preserved', image: { url: '/image.jpg' } },
    }
    for (const element of [
      <HeaderActionFrontend key="0" style={style} url="/preserved" />,
      <ItemLinkFrontend key="1" style={style} variant="button" dataContext={context} />,
      <ItemTitleFrontend key="2" style={style} tag="h4" dataContext={context} />,
      <ItemExcerptFrontend key="3" style={style} />,
      <ItemImageFrontend key="4" style={style} dataContext={context} />,
      <FeaturedMediaFrontend key="5" style={style} src="/image.jpg" />,
      <ColumnsFrontend key="6" style={style} />,
    ]) {
      const html = renderToStaticMarkup(element)
      expect(html).toContain('spacing-lg')
      expect(html).toContain('4px dashed')
    }
    expect(
      renderToStaticMarkup(<ItemTitleFrontend style={style} tag="h4" dataContext={context} />),
    ).toContain('<h4')
    expect(renderToStaticMarkup(<HeaderActionFrontend style={style} url="/preserved" />)).toContain(
      'href="/preserved"',
    )
  })

  it('renders the draft through the editor renderer and restores committed styles on Cancel', () => {
    const config = getEditorConfigForContext('single')
    const Preview = config.components.PostTitle.render as React.ComponentType<
      Record<string, unknown>
    >
    const committed = { typography: { colorToken: 'text' } }
    const { container } = render(<Preview id="preview-title" style={committed} tag="h2" />)
    expect(container.querySelector('h2')).not.toBeNull()
    act(() =>
      stylePreviewStore.setPreview('preview-title', { typography: { colorToken: 'primary' } }),
    )
    expect(container.querySelector('h2')?.getAttribute('style')).toContain('theme-primary')
    expect(committed.typography.colorToken).toBe('text')
    expect(stylePreviewStore.getPreview('preview-title')?.typography.colorToken).toBe('primary')
    act(() => stylePreviewStore.clearPreview('preview-title'))
    expect(container.querySelector('h2')?.getAttribute('style')).toContain('theme-text')
  })

  it('shows all seven button groups, independent local samples and explicit shell status', () => {
    render(
      <MantineProvider>
        <ButtonStyleControl />
      </MantineProvider>,
    )
    for (const name of BUTTON_STYLE_GROUPS) expect(screen.getByRole('tab', { name })).toBeTruthy()
    expect(screen.getByText(/Apply does not save/)).toBeTruthy()
    const sample = screen.getByRole('combobox', { name: 'Theme Button Presets (sample)' })
    fireEvent.click(sample)
    fireEvent.click(screen.getByRole('option', { name: 'outline' }))
    expect((sample as HTMLInputElement).value).toBe('outline')
    fireEvent.click(screen.getByRole('radio', { name: 'Hover' }))
    expect((sample as HTMLInputElement).value).toBe('')
    fireEvent.click(screen.getByRole('radio', { name: 'Normal' }))
    expect((sample as HTMLInputElement).value).toBe('outline')
  })

  it('does not apply an animation picker draft on Cancel', () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <AnimationPresetPicker target="widget" onChange={onChange} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Animation: none' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fade' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel animation' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Animation: none' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fade' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use animation' }))
    expect(onChange).toHaveBeenCalledWith({
      preset: 'fade',
      trigger: 'entrance',
      target: 'widget',
      options: undefined,
    })
  })

  it('Escape closes the nested animation picker without discarding the owning style transaction', () => {
    const onClose = vi.fn()
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          componentType="PostTitle"
          componentId="nested"
          currentStyle={{}}
          anchorEl={null}
          onClose={onClose}
          onUpdateStyle={vi.fn()}
        />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Animation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Animation: none' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Use animation' })).toBeNull()
    expect(
      (screen.getByRole('button', { name: 'Áp dụng / Apply' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })
})
