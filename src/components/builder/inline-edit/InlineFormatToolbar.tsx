'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { ActionIcon, Tooltip } from '@mantine/core'
import { Bold, Italic, Link2, Underline as UnderlineIcon } from 'lucide-react'
import { registerOverlayPortal } from '@puckeditor/core'
import { useEditorState, type Editor } from '@tiptap/react'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { computeToolbarPosition, mapElementRectToWindow } from './edit-boundary'
import styles from './InlineContentEditor.module.css'

/**
 * Floating B/I/U/Link chrome.
 *
 * Always portaled into the builder (parent) document body and positioned with
 * parent-viewport coordinates. When the editor lives in Puck's preview iframe,
 * anchor rects are mapped through frameElement offsets — never mix iframe-local
 * client rects with parent fixed positioning.
 */
export function InlineFormatToolbar({
  editor,
  anchorEl,
  onOpenLink,
  onMetrics,
  allowLink = true,
}: {
  editor: Editor
  anchorEl: HTMLElement | null
  onOpenLink: (editor: Editor) => void
  onMetrics?: (next: { mounted: boolean; rect: DOMRect | null }) => void
  /** Button labels own the destination URL — no nested link mark. */
  allowLink?: boolean
}) {
  const toolbarRef = React.useRef<HTMLDivElement | null>(null)
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      link: editor.isActive('link'),
    }),
  })
  const [pos, setPos] = React.useState<{
    top: number
    left: number
    placement: 'above' | 'below'
    ready: boolean
  }>({
    top: 0,
    left: 0,
    placement: 'above',
    ready: false,
  })

  const updatePosition = React.useCallback(() => {
    const toolbar = toolbarRef.current
    const anchor = anchorEl
    if (!toolbar || !anchor) return

    // Portal lives in the builder window; map iframe anchors into that space.
    const portalWin = window
    const anchorRect = mapElementRectToWindow(anchor, portalWin)
    const toolbarRect = toolbar.getBoundingClientRect()
    const next = computeToolbarPosition(
      anchorRect,
      { width: toolbarRect.width || 140, height: toolbarRect.height || 32 },
      { width: portalWin.innerWidth, height: portalWin.innerHeight },
      8,
    )
    setPos((prev) =>
      prev.ready &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.placement === next.placement
        ? prev
        : { ...next, ready: true },
    )
    onMetrics?.({ mounted: true, rect: toolbar.getBoundingClientRect() })
  }, [anchorEl, onMetrics])

  const setToolbarNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      toolbarRef.current = node
      if (!node) {
        onMetrics?.({ mounted: false, rect: null })
        return
      }
      // Mantine-less portal: ref attaches on the same commit — measure immediately.
      requestAnimationFrame(() => updatePosition())
    },
    [onMetrics, updatePosition],
  )

  React.useLayoutEffect(() => {
    updatePosition()
  }, [updatePosition, editorState.from, editorState.to])

  React.useEffect(() => {
    if (!anchorEl) return
    const portalWin = window
    const anchorWin = anchorEl.ownerDocument.defaultView
    const frame = anchorWin?.frameElement ?? null

    const schedule = () => {
      requestAnimationFrame(updatePosition)
    }

    portalWin.addEventListener('resize', schedule)
    portalWin.addEventListener('scroll', schedule, true)
    anchorWin?.addEventListener('resize', schedule)
    anchorWin?.addEventListener('scroll', schedule, true)

    const ro = new ResizeObserver(schedule)
    ro.observe(anchorEl)
    if (frame instanceof Element) ro.observe(frame)

    schedule()
    return () => {
      portalWin.removeEventListener('resize', schedule)
      portalWin.removeEventListener('scroll', schedule, true)
      anchorWin?.removeEventListener('resize', schedule)
      anchorWin?.removeEventListener('scroll', schedule, true)
      ro.disconnect()
    }
  }, [anchorEl, updatePosition])

  React.useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    return registerOverlayPortal(el, { disableDrag: true })
  }, [pos.ready])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={setToolbarNode}
      className={styles.toolbar}
      data-inline-edit-toolbar="true"
      data-placement={pos.placement}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN,
        pointerEvents: 'auto',
        visibility: pos.ready ? 'visible' : 'hidden',
      }}
    >
        <ToolbarButton
          label="Bold"
          active={editorState.bold}
          onAction={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editorState.italic}
          onAction={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editorState.underline}
          onAction={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} strokeWidth={2.25} />
        </ToolbarButton>
        {allowLink ? (
          <ToolbarButton
            label="Link"
            active={editorState.link}
            onAction={() => onOpenLink(editor)}
          >
            <Link2 size={15} strokeWidth={2.25} />
          </ToolbarButton>
        ) : null}
    </div>,
    document.body,
  )
}

function ToolbarButton({
  label,
  active,
  onAction,
  children,
}: {
  label: string
  active?: boolean
  onAction: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label} withArrow openDelay={400} zIndex={ADMIN_OVERLAY_LAYERS.NOTIFICATIONS}>
      <ActionIcon
        size="md"
        variant={active ? 'light' : 'subtle'}
        color={active ? 'teal' : 'gray'}
        aria-label={label}
        aria-pressed={active}
        data-active={active ? 'true' : undefined}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onAction()
        }}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}
