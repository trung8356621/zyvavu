'use client'

import React from 'react'
import { ActionIcon, Portal, Tooltip } from '@mantine/core'
import { Bold, Italic, Link2, Underline as UnderlineIcon } from 'lucide-react'
import { registerOverlayPortal } from '@puckeditor/core'
import type { Editor } from '@tiptap/react'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { computeToolbarPosition } from './edit-boundary'
import styles from './InlineContentEditor.module.css'

/**
 * Fixed-position formatting chrome portaled to document.body so ancestor
 * overflow cannot clip it. Flip above/below the editor bounds.
 */
export function InlineFormatToolbar({
  editor,
  anchorEl,
  onOpenLink,
}: {
  editor: Editor
  anchorEl: HTMLElement | null
  onOpenLink: (editor: Editor) => void
}) {
  const toolbarRef = React.useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = React.useState<{ top: number; left: number; placement: 'above' | 'below' }>({
    top: 0,
    left: 0,
    placement: 'above',
  })

  const updatePosition = React.useCallback(() => {
    const toolbar = toolbarRef.current
    const anchor = anchorEl
    if (!toolbar || !anchor) return
    const anchorRect = anchor.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    const next = computeToolbarPosition(
      anchorRect,
      { width: toolbarRect.width || 140, height: toolbarRect.height || 32 },
      { width: window.innerWidth, height: window.innerHeight },
    )
    setPos(next)
  }, [anchorEl])

  React.useLayoutEffect(() => {
    updatePosition()
  }, [updatePosition, editor.state.selection.from, editor.state.selection.to])

  React.useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition])

  React.useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    return registerOverlayPortal(el, { disableDrag: true })
  }, [])

  return (
    <Portal>
      <div
        ref={toolbarRef}
        className={styles.toolbar}
        data-inline-edit-toolbar="true"
        data-placement={pos.placement}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: ADMIN_OVERLAY_LAYERS.TOOLBAR + 5,
        }}
      >
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onAction={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onAction={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onAction={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          onAction={() => onOpenLink(editor)}
        >
          <Link2 size={14} />
        </ToolbarButton>
      </div>
    </Portal>
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
    <Tooltip label={label} withArrow openDelay={400}>
      <ActionIcon
        size="sm"
        variant={active ? 'light' : 'subtle'}
        aria-label={label}
        aria-pressed={active}
        onMouseDown={(event) => {
          event.preventDefault()
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
