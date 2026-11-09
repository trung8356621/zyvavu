'use client'

import React from 'react'
import { InlineLinkEditor } from './InlineLinkEditor'
import {
  createLinkDraftFromMark,
  resolveLinkMarkFromDraft,
  type LinkEditorDraft,
} from './link-editor-model'

type WidgetItem = {
  type?: string
  props?: Record<string, unknown> & { id?: string; href?: string; newTab?: boolean }
}

/**
 * Widget-level Link Editor for Button / Image / Video props.href + props.newTab.
 * Reuses the canonical docked Link Editor — not a second URL system.
 * Hosted outside Puck ActionBar; receives document APIs from PuckHost.
 */
export function AtomWidgetLinkHost({
  componentId,
  opened,
  onClose,
  getItem,
  getSelector,
  dispatch,
}: {
  componentId: string | null
  opened: boolean
  onClose: () => void
  getItem: (id: string) => WidgetItem | null | undefined
  getSelector: (id: string) => { index: number; zone: string } | null | undefined
  dispatch: (action: unknown) => void
}) {
  const item = componentId ? getItem(componentId) : null
  if (!opened || !componentId || !item) return null

  const href = typeof item.props?.href === 'string' ? item.props.href : ''
  const newTab = Boolean(item.props?.newTab)

  return (
    <AtomWidgetLinkSession
      key={`${componentId}:${href}:${newTab ? '1' : '0'}`}
      componentId={componentId}
      item={item}
      href={href}
      newTab={newTab}
      onClose={onClose}
      getSelector={getSelector}
      dispatch={dispatch}
    />
  )
}

function AtomWidgetLinkSession({
  componentId,
  item,
  href,
  newTab,
  onClose,
  getSelector,
  dispatch,
}: {
  componentId: string
  item: WidgetItem
  href: string
  newTab: boolean
  onClose: () => void
  getSelector: (id: string) => { index: number; zone: string } | null | undefined
  dispatch: (action: unknown) => void
}) {
  const [draft, setDraft] = React.useState<LinkEditorDraft>(() =>
    createLinkDraftFromMark(
      { from: 0, to: 0 },
      {
        href: href || null,
        target: newTab ? '_blank' : '_self',
        rel: null,
      },
    ),
  )

  const apply = React.useCallback(
    (next: LinkEditorDraft) => {
      const resolved = resolveLinkMarkFromDraft(next)
      if (!resolved) return
      const selector = getSelector(componentId)
      if (!selector) return
      dispatch({
        type: 'replace',
        destinationIndex: selector.index,
        destinationZone: selector.zone,
        data: {
          ...item,
          props: {
            ...item.props,
            href: resolved.unset ? '' : resolved.href || '',
            newTab: resolved.target === '_blank',
          },
        },
      })
      onClose()
    },
    [componentId, dispatch, getSelector, item, onClose],
  )

  return (
    <InlineLinkEditor
      opened
      draft={draft}
      onChange={setDraft}
      onApply={apply}
      onCancel={onClose}
    />
  )
}
