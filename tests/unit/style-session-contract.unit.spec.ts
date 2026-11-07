import { describe, expect, it, vi } from 'vitest'
import {
  cloneStyle,
  createStyleSessionSnapshot,
  getCancelRestoreStyle,
  getDomainResetStyle,
  stylesEqual,
} from '@/lib/style-engine/style-session-contract'
import {
  createPuckHistoryCoordinator,
  dispatchDocumentData,
} from '@/lib/style-engine/editor-history'

describe('Style session contract', () => {
  it('Cancel restore returns the session-open snapshot, not a later edit', () => {
    const session = createStyleSessionSnapshot('w1', { backgroundToken: 'surface' }, 'background')
    const later = { backgroundToken: 'primary' }
    expect(stylesEqual(getCancelRestoreStyle(session), later)).toBe(false)
    expect(getCancelRestoreStyle(session).backgroundToken).toBe('surface')
    expect(session.style).not.toBe(getCancelRestoreStyle(session))
  })

  it('Reset domain clears only that domain fields', () => {
    const style = {
      backgroundToken: 'primary',
      border: { colorToken: 'border' },
      shadow: { shadowToken: 'shadowSoft' },
    }
    const next = getDomainResetStyle(style, 'background')
    expect(next.backgroundToken).toBeUndefined()
    expect(next.border?.colorToken).toBe('border')
    expect(next.shadow?.shadowToken).toBe('shadowSoft')
  })

  it('cloneStyle deep-copies', () => {
    const style = { background: { colorToken: 'surface' } }
    const cloned = cloneStyle(style)
    cloned.background!.colorToken = 'primary'
    expect(style.background?.colorToken).toBe('surface')
  })
})

describe('Editor history helpers', () => {
  it('dispatchDocumentData records history by default', () => {
    const dispatch = vi.fn()
    dispatchDocumentData(dispatch, { content: [] })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'setData',
      data: { content: [] },
      recordHistory: true,
    })
  })

  it('dispatchDocumentData can skip recording for coalescing callers', () => {
    const dispatch = vi.fn()
    dispatchDocumentData(dispatch, { content: [] }, { recordHistory: false })
    expect(dispatch.mock.calls[0][0].recordHistory).toBe(false)
  })

  it('Puck history coordinator routes undo/redo to the child owner', () => {
    const history = {
      back: vi.fn(),
      forward: vi.fn(),
      hasPast: () => true,
      hasFuture: () => false,
      index: 2,
      histories: [{}, {}, {}],
    }
    const coordinator = createPuckHistoryCoordinator(() => history)
    coordinator.undo()
    coordinator.redo()
    expect(history.back).toHaveBeenCalledTimes(1)
    expect(history.forward).toHaveBeenCalledTimes(1)
    expect(coordinator.canUndo()).toBe(true)
    expect(coordinator.canRedo()).toBe(false)
    expect(coordinator.getIndex()).toBe(2)
  })
})
