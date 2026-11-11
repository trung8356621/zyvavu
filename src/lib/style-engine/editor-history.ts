/**
 * Thin Zyvavu Editor History helpers over Puck 0.23.
 *
 * Gate findings (CONFIRMED from @puckeditor/core 0.23.0):
 * 1. New steps: record() after actions with recordHistory true (or default-recording types).
 * 2. External undo/redo: history.back() / history.forward() (+ Ctrl/Cmd+Z wired by Puck).
 * 3. Current index: history.index; stack: history.histories.
 * 4. Redo invalidation: record() does histories.slice(0, index + 1) before append.
 * 5. Limits: no MAX_HISTORY in createHistorySlice (unbounded).
 * 6. Coalescing: record() is debounce(250ms); setData must pass recordHistory: true.
 * 7. setData / setUi / set do NOT record unless recordHistory is explicitly true.
 *
 * Architecture: Style commits go through Puck setData — do NOT maintain a second Style stack.
 * The coordinator only routes/syncs; child (Puck) owns undo payload.
 */

import type { Data } from '@puckeditor/core'
import type { StyleCommitOptions } from './style-session-contract'

export type PuckHistoryApi = {
  back: () => void
  forward: () => void
  /** Puck HistorySlice uses functions; UsePuckData exposes booleans. */
  hasPast: boolean | (() => boolean)
  hasFuture: boolean | (() => boolean)
  index: number
  histories: unknown[]
  setHistories?: (histories: unknown[]) => void
  setHistoryIndex?: (index: number) => void
}

function readHistoryFlag(value: boolean | (() => boolean) | undefined): boolean {
  if (typeof value === 'function') return Boolean(value())
  return Boolean(value)
}

export type PuckDispatch = (action: {
  type: string
  data?: Partial<Data> | ((previous: Data) => Partial<Data>)
  state?: unknown
  recordHistory?: boolean
  ui?: unknown
}) => void

export type EditorHistoryCoordinator = {
  owner: 'puck'
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  getIndex: () => number
}

/** Build a coordinator that delegates entirely to Puck history (no parallel stack). */
export function createPuckHistoryCoordinator(getHistory: () => PuckHistoryApi | null): EditorHistoryCoordinator {
  return {
    owner: 'puck',
    undo: () => getHistory()?.back(),
    redo: () => getHistory()?.forward(),
    canUndo: () => readHistoryFlag(getHistory()?.hasPast),
    canRedo: () => readHistoryFlag(getHistory()?.hasFuture),
    getIndex: () => getHistory()?.index ?? -1,
  }
}

/**
 * Commit document data through Puck. Style Editor must use recordHistory: true
 * so Undo/Redo include style changes (current Zyvavu Apply path omitted this flag).
 */
export function dispatchDocumentData(
  dispatch: PuckDispatch,
  data: Partial<Data> | ((previous: Data) => Partial<Data>),
  options: StyleCommitOptions = {},
): void {
  const recordHistory = options.recordHistory !== false
  dispatch({
    type: 'setData',
    data,
    recordHistory,
  })
}
