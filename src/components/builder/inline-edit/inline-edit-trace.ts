/**
 * Dev-only interaction trace for inline edit.
 * Enable: localStorage.setItem('zyvavu:inline-edit-trace','1') then reload.
 */
export type InlineEditTraceEvent = {
  phase: string
  id?: string
  detail?: Record<string, unknown>
}

function enabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  try {
    return globalThis.localStorage?.getItem('zyvavu:inline-edit-trace') === '1'
  } catch {
    return false
  }
}

export function classifyPointerTarget(target: EventTarget | null, session: HTMLElement | null) {
  const el = target instanceof Element ? target : null
  const puckHost = session?.closest('[data-puck-component]') as HTMLElement | null
  const sectionHost = el?.closest('[data-puck-component]') as HTMLElement | null
  const inProseMirror = Boolean(el?.closest('.ProseMirror'))
  const inSession = Boolean(session && target instanceof Node && session.contains(target))
  const inPuckHost = Boolean(puckHost && target instanceof Node && puckHost.contains(target as Node))
  const inToolbar = Boolean(el?.closest('[data-inline-edit-toolbar]'))
  const inLinkModal = Boolean(el?.closest('[data-inline-link-modal]'))
  return {
    tag: el?.tagName?.toLowerCase() ?? null,
    className: typeof el?.className === 'string' ? el.className.slice(0, 120) : null,
    puckComponentId: sectionHost?.getAttribute('data-puck-component'),
    sessionPuckId: puckHost?.getAttribute('data-puck-component'),
    inProseMirror,
    inSession,
    inPuckHost,
    inToolbar,
    inLinkModal,
    boundary:
      inToolbar || inLinkModal
        ? 'toolbar-or-modal'
        : inProseMirror
          ? 'tiptap'
          : inSession
            ? 'edit-session'
            : inPuckHost
              ? 'puck-heading-host'
              : sectionHost
                ? 'other-puck-component'
                : 'outside',
  }
}

export function traceInlineEdit(event: InlineEditTraceEvent): void {
  if (!enabled()) return
  // eslint-disable-next-line no-console
  console.info('[zyvavu:inline-edit]', event.phase, {
    id: event.id,
    ...event.detail,
  })
}

export function pathSummary(event: Event, limit = 8): string[] {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return path.slice(0, limit).map((node) => {
    if (!(node instanceof Element)) return String(node)
    const puck = node.getAttribute?.('data-puck-component')
    const session = node.getAttribute?.('data-inline-edit-session')
    const bits = [node.tagName.toLowerCase()]
    if (node.classList?.contains('ProseMirror')) bits.push('.ProseMirror')
    if (puck) bits.push(`[puck=${puck}]`)
    if (session) bits.push(`[session=${session}]`)
    return bits.join('')
  })
}
