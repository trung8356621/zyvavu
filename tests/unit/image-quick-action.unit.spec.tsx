import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ImageQuickAction } from '@/components/builder/core/ImageQuickAction'
import { toolbarOffset } from '@/components/builder/core/useToolbarBoundary'

const state = vi.hoisted(() => ({
  item: { type: 'Image', props: { id: 'image-1', src: '', alt: 'Keep this description', style: { opacity: 0.8 } } },
  selector: { index: 2, zone: 'section:content' },
  edit: true,
  dispatch: vi.fn(),
}))
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (select: (value: unknown) => unknown) => select({
    getItemById: () => state.item,
    getSelectorForId: () => state.selector,
    getPermissions: () => ({ edit: state.edit }),
    dispatch: state.dispatch,
  }),
}))
vi.mock('@/components/admin/media/MediaSourcePicker', () => ({
  MediaSourcePicker: ({ triggerLabel, disabled, onSelect }: {
    triggerLabel: string; disabled: boolean; onSelect: (media: unknown) => void
  }) => <button disabled={disabled} onClick={() => onSelect({ id: 9, url: '/new.webp' })}>{triggerLabel}</button>,
}))

beforeEach(() => {
  state.item.type = 'Image'
  state.item.props.src = ''
  state.edit = true
  state.selector = { index: 2, zone: 'section:content' }
  state.dispatch.mockClear()
})
afterEach(cleanup)

describe('shared toolbar image quick action', () => {
  it('offers Change Image even with no source and preserves alt/style on selection', () => {
    render(<ImageQuickAction id="image-1" beforeOperation={() => true} />)
    state.selector = { index: 4, zone: 'other:content' }
    fireEvent.click(screen.getByText('Change Image'))
    expect(state.dispatch).toHaveBeenCalledWith({
      type: 'replace', destinationIndex: 4, destinationZone: 'other:content',
      data: { ...state.item, props: { ...state.item.props, src: '/new.webp' } },
    })
    expect(state.item.props.src).toBe('')
  })
  it.each(['FeaturedMedia', 'DocumentFeaturedMedia', 'Heading'])('does not offer a static picker for %s', (type) => {
    state.item.type = type
    render(<ImageQuickAction id="image-1" beforeOperation={() => true} />)
    expect(screen.queryByText('Change Image')).toBeNull()
  })
  it('respects edit permission', () => {
    state.edit = false
    render(<ImageQuickAction id="image-1" beforeOperation={() => true} />)
    fireEvent.click(screen.getByText('Change Image'))
    expect(state.dispatch).not.toHaveBeenCalled()
  })
  it('respects the active style transaction guard', () => {
    render(<ImageQuickAction id="image-1" beforeOperation={() => false} />)
    fireEvent.click(screen.getByText('Change Image'))
    expect(state.dispatch).not.toHaveBeenCalled()
  })
  it('rechecks permission after opening', () => {
    render(<ImageQuickAction id="image-1" beforeOperation={() => true} />)
    state.edit = false
    fireEvent.click(screen.getByText('Change Image'))
    expect(state.dispatch).not.toHaveBeenCalled()
  })
})

describe('floating toolbar boundaries', () => {
  const bounds = { left: 300, top: 100, right: 1000, bottom: 700 }
  it('preserves the native position when it fits', () => {
    expect(toolbarOffset({ left: 400, top: 120, width: 500, height: 52 }, bounds)).toEqual({ x: 0, y: 0 })
  })
  it('avoids the viewport toolbar and left canvas edge', () => {
    expect(toolbarOffset({ left: 100, top: 65, width: 500, height: 52 }, bounds)).toEqual({ x: 200, y: 35 })
  })
  it('clamps right and bottom edges', () => {
    expect(toolbarOffset({ left: 800, top: 680, width: 500, height: 52 }, bounds)).toEqual({ x: -300, y: -32 })
  })
  it('keeps a wrapped mobile toolbar within its canvas', () => {
    expect(toolbarOffset({ left: -50, top: 30, width: 344, height: 150 }, { left: 8, top: 80, right: 352, bottom: 700 })).toEqual({ x: 58, y: 50 })
  })
})
