import type { Data } from '@puckeditor/core'

export type PuckReplaceDispatch = (action: {
  type: 'replace'
  destinationIndex: number
  destinationZone: string
  data: Data['content'][number]
  recordHistory?: boolean
}) => void

export type AtomTextCommitApi = {
  getItemById: (id: string) => Data['content'][number] | undefined
  getSelectorForId: (id: string) => { index: number; zone: string } | undefined
  dispatch: PuckReplaceDispatch
}

/**
 * Single history-aware commit of props.text.
 * Call once per completed editing session (not per keystroke).
 */
export function commitAtomText(
  api: AtomTextCommitApi,
  widgetId: string,
  text: string,
  options: { recordHistory?: boolean } = {},
): boolean {
  const current = api.getItemById(widgetId)
  const selector = api.getSelectorForId(widgetId)
  if (!current || !selector) return false
  if (current.props?.text === text) return false

  api.dispatch({
    type: 'replace',
    destinationIndex: selector.index,
    destinationZone: selector.zone,
    data: {
      ...current,
      props: {
        ...current.props,
        text,
      },
    },
    recordHistory: options.recordHistory !== false,
  })
  return true
}
