'use client'

import React, { useState } from 'react'
import {
  ActionIcon,
  Box,
  Group,
  Text,
  Tooltip,
} from '@mantine/core'

import {
  DROPDOWN_EFFECTS,
  type DropdownEffectId,
  type ItemDropdownEffectId,
  resolveDropdownEffect,
} from './dropdownEffects'

export type DropdownEffectPickerProps = {
  value?: ItemDropdownEffectId
  onChange: (value: ItemDropdownEffectId) => void
  allowInherit?: boolean
  menuDefault?: DropdownEffectId
  disabled?: boolean
  label?: React.ReactNode
}

/**
 * Compact Icon-Only Dropdown Effect Picker (V4.3)
 * - Single horizontal row of compact action buttons.
 * - Red asymmetric angular polygon (lightning silhouette) in each button.
 * - Replays 900ms preview animation on hover / focus ON THE SHAPE ONLY.
 * - Clean initial-state replay on every new hover.
 * - Production frontend timing remains unchanged in registry (200-250ms).
 * - Names shown strictly in tooltip and aria-label.
 */
export function DropdownEffectPicker({
  value = 'inherit',
  onChange,
  allowInherit = false,
  menuDefault = 'fade',
  disabled = false,
  label,
}: DropdownEffectPickerProps) {
  const [hoverTicks, setHoverTicks] = useState<Record<string, number>>({})

  const resolvedDefault = resolveDropdownEffect('inherit', menuDefault)

  const items: { id: ItemDropdownEffectId; label: string; animEffect: DropdownEffectId }[] = []

  if (allowInherit) {
    items.push({
      id: 'inherit',
      label: `Inherit Default (${DROPDOWN_EFFECTS[resolvedDefault]?.name || resolvedDefault})`,
      animEffect: resolvedDefault,
    })
  }

  items.push(
    {
      id: 'none',
      label: 'None (Instant)',
      animEffect: 'none',
    },
    {
      id: 'fade',
      label: 'Fade',
      animEffect: 'fade',
    },
    {
      id: 'slide-down',
      label: 'Slide Down',
      animEffect: 'slide-down',
    },
  )

  const handleMouseEnter = (itemId: string) => {
    setHoverTicks((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }))
  }

  return (
    <Box className="zyvavu-dropdown-effect-picker">
      <style jsx global>{`
        /* Shape-only hover & focus animations with 900ms admin demo speed */
        .zyvavu-effect-btn:hover .zyvavu-shape--none,
        .zyvavu-effect-btn:focus-visible .zyvavu-shape--none {
          animation: zyvavuShapeNone 40ms step-end forwards;
        }

        .zyvavu-effect-btn:hover .zyvavu-shape--fade,
        .zyvavu-effect-btn:focus-visible .zyvavu-shape--fade {
          animation: zyvavuShapeFade 900ms ease forwards;
        }

        .zyvavu-effect-btn:hover .zyvavu-shape--slide-down,
        .zyvavu-effect-btn:focus-visible .zyvavu-shape--slide-down {
          animation: zyvavuShapeSlideDown 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes zyvavuShapeNone {
          0% {
            opacity: 0.2;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes zyvavuShapeFade {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes zyvavuShapeSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zyvavu-shape-wrapper {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {label && (
        <Text size="xs" fw={600} mb={6}>
          {label}
        </Text>
      )}

      {/* Compact single row of icon-only effect buttons */}
      <Group gap={8} wrap="nowrap" align="center" style={{ height: 40 }}>
        {items.map((item) => {
          const isSelected = value === item.id
          const currentTick = hoverTicks[item.id] || 0

          return (
            <Tooltip
              key={item.id}
              label={item.label}
              position="top"
              withArrow
              openDelay={150}
            >
              <ActionIcon
                onClick={() => !disabled && onChange(item.id)}
                onMouseEnter={() => handleMouseEnter(item.id)}
                disabled={disabled}
                aria-label={item.label}
                aria-pressed={isSelected}
                className={`zyvavu-effect-btn zyvavu-effect-btn--${item.id}`}
                style={{
                  width: 44,
                  height: 38,
                  borderRadius: 'var(--style-radius-s, 6px)',
                  border: isSelected ? '2px solid #0e6b66' : '1px solid #dfe5e2',
                  backgroundColor: isSelected ? 'var(--zyvavu-accent-soft, #e6f3f1)' : '#ffffff',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? '0 1px 3px rgba(14, 107, 102, 0.15)' : 'none',
                  transition: 'border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease',
                }}
              >
                {/* Red asymmetric angular polygon silhouette (22px lightning) with per-hover remount */}
                <span
                  key={`${item.id}-${currentTick}`}
                  className={`zyvavu-shape-wrapper zyvavu-shape--${item.animEffect}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    pointerEvents: 'none',
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="#e03131"
                    stroke="#c92a2a"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ display: 'block' }}
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </span>

                {/* Subtle active indicator dot */}
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#0e6b66',
                    }}
                  />
                )}
              </ActionIcon>
            </Tooltip>
          )
        })}
      </Group>
    </Box>
  )
}
