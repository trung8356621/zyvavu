import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

import { BordersEffectsControl } from '@/components/admin/theme-builder/style-controls/BordersEffectsControl'
import { SpacingDimensionsControl } from '@/components/admin/theme-builder/style-controls/SpacingDimensionsControl'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { resetStyleGroup } from '@/lib/style-engine/domains'
import type { RadiusConfig, SpacingConfig, UniversalStyle } from '@/lib/style-engine/types'

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

const themeConfig = {
  name: 'test',
  version: 1,
  tokens: {
    colors: { primary: '#0e6b66', text: '#111', border: '#ddd', surface: '#fff' },
    typography: {},
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
    layout: {},
    radius: { sm: '4px', md: '8px', lg: '16px', pill: '9999px' },
  },
} as any

describe('Batch 2 — Border / Radius / Spacing', () => {
  it('keeps asymmetric radius corners across unlink → link → unlink and remount', () => {
    const asymmetric: RadiusConfig = {
      linked: false,
      radiusToken: 'md',
      corners: { topLeft: 'pill', topRight: 'sm', bottomRight: 'lg', bottomLeft: 'none' },
    }
    const onChangeRadius = vi.fn()
    const { rerender } = render(
      <MantineProvider>
        <BordersEffectsControl
          domain="borders"
          themeConfig={themeConfig}
          radius={asymmetric}
          onChangeBorder={() => {}}
          onChangeRadius={onChangeRadius}
          onChangeShadow={() => {}}
          onChangeEffects={() => {}}
          onOpenColorModal={() => {}}
        />
      </MantineProvider>,
    )

    expect((screen.getByRole('combobox', { name: 'Top left' }) as HTMLInputElement).value).toBe(
      'Pill',
    )
    expect((screen.getByRole('combobox', { name: 'Top right' }) as HTMLInputElement).value).toBe(
      'Small',
    )

    // Link corners — must not wipe stored asymmetric values.
    fireEvent.click(screen.getByRole('switch', { name: 'Link radius corners' }))
    const linked = onChangeRadius.mock.calls.at(-1)?.[0] as RadiusConfig
    expect(linked.linked).toBe(true)
    expect(linked.corners).toEqual(asymmetric.corners)

    // Remount with linked=true still holding corners in data.
    onChangeRadius.mockClear()
    rerender(
      <MantineProvider>
        <BordersEffectsControl
          domain="borders"
          themeConfig={themeConfig}
          radius={linked}
          onChangeBorder={() => {}}
          onChangeRadius={onChangeRadius}
          onChangeShadow={() => {}}
          onChangeEffects={() => {}}
          onOpenColorModal={() => {}}
        />
      </MantineProvider>,
    )
    expect(screen.queryByRole('combobox', { name: 'Top left' })).toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: 'Link radius corners' }))
    const unlinked = onChangeRadius.mock.calls.at(-1)?.[0] as RadiusConfig
    expect(unlinked.linked).toBe(false)
    expect(unlinked.corners).toEqual(asymmetric.corners)

    const css = resolveWidgetStyles({ radius: asymmetric })
    expect(css.borderTopLeftRadius).toBe('9999px')
    expect(css.borderTopRightRadius).toContain('radius-sm')
  })

  it('reset radius group clears radius only', () => {
    const style: UniversalStyle = {
      radius: { linked: false, corners: { topLeft: 'pill' }, radiusToken: 'md' },
      border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
      shadow: { shadowToken: 'shadowSoft' },
    }
    const next = resetStyleGroup(style, 'radius')
    expect(next.radius).toBeUndefined()
    expect(next.border).toEqual(style.border)
    expect(next.shadow).toEqual(style.shadow)
  })

  it('padding unlink seeds sides and link collapses without inventing extras', () => {
    const onChangeSpacing = vi.fn()
    render(
      <MantineProvider>
        <SpacingDimensionsControl
          spacing={{ padding: { token: 'lg' }, margin: { token: 'sm' } }}
          onChangeSpacing={onChangeSpacing}
          onChangeDimensions={() => {}}
        />
      </MantineProvider>,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Link padding sides' }))
    const unlinked = onChangeSpacing.mock.calls.at(-1)?.[0] as SpacingConfig
    expect(unlinked.padding?.token).toBeUndefined()
    expect(unlinked.padding).toEqual({
      topToken: 'lg',
      bottomToken: 'lg',
      leftToken: 'lg',
      rightToken: 'lg',
    })
    expect(unlinked.margin).toEqual({ token: 'sm' })

    onChangeSpacing.mockClear()
    cleanup()
    render(
      <MantineProvider>
        <SpacingDimensionsControl
          spacing={unlinked}
          onChangeSpacing={onChangeSpacing}
          onChangeDimensions={() => {}}
        />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('switch', { name: 'Link padding sides' }))
    const linked = onChangeSpacing.mock.calls.at(-1)?.[0] as SpacingConfig
    expect(linked.padding).toEqual({ token: 'lg' })

    const css = resolveWidgetStyles({
      spacing: {
        padding: { topToken: 'lg', bottomToken: 'xs', leftToken: 'md', rightToken: 'md' },
      },
    })
    expect(css.paddingTop).toContain('spacing-lg')
    expect(css.paddingBottom).toContain('spacing-xs')
    expect(css.padding).toBeUndefined()
  })

  it('serializes opacity and shadow tokens that the effects UI exposes', () => {
    const css = resolveWidgetStyles({
      shadow: { shadowToken: 'shadowMedium' },
      effects: { opacity: 0.7, backdropBlur: 'sm' },
    })
    expect(css.boxShadow).toContain('0 8px 24px')
    expect(css.opacity).toBe(0.7)
    expect(String(css.backdropFilter || '')).toMatch(/blur/i)
  })
})
