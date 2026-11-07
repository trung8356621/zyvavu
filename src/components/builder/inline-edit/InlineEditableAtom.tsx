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
import {
  getPuckComponentRect,
  isInsideEditingChrome,
} from './edit-boundary'
import { inlineContentExtensions } from './extensions'
import { InlineFormatToolbar } from './InlineFormatToolbar'
import { InlineLinkModal, type InlineLinkDraft } from './InlineLinkModal'
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
 * Local Tiptap draft only; one Puck replace on commit; Escape cancels.
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
    setEditing(false)
    clickPointRef.current = null
  }, [])

  const enterEditing = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      startTextRef.current = text ?? ''
      clickPointRef.current = { x: event.clientX, y: event.clientY }
      setEditing(true)
    },
    [text],
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
  const suppressSelectionCommitRef = React.useRef(false)
  const multiline = allowsMultilineEnter(kind, tag)
  const [linkDraft, setLinkDraft] = React.useState<InlineLinkDraft | null>(null)
  const linkOpen = Boolean(linkDraft)

  const serialize = React.useCallback(
    (html: string) => serializeInlineFromEditor(html),
    [],
  )

  const finishCommit = React.useCallback(() => {
    if (committedRef.current || linkOpen) return
    committedRef.current = true
    onCommit(draftRef.current)
  }, [linkOpen, onCommit])

  const finishCancel = React.useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    setLinkDraft(null)
    onCancel()
  }, [onCancel])

  const placeCaretAtPoint = React.useCallback((editor: Editor, x: number, y: number) => {
    if (editor.isDestroyed) return
    editor.commands.focus()
    if (typeof document.elementFromPoint !== 'function') return
    try {
      const pos = editor.view.posAtCoords({ left: x, top: y })
      if (pos) editor.commands.setTextSelection(pos.pos)
      else editor.commands.setTextSelection(editor.state.doc.content.size)
    } catch {
      editor.commands.focus('end')
    }
  }, [])

  const editor = useEditor({
    extensions: inlineContentExtensions(),
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
            if (linkOpen) {
              setLinkDraft(null)
              return true
            }
            finishCancel()
            return true
          }
          if (!multiline && event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            finishCommit()
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
      if (clickPoint) placeCaretAtPoint(editor, clickPoint.x, clickPoint.y)
      else editor.commands.focus('end')
    })
    return () => cancelAnimationFrame(raf)
  }, [editor, clickPoint, placeCaretAtPoint])

  React.useEffect(() => {
    const el = sessionRef.current
    if (!el) return
    // Keep drag disabled for the whole session (not only after focus delay).
    return registerOverlayPortal(el, { disableDrag: true })
  }, [editor])

  /**
   * Containment uses the visible [data-puck-component] rect (selection outline).
   * Capture-phase: decide before Puck selection; if the event visually lands in our
   * outline but DOM-hit a parent, stop it and keep editing.
   */
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (linkOpen) return
      const session = sessionRef.current
      if (!session) return
      const boundary = getPuckComponentRect(session)
      const inside = isInsideEditingChrome(event.clientX, event.clientY, event.target, boundary)

      if (inside) {
        suppressSelectionCommitRef.current = true
        const target = event.target
        const el = target instanceof Element ? target : null
        const onChrome = Boolean(
          el?.closest('[data-inline-edit-toolbar]') || el?.closest('[data-inline-link-modal]'),
        )
        const inProse = Boolean(el?.closest('.ProseMirror'))
        const inSessionDom = target instanceof Node && session.contains(target)

        if (!inSessionDom && !onChrome) {
          // Blank area of the outline hit a parent — claim the event.
          event.preventDefault()
          event.stopPropagation()
          if (editor && !editor.isDestroyed) placeCaretAtPoint(editor, event.clientX, event.clientY)
        } else if (inSessionDom && !onChrome && !inProse && editor && !editor.isDestroyed) {
          // Padding / surface chrome inside our session.
          placeCaretAtPoint(editor, event.clientX, event.clientY)
        }
        return
      }

      finishCommit()
    }

    const onPointerUp = () => {
      window.setTimeout(() => {
        suppressSelectionCommitRef.current = false
      }, 0)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
    }
  }, [editor, finishCommit, linkOpen, placeCaretAtPoint])

  React.useEffect(() => {
    if (suppressSelectionCommitRef.current) return
    if (selectedId && selectedId !== id) finishCommit()
  }, [finishCommit, id, selectedId])

  React.useEffect(() => {
    const gen = ++mountGenRef.current
    return () => {
      queueMicrotask(() => {
        if (mountGenRef.current !== gen || committedRef.current) return
        committedRef.current = true
        onCommit(draftRef.current)
      })
    }
  }, [onCommit])

  const openLinkModal = React.useCallback((current: Editor) => {
    const { from, to } = current.state.selection
    const existing = current.getAttributes('link').href as string | undefined
    setLinkDraft({
      href: existing || '',
      newTab: current.getAttributes('link').target === '_blank',
      from,
      to,
    })
  }, [])

  const applyLink = React.useCallback(
    (draft: InlineLinkDraft) => {
      if (!editor || editor.isDestroyed) return
      editor
        .chain()
        .focus()
        .setTextSelection({ from: draft.from, to: draft.to })
        .extendMarkRange('link')
        .setLink({
          href: draft.href,
          target: draft.newTab ? '_blank' : null,
        })
        .run()
      draftRef.current = serialize(editor.getHTML())
      setLinkDraft(null)
    },
    [editor, serialize],
  )

  const resolved = resolveWidgetStyles(style)
  const Tag = (tag || (kind === 'Text' ? 'p' : 'h2')) as HeadingTag
  const SemanticTag = Tag as keyof React.JSX.IntrinsicElements

  const node = (
    <div ref={sessionRef} className={styles.session} data-inline-edit-session={id}>
      {editor ? (
        <InlineFormatToolbar editor={editor} anchorEl={surfaceEl} onOpenLink={openLinkModal} />
      ) : null}
      <SemanticTag
        className={styles.semantic}
        style={resolved}
        {...animationAttributes(style?.animation)}
      >
        <div
          ref={setSurfaceEl}
          className={styles.surface}
          data-widget-id={id}
        >
          <EditorContent editor={editor} />
        </div>
      </SemanticTag>
      <InlineLinkModal
        opened={linkOpen}
        draft={linkDraft}
        onChange={setLinkDraft}
        onApply={applyLink}
        onClose={() => setLinkDraft(null)}
      />
    </div>
  )

  return withWidgetStyleSurface(node, style, id)
}
