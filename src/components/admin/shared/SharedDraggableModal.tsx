'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ActionIcon, Box, Group, OptionalPortal, Paper, Text } from '@mantine/core'
import { GripHorizontal, X } from 'lucide-react'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'

export type ModalPresentationMode = 'floating' | 'dialog' | 'docked'

export interface SharedDraggableModalProps {
  opened: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  width?: number | string
  initialPosition?: { x: number; y: number }
  anchorEl?: HTMLElement | null
  draggable?: boolean
  showCloseButton?: boolean
  footer?: React.ReactNode
  mode?: ModalPresentationMode
  withBackdrop?: boolean
  closeOnClickOutside?: boolean
  /** When set, outside click uses this instead of onClose (e.g. keep vs cancel). */
  onClickOutside?: () => void
  closeOnEscape?: boolean
  zIndex?: number
  className?: string
  style?: React.CSSProperties
  withinPortal?: boolean
  headerExtra?: React.ReactNode
  subHeader?: React.ReactNode
  /** Optional test / host identity hook (e.g. unified Style modal). */
  'data-testid'?: string
}

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function clampModalPosition(
  position: { x: number; y: number },
  viewport: { width: number; height: number },
  size: { width: number; height: number },
) {
  const padding = 12
  return {
    x: Math.max(
      padding,
      Math.min(
        position.x,
        viewport.width - Math.min(size.width, viewport.width - padding * 2) - padding,
      ),
    ),
    y: Math.max(
      padding,
      Math.min(
        position.y,
        viewport.height - Math.min(size.height, viewport.height - padding * 2) - padding,
      ),
    ),
  }
}

/**
 * Calculates initial viewport-clamped coordinate next to the anchor element.
 * Prefer the side with room; when the anchor sits in the right half (Style sidebar),
 * place the floating picker to the left so it stays beside the control.
 */
export function computeAnchorPosition(
  anchor: HTMLElement | null,
  width: number,
  height = 360,
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 340, y: 80 }

  const padding = 12

  if (!anchor) {
    // Default fallback position right next to standard 320px admin sidebar
    const defaultX = Math.min(336, Math.max(padding, window.innerWidth - width - padding))
    const defaultY = Math.min(80, Math.max(padding, window.innerHeight - height - padding))
    return { x: Math.max(padding, defaultX), y: Math.max(padding, defaultY) }
  }

  const rect = anchor.getBoundingClientRect()
  const leftCandidate = rect.left - width - padding
  const rightCandidate = rect.right + padding
  const preferLeft =
    rect.left > window.innerWidth * 0.45 || rightCandidate + width > window.innerWidth - padding

  let x: number
  if (preferLeft && leftCandidate >= padding) {
    x = leftCandidate
  } else if (rightCandidate + width <= window.innerWidth - padding) {
    x = rightCandidate
  } else if (leftCandidate >= padding) {
    x = leftCandidate
  } else {
    x = Math.max(padding, window.innerWidth - width - padding)
  }

  let y = rect.top
  if (y + height > window.innerHeight - padding) {
    y = Math.max(padding, window.innerHeight - height - padding)
  }
  y = Math.max(padding, Math.min(y, window.innerHeight - padding))

  return { x, y }
}

/**
 * SharedDraggableModal
 *
 * Reusable draggable floating style modal foundation for Zyvavu Admin & visual styling tools.
 * Supports:
 * - Floating Style Panel mode (no backdrop, interactive website preview)
 * - Dialog mode (optional backdrop, modal accessibility)
 * - Header-only drag handle with viewport boundary clamping
 * - Anchor snapping on open that resets after closing
 * - Independent of Payload, Theme Engine, and domain business logic
 */
