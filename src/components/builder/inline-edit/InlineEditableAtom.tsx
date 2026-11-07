'use client'

import React from 'react'
import {
  createUsePuck,
  registerOverlayPortal,
} from '@puckeditor/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { commitAtomText } from './commit-atom-text'
import {
  escapeHtml,
  serializeHeadingFromEditor,
  serializeTextFromEditor,
  textEditorContent,
  type InlineAtomKind,
} from './content-model'
import { headingExtensions, textExtensions } from './extensions'
import styles from './InlineContentEditor.module.css'

const usePuck = createUsePuck()

type EditableProps = {
  kind: InlineAtomKind
  id: string
  text?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  style?: WidgetSemanticStyle
  children: React.ReactNode
}

/**
 * Double-click gated inline edit for free Heading/Text atoms.
 * Local Tiptap draft only; one Puck replace on commit; Escape cancels.
 */
export function InlineEditableAtom({ kind, id, text, tag, style, children }: EditableProps) {
  const [editing, setEditing] = React.useState(false)
  const startTextRef = React.useRef(text ?? '')
  const clickPointRef = React.useRef<{ x: number; y: number } | null>(null)
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

  if (!editing) {
    return (
      <div
        className={styles.root}
        data-inline-edit="idle"
        data-inline-edit-kind={kind}
        onDoubleClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          startTextRef.current = text ?? ''
          clickPointRef.current = { x: event.clientX, y: event.clientY }
          setEditing(true)
        }}
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
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  style?: WidgetSemanticStyle
  clickPoint: { x: number; y: number } | null
  onCommit: (text: string) => void
  onCancel: () => void
  selectedId?: string
}) {
  const draftRef = React.useRef(initialText)
  const committedRef = React.useRef(false)
  const surfaceRef = React.useRef<HTMLDivElement | null>(null)
  const mountGenRef = React.useRef(0)

  const serialize = React.useCallback(
    (html: string, plain: string) => {
      if (kind === 'Heading') return serializeHeadingFromEditor(plain)
      return serializeTextFromEditor(html)
    },
    [kind],
  )

  const finishCommit = React.useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    onCommit(draftRef.current)
  }, [onCommit])

  const finishCancel = React.useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    onCancel()
  }, [onCancel])

  const editor = useEditor({
    extensions: kind === 'Heading' ? headingExtensions() : textExtensions(),
    content:
      kind === 'Heading'
        ? `<p>${escapeHtml(initialText)}</p>`
        : textEditorContent(initialText),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap zyvavu-inline-tiptap',
        'data-inline-edit': 'active',
        'data-inline-edit-kind': kind,
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
            finishCancel()
            return true
          }
          if (kind === 'Heading' && event.key === 'Enter') {
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
      draftRef.current = serialize(current.getHTML(), current.getText({ blockSeparator: '\n' }))
    },
  })

  // Seed draft after mount.
  React.useEffect(() => {
    if (!editor) return
    draftRef.current = serialize(editor.getHTML(), editor.getText({ blockSeparator: '\n' }))
  }, [editor, serialize])

  // Caret near double-click point.
  React.useEffect(() => {
    if (!editor || !clickPoint) return
    const coords = { left: clickPoint.x, top: clickPoint.y }
    const pos = editor.view.posAtCoords(coords)
    requestAnimationFrame(() => {
      editor.commands.focus()
      if (pos) editor.commands.setTextSelection(pos.pos)
    })
  }, [editor, clickPoint])

  React.useEffect(() => {
    if (!editor) return
    editor.commands.focus()
  }, [editor])

  // Disable Puck drag while focused.
  React.useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    return registerOverlayPortal(el, { disableDragOnFocus: true })
  }, [editor])

  // Click outside → commit.
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const el = surfaceRef.current
      if (!el) return
      if (event.target instanceof Node && el.contains(event.target)) return
      finishCommit()
    }
    // Capture so we run before Puck selection handlers clear focus.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [finishCommit])

  // Selection moved away (parent flipped editing off or selected another widget).
  React.useEffect(() => {
    if (selectedId && selectedId !== id) {
      finishCommit()
    }
  }, [finishCommit, id, selectedId])

  // Unmount safety: commit draft unless cancel already ran.
  // Generation + microtask skips React Strict Mode remount false commits.
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

  const resolved = resolveWidgetStyles(style)
  const HeadingTag = tag || 'h2'
  const body = (
    <div ref={surfaceRef} className={styles.surface} data-widget-id={id}>
      <EditorContent editor={editor} />
    </div>
  )

  const node =
    kind === 'Heading' ? (
      <HeadingTag style={resolved} {...animationAttributes(style?.animation)}>
        {body}
      </HeadingTag>
    ) : (
      <div style={resolved} {...animationAttributes(style?.animation)}>
        {body}
      </div>
    )

  return withWidgetStyleSurface(node, style, id)
}
