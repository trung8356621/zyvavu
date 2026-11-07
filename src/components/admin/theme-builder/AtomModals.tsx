'use client'

/**
 * Legacy Atom modal shells are retired.
 * Official Atom Settings = native Puck Fields panel (see atom-settings.ts / PuckHost dictionary).
 * Style presentation remains in WidgetStyleContextMenu (Style Sidebar).
 *
 * This module keeps type aliases for any residual imports; do not mount a parallel settings UI.
 */
export type AtomModalRequest = {
  id: string
  type: string
  kind: 'settings' | 'link'
  anchor: HTMLElement
}

type Props = { request: AtomModalRequest; onClose: () => void }

/** @deprecated Use Puck Fields (Atom Settings) via openAtomSettings — no extra modal. */
export function AtomModal(_props: Props) {
  return null
}