export function SharedDraggableModal({
  opened,
  onClose,
  title,
  subtitle,
  children,
  width = 300,
  initialPosition,
  anchorEl,
  draggable = true,
  showCloseButton = true,
  footer,
  mode = 'floating',
  withBackdrop = mode === 'dialog',
  closeOnClickOutside = mode === 'dialog',
  onClickOutside,
  closeOnEscape = true,
  zIndex = ADMIN_OVERLAY_LAYERS.STYLE_MODAL,
  className,
  style,
  withinPortal = true,
  headerExtra,
  subHeader,
  'data-testid': dataTestId,
}: SharedDraggableModalProps) {
  const isDocked = mode === 'docked'
  const isDialog = mode === 'dialog'
  const effectiveDraggable = isDocked || isDialog ? false : draggable
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))
  const [position, setPosition] = useState<{ x: number; y: number }>(
    () => initialPosition || { x: 340, y: 80 },
  )
  const [isDragging, setIsDragging] = useState(false)
  const hasBeenDraggedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{
    pointerX: number
    pointerY: number
    modalX: number
    modalY: number
  }>({
    pointerX: 0,
    pointerY: 0,
    modalX: 0,
    modalY: 0,
  })
  const modalRef = useRef<HTMLDivElement | null>(null)

  const numericWidth = typeof width === 'number' ? width : parseInt(String(width), 10) || 300

  useEffect(() => {
    if (!opened) return
    const resize = () => {
      const next = {
        width: window.innerWidth,
        height: Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight),
      }
      setViewport(next)
      if (isDialog || isDocked) return
      const rect = modalRef.current?.getBoundingClientRect()
      if (rect) setPosition((previous) => clampModalPosition(previous, next, rect))
    }
    resize()
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
    }
  }, [opened, isDialog, isDocked])

  // Position calculation and reset when opened (floating tools only)
  const resetToAnchorPosition = useCallback(() => {
    if (isDialog || isDocked) return
    hasBeenDraggedRef.current = false
    if (initialPosition) {
      setPosition(
        clampModalPosition(
          initialPosition,
          { width: window.innerWidth, height: window.innerHeight },
          { width: numericWidth, height: modalRef.current?.getBoundingClientRect().height || 360 },
        ),
      )
    } else {
      const estimatedHeight = modalRef.current?.getBoundingClientRect().height || 360
      const pos = computeAnchorPosition(anchorEl || null, numericWidth, estimatedHeight)
      setPosition(pos)
    }
  }, [anchorEl, initialPosition, numericWidth, isDialog, isDocked])

  useEffect(() => {
    if (opened) {
      resetToAnchorPosition()
    }
  }, [opened, resetToAnchorPosition])

  // Recalculate precisely once modal DOM is mounted on initial open (if not manually dragged)
  useEffect(() => {
    if (isDialog || isDocked) return
    if (opened && !hasBeenDraggedRef.current && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      if (!initialPosition) {
        const pos = computeAnchorPosition(anchorEl || null, rect.width, rect.height)
        setPosition(pos)
      }
    }
  }, [opened, anchorEl, initialPosition, isDialog, isDocked])

  // Header Drag Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!effectiveDraggable) return

    // Never initiate dragging from buttons, inputs or explicitly marked interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[data-no-drag]')
    ) {
      return
    }

    // Only respond to primary mouse / touch button
    if (e.button !== 0) return

    e.preventDefault()

    // Dismiss any active dropdown/popover before dragging starts
    if (
      typeof document !== 'undefined' &&
      document.activeElement &&
      'blur' in document.activeElement
    ) {
      ;(document.activeElement as HTMLElement).blur()
    }

    isDraggingRef.current = true
    setIsDragging(true)
    hasBeenDraggedRef.current = true

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      modalX: position.x,
      modalY: position.y,
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return

      const deltaX = moveEvent.clientX - dragStartRef.current.pointerX
      const deltaY = moveEvent.clientY - dragStartRef.current.pointerY

      const modalRect = modalRef.current?.getBoundingClientRect()
      const modalW = modalRect?.width || numericWidth
      const modalH = modalRect?.height || 250

      const minX = 12
      const maxX = Math.max(minX, window.innerWidth - modalW - 12)
      const minY = 12
      const maxY = Math.max(
        minY,
        Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight) -
          modalH -
          12,
      )

      const rawX = dragStartRef.current.modalX + deltaX
      const rawY = dragStartRef.current.modalY + deltaY

      const clampedX = Math.min(Math.max(minX, rawX), maxX)
      const clampedY = Math.min(Math.max(minY, rawY), maxY)

      setPosition({ x: clampedX, y: clampedY })
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // Dialog traps focus; floating/docked focus first control without trapping the canvas.
  useEffect(() => {
    if (!opened) return
    const previous = anchorEl || (document.activeElement as HTMLElement | null)
    const frame = requestAnimationFrame(() => {
      const control = modalRef.current?.querySelector<HTMLElement>(
        '[data-modal-region="content"] input, [data-modal-region="content"] button, button',
      )
      control?.focus({ preventScroll: true })
    })

    const handleTabTrap = (event: KeyboardEvent) => {
      if (!isDialog || event.key !== 'Tab' || !modalRef.current) return
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    if (isDialog) window.addEventListener('keydown', handleTabTrap)
    return () => {
      cancelAnimationFrame(frame)
      if (isDialog) window.removeEventListener('keydown', handleTabTrap)
      // Style dialog: do not steal canvas selection by restoring ActionBar focus.
      if (!isDialog && previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [opened, anchorEl, isDialog])

  // Escape key handler
  useEffect(() => {
    if (!opened || !closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [opened, closeOnEscape, onClose])

  // Click outside handler (when enabled)
  useEffect(() => {
    if (!opened || !closeOnClickOutside) return

    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      if (modalRef.current?.contains(target)) return
      if (anchorEl?.contains(target)) return

      // Ignore clicks within Mantine portal dropdowns / popovers
      if (
        target.closest('.mantine-Combobox-dropdown') ||
        target.closest('.mantine-Popover-dropdown') ||
        target.closest('.mantine-Select-dropdown') ||
        target.closest('.mantine-Modal-root') ||
        target.closest('[data-portal]')
      ) {
        return
      }

      ;(onClickOutside || onClose)()
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [opened, closeOnClickOutside, anchorEl, onClose, onClickOutside])

  if (!opened) return null

  const paperStyle: React.CSSProperties = isDocked
    ? {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width,
        maxWidth: 'min(100vw, 420px)',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        zIndex,
        backgroundColor: 'var(--mantine-color-body, #ffffff)',
        borderColor: 'var(--mantine-color-default-border, #e5e7eb)',
        borderLeft: '1px solid var(--mantine-color-default-border, #e5e7eb)',
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...style,
      }
    : isDialog
      ? {
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width,
          maxWidth: 'min(920px, calc(100vw - 32px))',
          height: 'auto',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          zIndex,
          backgroundColor: 'var(--mantine-color-body, #ffffff)',
          borderColor: 'var(--mantine-color-default-border, #e5e7eb)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          pointerEvents: 'auto',
          ...style,
        }
      : {
          position: 'fixed',
          left: position.x,
          top: position.y,
          width,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: Math.max(0, viewport.height - position.y - 12),
          display: 'flex',
          flexDirection: 'column',
          zIndex,
          backgroundColor: 'var(--mantine-color-body, #ffffff)',
          borderColor: 'var(--mantine-color-default-border, #e5e7eb)',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'box-shadow 0.15s ease',
          pointerEvents: 'auto',
          ...style,
        }

  return (
    <OptionalPortal withinPortal={withinPortal}>
      {/* Optional backdrop for dialog mode */}
      {withBackdrop && (
        <Box
          data-modal-backdrop={mode}
          onClick={
            closeOnClickOutside
              ? () => {
                  ;(onClickOutside || onClose)()
                }
              : undefined
          }
          style={{
            position: 'fixed',
            inset: 0,
            // Keep canvas selection readable behind Style dialog (no heavy blur).
            backgroundColor: isDialog ? 'rgba(15, 23, 32, 0.28)' : 'rgba(0, 0, 0, 0.45)',
            backdropFilter: isDialog ? 'none' : 'blur(1.5px)',
            zIndex: zIndex - 1,
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Style panel: centered dialog, floating card, or fixed right dock (Link) */}
      <Paper
        ref={modalRef}
        withBorder
        radius={isDocked ? 0 : 'md'}
        shadow={isDocked ? 'xs' : 'md'}
        className={className}
        data-testid={dataTestId}
        data-modal-mode={mode}
        style={paperStyle}
        role="dialog"
        aria-modal={withBackdrop || isDialog}
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {/* Header with Grip & Drag Support */}
        <Box
          onPointerDown={handlePointerDown}
          px="xs"
          py={7}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--mantine-color-default-border, #e5e7eb)',
            backgroundColor: 'var(--mantine-color-gray-0, #f8f9fa)',
            cursor: effectiveDraggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          <Group gap={6} style={{ minWidth: 0, flex: 1 }}>
            {effectiveDraggable && (
              <GripHorizontal
                size={16}
                color="var(--mantine-color-dimmed, #868e96)"
                style={{ flexShrink: 0 }}
              />
            )}
            <Box style={{ minWidth: 0, flex: 1 }}>
              {typeof title === 'string' ? (
                <Text size="sm" fw={700} truncate style={{ fontSize: 13 }}>
                  {title}
                </Text>
              ) : (
                title
              )}
              {subtitle && (
                <Text
                  size="xs"
                  c="dimmed"
                  truncate
                  style={{ fontSize: 12, color: 'var(--mantine-color-dimmed, #556068)' }}
                >
                  {subtitle}
                </Text>
              )}
            </Box>
          </Group>

          <Group gap={6} style={{ flexShrink: 0 }} data-no-drag>
            {headerExtra}
            {showCloseButton && (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                aria-label="Close modal"
              >
                <X size={15} />
              </ActionIcon>
            )}
          </Group>
        </Box>

        {subHeader && (
          <Box
            p="xs"
            data-modal-region="navigation"
            style={{ flexShrink: 0, borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            {subHeader}
          </Box>
        )}

        {/* Modal Scrollable Body */}
        <Box
          data-modal-region="content"
          p="xs"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {children}
        </Box>

        {/* Optional Modal Footer */}
        {footer && (
          <Box
            p="xs"
            style={{
              borderTop: '1px solid var(--mantine-color-default-border, #e5e7eb)',
              backgroundColor: 'var(--mantine-color-gray-0, #f8f9fa)',
              flexShrink: 0,
            }}
          >
            {footer}
          </Box>
        )}
      </Paper>
    </OptionalPortal>
  )
}
