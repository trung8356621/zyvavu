'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { Check, Palette } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme-engine/types'
import { parseColorToRgb, getRelativeLuminance } from '@/lib/theme-engine/presets'
import { SharedDraggableModal } from './SharedDraggableModal'

export interface PaletteSwatchItem {
  id: string
  label: string
  color: string
}

export interface ThemeColorPaletteModalProps {
  opened: boolean
  onClose: () => void
  value: string
  tokens?: ThemeTokens
  colors?: Record<string, string>
  title?: string
  subtitle?: string
  anchorEl?: HTMLElement | null
  zIndex?: number
  onChange?: (colorHex: string) => void
  onApply?: (colorHex: string) => void
  onCancel?: () => void
}

/**
 * Helper to build the 9 standard palette swatches from ThemeTokens or raw colors map.
 */
export function getThemePaletteSwatches(
  tokens?: ThemeTokens,
  colors?: Record<string, string>,
): PaletteSwatchItem[] {
  const c = tokens?.colors || colors || {}
  return [
    { id: 'text', label: 'Main Text', color: c.text || '#17201f' },
    { id: 'primary', label: 'Primary Brand', color: c.primary || '#0e6b66' },
    { id: 'accent', label: 'Accent Highlight', color: c.accent || c.primary || '#2ec4b6' },
    { id: 'primaryHover', label: 'Primary Hover', color: c.primaryHover || c.primary || '#0b5652' },
    { id: 'shadowSoft', label: 'Shadow Soft', color: c.shadowSoft || '#e6eceb' },
    { id: 'shadowMedium', label: 'Shadow Medium', color: c.shadowMedium || '#bfd0cd' },
    { id: 'shadowStrong', label: 'Shadow Strong', color: c.shadowStrong || '#7a9692' },
    { id: 'white', label: 'White', color: '#FFFFFF' },
    { id: 'black', label: 'Black', color: '#000000' },
  ]
}

/**
 * Reusable Theme Color Palette Modal
 *
 * Independent of Theme Customizer, reusable across typography editing and future visual builders.
 * Built on SharedDraggableModal with:
 * - Floating panel presentation (no dark backdrop)
 * - Draggable header with viewport clamping
 * - Viewport-aware positioning next to triggering element
 * - Selected color display
 * - Immediate live React draft update
 * - Cancel restores previous selection, Apply retains selection
 */
export function ThemeColorPaletteModal({
  opened,
  onClose,
  value,
  tokens,
  colors,
  title = 'Theme Color Palette',
  subtitle = 'Choose a coordinated theme color',
  anchorEl,
  zIndex = 1100, // Floats above underlying Typography Modal (1000)
  onChange,
  onApply,
  onCancel,
}: ThemeColorPaletteModalProps) {
  // Snapshot initial color on open so Cancel can restore exact original
  const initialColorRef = useRef<string>(value || '#17201f')
  const [selectedColor, setSelectedColor] = useState<string>(value || '#17201f')

  const swatches = useMemo(() => getThemePaletteSwatches(tokens, colors), [tokens, colors])

  useEffect(() => {
    if (opened) {
      initialColorRef.current = value || '#17201f'
      setSelectedColor(value || '#17201f')
    }
  }, [opened, value])

  const normalizedSelected = (selectedColor || '').toLowerCase().trim()

  // Match current color to known swatch label
  const activeSwatch = useMemo(() => {
    return swatches.find((s) => s.color.toLowerCase().trim() === normalizedSelected)
  }, [swatches, normalizedSelected])

  const handleSelectColor = (hex: string) => {
    setSelectedColor(hex)
    onChange?.(hex)
  }

  const handleCancelClick = () => {
    const original = initialColorRef.current
    setSelectedColor(original)
    onChange?.(original)
    onCancel?.()
    onClose()
  }

  const handleApplyClick = () => {
    onApply?.(selectedColor)
    onClose()
  }

  return (
    <SharedDraggableModal
      opened={opened}
      onClose={handleCancelClick}
      title={title}
      subtitle={subtitle}
      headerExtra={<Palette size={15} color="var(--mantine-color-teal-7, #0e6b66)" />}
      width={280}
      anchorEl={anchorEl}
      mode="floating"
      draggable={true}
      showCloseButton={true}
      closeOnClickOutside={false}
      closeOnEscape={true}
      zIndex={zIndex}
      footer={
        <Group grow gap="xs">
          <Button variant="default" size="xs" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button color="teal" size="xs" onClick={handleApplyClick}>
            Apply
          </Button>
        </Group>
      }
    >
      <Stack gap="xs">
        {/* Selected Color Information Bar */}
        <Paper
          withBorder
          p="xs"
          radius="sm"
          style={{
            backgroundColor: 'var(--mantine-color-gray-0, #f8f9fa)',
          }}
        >
          <Flex align="center" justify="space-between" gap="xs">
            <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
              <Box
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  backgroundColor: selectedColor,
                  border: '1px solid rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text size="xs" fw={700} truncate>
                  {activeSwatch?.label || 'Selected Color'}
                </Text>
                <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                  {selectedColor.toUpperCase()}
                </Text>
              </Box>
            </Group>
          </Flex>
        </Paper>

        {/* 9-Swatch Coordinated Grid */}
        <Box>
          <Text size="xs" fw={600} mb={6} style={{ fontSize: 11 }}>
            Theme Swatches:
          </Text>
          <Flex wrap="wrap" gap={6} align="center">
            {swatches.map((item) => {
              const isSelected = normalizedSelected === item.color.toLowerCase().trim()
              const rgb = parseColorToRgb(item.color)
              const isDark = rgb ? getRelativeLuminance(rgb) < 0.45 : false
              const checkColor = isDark ? '#ffffff' : '#000000'

              return (
                <Tooltip
                  key={item.id}
                  label={`${item.label} (${item.color.toUpperCase()})`}
                  withArrow
                  position="top"
                  openDelay={200}
                >
                  <Box
                    component="button"
                    type="button"
                    aria-label={`Select ${item.label}: ${item.color}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectColor(item.color)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: item.color,
                      border: isSelected
                        ? '2px solid var(--mantine-color-primary, #0e6b66)'
                        : '1px solid rgba(0,0,0,0.18)',
                      boxShadow: isSelected
                        ? '0 0 0 1px #ffffff, 0 0 0 3px var(--mantine-color-primary, #0e6b66)'
                        : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'transform 0.1s ease, box-shadow 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={14} color={checkColor} strokeWidth={3} />}
                  </Box>
                </Tooltip>
              )
            })}
          </Flex>
        </Box>
      </Stack>
    </SharedDraggableModal>
  )
}
