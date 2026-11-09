'use client'

import React from 'react'
import {
  createUsePuck,
  registerOverlayPortal,
} from '@puckeditor/core'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { commitAtomText } from './commit-atom-text'
import {
  allowsMultilineEnter,
  serializeInlineFromEditor,
  textEditorContent,
  type HeadingTag,
  type InlineAtomKind,
} from './content-model'
import { inlineContentExtensions } from './extensions'
import { InlineFormatToolbar } from './InlineFormatToolbar'
import { InlineLinkEditor } from './InlineLinkEditor'
import {
  createLinkDraftFromMark,
  resolveLinkMarkFromDraft,
  type LinkEditorDraft,
} from './link-editor-model'
import {
  classifyPointerTarget,
  pathSummary,
  traceInlineEdit,
} from './inline-edit-trace'
import styles from './InlineContentEditor.module.css'

const usePuck = createUsePuck()

type EditableProps = {
  kind: InlineAtomKind
  id: string
  text?: string
  tag?: HeadingTag
  style?: WidgetSemanticStyle
  children: React.ReactNode
}

/**
 * Double-click gated inline edit for free Heading (H1–H6/P) and legacy Text.
 *
 * Canvas editor DOM is a full-width session + ProseMirror (not heading > div > p).
 * Published frontend keeps real semantic tags via AtomPresentation.
 *
 * Boundary model (DOM, not geometry):
 * - Section Container = ancestor puck component / dropzone
 * - Puck Heading host = `[data-puck-component="<id>"]`
 * - Edit session = `[data-inline-edit-session]`
 * Clicks inside the Heading host must not commit; bubbled Section reselection is ignored.
 */
export function InlineEditableAtom({ kind, id, text, tag, style, children }: EditableProps) {
  const [editing, setEditing] = React.useState(false)
  const startTextRef = React.useRef(text ?? '')
  const clickPointRef = React.useRef<{ x: number; y: number } | null>(null)
  const idleRef = React.useRef<HTMLDivElement | null>(null)
  const selected = usePuck((s) => s.selectedItem)
  const getItemById = usePuck((s) => s.getItemById)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const dispatch = usePuck((s) => s.dispatch)

  const commit = React.useCallback(
    (nextText: string) => {
      traceInlineEdit({
        phase: 'commit',
        id,
        detail: { nextLen: nextText.length },
      })
      commitAtomText(
        { getItemById, getSelectorForId, dispatch },
        id,
        nextText,
        { recordHistory: true },
      )
      setEditing(false)
      clickPointRef.current = null
    },
    [dispatch, getItemById, getSelectorForId, id],
  )

  const cancel = React.useCallback(() => {
    traceInlineEdit({ phase: 'cancel', id })
    setEditing(false)
    clickPointRef.current = null
  }, [id])

  const enterEditing = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      startTextRef.current = text ?? ''
      clickPointRef.current = { x: event.clientX, y: event.clientY }
      traceInlineEdit({
        phase: 'enter',
        id,
        detail: { selectedId: selected?.props?.id },
      })
      setEditing(true)
    },
    [id, selected?.props?.id, text],
  )

  React.useEffect(() => {
    if (editing) return
    const el = idleRef.current
    if (!el) return
    return registerOverlayPortal(el, { disableDragOnFocus: true })
  }, [editing])

  if (!editing) {
    return (
      <div
        ref={idleRef}
        className={styles.root}
        data-inline-edit="idle"
        data-inline-edit-kind={kind}
        data-inline-edit-id={id}
        onDoubleClick={enterEditing}
      >
        {children}
      </div>
    )
  }

  return (
    <ActiveInlineEditor
      kind={kind}
      id={id}
      initialText={startTextRef.current}
      tag={tag}
      style={style}
      clickPoint={clickPointRef.current}
      onCommit={commit}
      onCancel={cancel}
      selectedId={selected?.props?.id as string | undefined}
    />
  )
}

