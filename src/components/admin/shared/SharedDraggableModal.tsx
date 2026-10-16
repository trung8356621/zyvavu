'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ActionIcon, Box, Group, Paper, Portal, Text } from '@mantine/core'
import { GripHorizontal, X } from 'lucide-react'

export type ModalPresentationMode = 'floating' | 'dialog'

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
  closeOnEscape?: boolean
  zIndex?: number
  className?: string
  style?: React.CSSProperties
  headerExtra?: React.ReactNode
}

/**
 * Calculates initial viewport-clamped coordinate next to the anchor element.
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

  // Primary position: right side of anchor
  let x = rect.right + padding
  let y = rect.top

  // If overflowing right viewport boundary, try placing to the left of anchor
  if (x + width > window.innerWidth - padding) {
    const leftCandidate = rect.left - width - padding
    if (leftCandidate >= padding) {
      x = leftCandidate
    } else {
      x = Math.max(padding, window.innerWidth - width - padding)
    }
  }

  // Vertical boundary clamping: keep header and modal within visible screen
  if (y + height > window.innerHeight - padding) {
    y = Math.max(padding, window.innerHeight - height - padding)
  }
  y = Math.max(padding, y)

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
  closeOnEscape = true,
  zIndex = 1000,
  className,
  style,
  headerExtra,
}: SharedDraggableModalProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => initialPosition || { x: 340, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const hasBeenDraggedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; modalX: number; modalY: number }>({
    pointerX: 0,
    pointerY: 0,
    modalX: 0,
    modalY: 0,
  })
  const modalRef = useRef<HTMLDivElement | null>(null)

  const numericWidth = typeof width === 'number' ? width : parseInt(String(width), 10) || 300

  // Position calculation and reset when opened
  const resetToAnchorPosition = useCallback(() => {
    hasBeenDraggedRef.current = false
    if (initialPosition) {
      setPosition(initialPosition)
    } else {
      const estimatedHeight = modalRef.current?.getBoundingClientRect().height || 360
      const pos = computeAnchorPosition(anchorEl || null, numericWidth, estimatedHeight)
      setPosition(pos)
    }
  }, [anchorEl, initialPosition, numericWidth])

  useEffect(() => {
    if (opened) {
      resetToAnchorPosition()
    }
  }, [opened, resetToAnchorPosition])

  // Recalculate precisely once modal DOM is mounted on initial open (if not manually dragged)
  useEffect(() => {
    if (opened && !hasBeenDraggedRef.current && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      if (!initialPosition) {
        const pos = computeAnchorPosition(anchorEl || null, rect.width, rect.height)
        setPosition(pos)
      }
    }
  }, [opened, anchorEl, initialPosition])

  // Header Drag Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return

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
      const maxY = Math.max(minY, window.innerHeight - 50)

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

      onClose()
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [opened, closeOnClickOutside, anchorEl, onClose])

  if (!opened) return null

  return (
    <Portal>
      {/* Optional backdrop for dialog mode */}
      {withBackdrop && (
        <Box
          onClick={closeOnClickOutside ? onClose : undefined}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(1.5px)',
            zIndex: zIndex - 1,
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Draggable Style Modal Card */}
      <Paper
        ref={modalRef}
        withBorder
        radius="sm"
        shadow="xl"
        className={className}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex,
          backgroundColor: 'var(--mantine-color-body, #ffffff)',
          borderColor: 'var(--mantine-color-default-border, #e5e7eb)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'box-shadow 0.15s ease',
          pointerEvents: 'auto',
          ...style,
        }}
        role="dialog"
        aria-modal={withBackdrop}
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
            cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          <Group gap={6} style={{ minWidth: 0, flex: 1 }}>
            {draggable && (
              <GripHorizontal
                size={14}
                color="var(--mantine-color-dimmed, #868e96)"
                style={{ flexShrink: 0 }}
              />
            )}
            <Box style={{ minWidth: 0, flex: 1 }}>
              {typeof title === 'string' ? (
                <Text size="xs" fw={700} truncate>
                  {title}
                </Text>
              ) : (
                title
              )}
              {subtitle && (
                <Text size="xs" c="dimmed" truncate style={{ fontSize: 10 }}>
                  {subtitle}
                </Text>
              )}
            </Box>
          </Group>

          <Group gap={4} style={{ flexShrink: 0 }} data-no-drag>
            {headerExtra}
            {showCloseButton && (
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                aria-label="Close modal"
              >
                <X size={13} />
              </ActionIcon>
            )}
          </Group>
        </Box>

        {/* Modal Scrollable Body */}
        <Box
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
    </Portal>
  )
}
