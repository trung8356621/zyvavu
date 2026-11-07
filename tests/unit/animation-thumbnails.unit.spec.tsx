import React from 'react'
vi.mock('@payloadcms/ui', () => ({ useDocumentDrawer: vi.fn(), useListDrawer: vi.fn() }))
vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: () => null,
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  ANIMATION_THUMBNAILS,
  AnimationPresetThumbnail,
  WIX_BUTTON_ANIMATION_THUMBNAIL_INVENTORY,
  ZYVAVU_ANIMATION_THUMBNAIL_PRESETS,
  getAnimationThumbnailId,
  summarizeAnimationThumbnailAssets,
} from '@/lib/style-engine/animation-thumbnails'
import { ANIMATION_PRESETS } from '@/lib/style-engine/animation-presets'
import { AnimationPresetControls } from '@/components/admin/shared/AnimationPresetPicker'
import { WidgetStyleContextMenu } from '@/components/admin/theme-builder/WidgetStyleContextMenu'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
})

describe('animation thumbnails', () => {
  it('inventories all 60 Wix Button slots as REFERENCE_ONLY and keeps zero Wix SVGs in source', () => {
    expect(WIX_BUTTON_ANIMATION_THUMBNAIL_INVENTORY).toHaveLength(60)
    expect(WIX_BUTTON_ANIMATION_THUMBNAIL_INVENTORY.every((s) => s.status === 'REFERENCE_ONLY')).toBe(
      true,
    )
    const summary = summarizeAnimationThumbnailAssets()
    expect(summary.wixInventoryTotal).toBe(60)
    expect(summary.wixInSource).toBe(0)
    expect(summary.zyvavuCreated).toBe(15)
    expect(summary.zyvavuMissingForActivePresets).toBe(0)
    expect(summary.zyvavuMappedFromWixConcepts).toBeGreaterThanOrEqual(4)
  })

  it('ships a reusable Zyvavu SVG for every registered preset thumbnail', () => {
    for (const id of ZYVAVU_ANIMATION_THUMBNAIL_PRESETS) {
      const html = renderToStaticMarkup(<AnimationPresetThumbnail preset={id} />)
      expect(html).toContain('viewBox="0 0 72 72"')
      expect(html).toContain('data-zyvavu-animation-thumb')
      expect(html).not.toContain('parastorage')
      expect(html).not.toContain('wixstatic')
    }
    expect(Object.keys(ANIMATION_THUMBNAILS).sort()).toEqual(
      [...ZYVAVU_ANIMATION_THUMBNAIL_PRESETS].sort(),
    )
    for (const preset of ANIMATION_PRESETS) {
      expect(getAnimationThumbnailId(preset.id)).toBe(preset.thumbnail)
    }
  })

  it('renders distinct preset thumbnails inside the Animation Selector', () => {
    render(
      <MantineProvider>
        <AnimationPresetControls target="widget" onChange={vi.fn()} />
      </MantineProvider>,
    )
    expect(screen.getByTestId('animation-preview-fade').getAttribute('data-animation-thumb')).toBe(
      'fade',
    )
    expect(screen.getByTestId('animation-preview-grow-in').querySelector('svg')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Loop' }))
    expect(screen.getByTestId('animation-preview-breathe').getAttribute('data-animation-thumb')).toBe(
      'breathe',
    )
    expect(screen.getByTestId('animation-preview-pulse').getAttribute('data-animation-thumb')).toBe(
      'pulse',
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Hover' }))
    expect(screen.getByTestId('animation-preview-lift').getAttribute('data-animation-thumb')).toBe(
      'lift',
    )
  })

  it('shows conditional Breathe controls from Wix evidence defaults', () => {
    function Harness() {
      const [value, setValue] = React.useState<
        import('@/lib/style-engine/animation-presets').AnimationConfig | undefined
      >()
      return <AnimationPresetControls target="widget" value={value} onChange={setValue} />
    }
    render(
      <MantineProvider>
        <Harness />
      </MantineProvider>,
    )
    expect(screen.getByTestId('animation-library-page')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Loop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Breathe' }))
    expect(screen.getByTestId('animation-settings-page')).toBeTruthy()
    expect(screen.queryByTestId('animation-library-page')).toBeNull()
    const controls = screen.getByTestId('animation-effect-controls')
    expect(controls).toBeTruthy()
    expect(controls.textContent).toContain('Direction')
    expect(controls.textContent).toContain('Distance (px)')
    expect(controls.textContent).toContain('Duration (sec)')
    expect(controls.textContent).toContain('Delay between loops (sec)')
    expect(controls.textContent).not.toContain('Delay (sec)')
    fireEvent.click(screen.getByRole('button', { name: 'Back to animation library' }))
    expect(screen.getByTestId('animation-library-page')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Hover' }))
    expect(screen.queryByTestId('animation-effect-controls')).toBeNull()
    expect(screen.getByTestId('animation-preview-lift')).toBeTruthy()
  })

  it('direct-commits animation changes and does not record history on Replay alone', () => {
    const onUpdateStyle = vi.fn(() => true)
    render(
      <MantineProvider>
        <WidgetStyleContextMenu
          opened
          domain="animation"
          requestNonce={1}
          componentType="TextBlock"
          componentId="anim-1"
          currentStyle={{}}
          anchorEl={null}
          onClose={vi.fn()}
          onUpdateStyle={onUpdateStyle}
        />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fade' }))
    expect(onUpdateStyle.mock.calls[0]?.[0]).toMatchObject({
      animation: { preset: 'fade', trigger: 'entrance', target: 'widget' },
    })
    const callsAfterSelect = onUpdateStyle.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Test Animation' }))
    expect(onUpdateStyle.mock.calls.length).toBe(callsAfterSelect)
    fireEvent.click(screen.getByRole('button', { name: 'Clear animation' }))
    const last = onUpdateStyle.mock.calls.at(-1)?.[0] as { animation?: unknown }
    expect(last?.animation).toBeUndefined()
  })
})