function ActiveInlineEditor({
  kind,
  id,
  initialText,
  tag,
  style,
  clickPoint,
  onCommit,
  onCancel,
  selectedId,
}: {
  kind: InlineAtomKind
  id: string
  initialText: string
  tag?: HeadingTag
  style?: WidgetSemanticStyle
  clickPoint: { x: number; y: number } | null
  onCommit: (text: string) => void
  onCancel: () => void
  selectedId?: string
}) {
  const draftRef = React.useRef(initialText)
  const committedRef = React.useRef(false)
  const sessionRef = React.useRef<HTMLDivElement | null>(null)
  const [surfaceEl, setSurfaceEl] = React.useState<HTMLDivElement | null>(null)
  const mountGenRef = React.useRef(0)
  const multiline = allowsMultilineEnter(kind, tag)
  const [linkDraft, setLinkDraft] = React.useState<LinkEditorDraft | null>(null)
  const linkOpen = Boolean(linkDraft)
  const linkOpenRef = React.useRef(linkOpen)
  linkOpenRef.current = linkOpen
  const cancelLinkRef = React.useRef<() => void>(() => {})

  const serialize = React.useCallback(
    (html: string) => serializeInlineFromEditor(html),
    [],
  )

  const finishCommit = React.useCallback(
    (reason: string, opts?: { ignoreLinkGuard?: boolean }) => {
      if (committedRef.current) return
      // Link panel blocks outside-commit; widget switch may discard link then commit text.
      if (linkOpen && !opts?.ignoreLinkGuard) return
      committedRef.current = true
      traceInlineEdit({
        phase: 'finishCommit',
        id,
        detail: { reason, selectedId, linkOpen },
      })
      onCommit(draftRef.current)
    },
    [id, linkOpen, onCommit, selectedId],
  )

  const finishCancel = React.useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    setLinkDraft(null)
    onCancel()
  }, [onCancel])

  const editor = useEditor({
    extensions: inlineContentExtensions({ multiline }),
    content: textEditorContent(initialText),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap zyvavu-inline-tiptap',
        'data-inline-edit': 'active',
        'data-inline-edit-kind': kind,
        'data-inline-edit-tag': tag || (kind === 'Text' ? 'p' : 'h2'),
      },
      handleDOMEvents: {
        keydown: (_view, event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.stopPropagation()
            return false
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            if (linkOpenRef.current) {
              // Match Cancel button: discard draft + refocus editor (no mark mutation).
              cancelLinkRef.current()
              return true
            }
            finishCancel()
            return true
          }
          if (!multiline && event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            finishCommit('enter-key')
            return true
          }
          return false
        },
      },
    },
    onUpdate: ({ editor: current }) => {
      draftRef.current = serialize(current.getHTML())
    },
  })

  React.useEffect(() => {
    if (!editor) return
    draftRef.current = serialize(editor.getHTML())
  }, [editor, serialize])

  React.useEffect(() => {
    if (!editor) return
    let raf = 0
    raf = requestAnimationFrame(() => {
      if (editor.isDestroyed) return
      editor.commands.focus('end')
      if (!clickPoint) return
      try {
        const pos = editor.view.posAtCoords({ left: clickPoint.x, top: clickPoint.y })
        if (pos) editor.commands.setTextSelection(pos.pos)
      } catch {
        // keep end focus
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [editor, clickPoint])

  // Portal PE restore + stop Puck drag on the session. Also stop *click* bubble so
  // parent Section DraggableComponent does not reselect and unmount this editor.
  React.useEffect(() => {
    const session = sessionRef.current
    if (!session) return
    const cleanupPortal = registerOverlayPortal(session, { disableDrag: true })
    const stopClick = (event: Event) => {
      event.stopPropagation()
    }
    session.addEventListener('click', stopClick, true)
    return () => {
      cleanupPortal?.()
      session.removeEventListener('click', stopClick, true)
    }
  }, [editor])

  React.useEffect(() => {
    traceInlineEdit({
      phase: 'active-mount',
      id,
      detail: {
        selectedId,
        hasEditor: Boolean(editor),
        sessionRect: sessionRef.current?.getBoundingClientRect().toJSON?.() ?? null,
        puckHostId: sessionRef.current
          ?.closest('[data-puck-component]')
          ?.getAttribute('data-puck-component'),
      },
    })
    return () => {
      traceInlineEdit({ phase: 'active-unmount', id, detail: { selectedId } })
    }
  }, [editor, id, selectedId])

  // Outside = outside the Puck Heading host (not merely outside ProseMirror/session box).
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (linkOpen) return
      const session = sessionRef.current
      if (!session) return
      const puckHost =
        (session.closest(`[data-puck-component="${CSS.escape(id)}"]`) as HTMLElement | null) ||
        (session.closest('[data-puck-component]') as HTMLElement | null)
      const target = event.target
      const classified = classifyPointerTarget(target, session)

      traceInlineEdit({
        phase: 'pointerdown',
        id,
        detail: {
          ...classified,
          path: pathSummary(event),
          selectedIdBefore: selectedId,
        },
      })

      if (target instanceof Node && puckHost?.contains(target)) {
        // Keep editing; native ProseMirror handles caret when hit lands in .ProseMirror.
        return
      }
      if (
        target instanceof Element &&
        (target.closest('[data-inline-edit-toolbar]') ||
          target.closest('[data-inline-link-modal]'))
      ) {
        return
      }
      finishCommit('pointerdown-outside-heading-host')
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [finishCommit, id, linkOpen, selectedId])

  // Commit on real selection change to a non-ancestor component.
  // Ignore Section (ancestor) reselection caused by bubbled clicks.
  // Link draft is discarded (never silently applied) before session commit.
  React.useEffect(() => {
    if (!selectedId || selectedId === id) return
    const session = sessionRef.current
    const host = session?.closest('[data-puck-component]') as HTMLElement | null
    const doc = host?.ownerDocument || document
    const selectedEl = doc.querySelector(
      `[data-puck-component="${CSS.escape(selectedId)}"]`,
    ) as HTMLElement | null
    const selectedIsAncestor = Boolean(selectedEl && host && selectedEl.contains(host))
    traceInlineEdit({
      phase: 'selection-change',
      id,
      detail: { selectedId, selectedIsAncestor, linkOpen },
    })
    if (selectedIsAncestor) return
    // Explicit policy: discard uncommitted Link draft; commit text session once.
    if (linkOpen) setLinkDraft(null)
    finishCommit('selectedItem-changed', { ignoreLinkGuard: true })
  }, [finishCommit, id, linkOpen, selectedId])

  React.useEffect(() => {
    const gen = ++mountGenRef.current
    return () => {
      queueMicrotask(() => {
        if (mountGenRef.current !== gen || committedRef.current) return
        committedRef.current = true
        traceInlineEdit({ phase: 'unmount-commit', id })
        onCommit(draftRef.current)
      })
    }
  }, [id, onCommit])

  const openLinkModal = React.useCallback((current: Editor) => {
    const { from, to } = current.state.selection
    const attrs = current.getAttributes('link') as {
      href?: string
      target?: string
      rel?: string
    }
    // Freeze the range on the draft and keep the editor selection visible.
    current.commands.setTextSelection({ from, to })
    setLinkDraft(
      createLinkDraftFromMark(
        { from, to },
        { href: attrs.href, target: attrs.target, rel: attrs.rel },
      ),
    )
  }, [])

  const applyLink = React.useCallback(
    (draft: LinkEditorDraft) => {
      if (!editor || editor.isDestroyed) return
      const resolved = resolveLinkMarkFromDraft(draft)
      if (!resolved) return
      const chain = editor
        .chain()
        .focus()
        .setTextSelection({ from: draft.from, to: draft.to })
        .extendMarkRange('link')
      if (resolved.unset) {
        chain.unsetLink().run()
      } else {
        chain
          .setLink({
            href: resolved.href || '',
            target: resolved.target,
            rel: resolved.rel,
          })
          .run()
      }
      draftRef.current = serialize(editor.getHTML())
      setLinkDraft(null)
    },
    [editor, serialize],
  )

  const cancelLink = React.useCallback(() => {
    // Cancel restores prior mark state by never mutating the editor draft.
    setLinkDraft(null)
    if (editor && !editor.isDestroyed) {
      editor.commands.focus()
    }
  }, [editor])
  cancelLinkRef.current = cancelLink

  const onToolbarMetrics = React.useCallback(
    (next: { mounted: boolean; rect: DOMRect | null }) => {
      const rect = next.rect
        ? {
            top: Math.round(next.rect.top),
            left: Math.round(next.rect.left),
            width: Math.round(next.rect.width),
            height: Math.round(next.rect.height),
          }
        : null
      traceInlineEdit({
        phase: 'toolbar-metrics',
        id,
        detail: { mounted: next.mounted, rect },
      })
    },
    [id],
  )

  const resolved = resolveWidgetStyles(style)

  const node = (
    <div
      ref={sessionRef}
      className={styles.session}
      data-inline-edit-session={id}
      style={resolved}
      {...animationAttributes(style?.animation)}
    >
      {editor ? (
        <InlineFormatToolbar
          editor={editor}
          anchorEl={surfaceEl}
          onOpenLink={openLinkModal}
          onMetrics={onToolbarMetrics}
        />
      ) : null}
      <div ref={setSurfaceEl} className={styles.surface} data-widget-id={id}>
        <EditorContent editor={editor} />
      </div>
      <InlineLinkEditor
        opened={linkOpen}
        draft={linkDraft}
        onChange={setLinkDraft}
        onApply={applyLink}
        onCancel={cancelLink}
      />
    </div>
  )

  return withWidgetStyleSurface(node, style, id)
}
