'use client'

import React from 'react'
import { Box, Flex, Group, Text, Tooltip } from '@mantine/core'
import { Check } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme-engine/types'
import { parseColorToRgb, getRelativeLuminance } from '@/lib/theme-engine/presets'

export interface ThemeColorPalettePickerProps {
  tokens: ThemeTokens
  value?: string
  onChange: (colorHex: string) => void
  label?: string
  description?: string
  className?: string
}

interface PaletteSwatchItem {
  id: string
  label: string
  color: string
}

export function ThemeColorPalettePicker({
  tokens,
  value,
  onChange,
  label,
  description,
}: ThemeColorPalettePickerProps) {
  const swatches: PaletteSwatchItem[] = [
    { id: 'text', label: 'Main Text', color: tokens.colors.text || '#17201f' },
    { id: 'primary', label: 'Primary Brand', color: tokens.colors.primary || '#0e6b66' },
    { id: 'accent', label: 'Accent Highlight', color: tokens.colors.accent || tokens.colors.primary || '#2ec4b6' },
    { id: 'primaryHover', label: 'Primary Hover', color: tokens.colors.primaryHover || tokens.colors.primary || '#0b5652' },
    { id: 'shadowSoft', label: 'Shadow Soft', color: tokens.colors.shadowSoft || '#e6eceb' },
    { id: 'shadowMedium', label: 'Shadow Medium', color: tokens.colors.shadowMedium || '#bfd0cd' },
    { id: 'shadowStrong', label: 'Shadow Strong', color: tokens.colors.shadowStrong || '#7a9692' },
    { id: 'white', label: 'White', color: '#FFFFFF' },
    { id: 'black', label: 'Black', color: '#000000' },
  ]

  const normalizedCurrent = (value || '').toLowerCase().trim()

  return (
    <Box>
      {label && (
        <Text size="xs" fw={700} mb={ description ? 2 : 6 }>
          {label}
        </Text>
      )}
      {description && (
        <Text size="xs" c="dimmed" mb={6} style={{ fontSize: 11 }}>
          {description}
        </Text>
      )}

      {/* Compact Wix-style Swatch Grid */}
      <Flex wrap="wrap" gap={6} align="center">
        {swatches.map((item) => {
          const isSelected = normalizedCurrent === item.color.toLowerCase().trim()
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
                onClick={() => onChange(item.color)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: item.color,
                  border: isSelected ? '2px solid var(--mantine-color-primary, #0e6b66)' : '1px solid rgba(0,0,0,0.18)',
                  boxShadow: isSelected ? '0 0 0 1px #ffffff, 0 0 0 3px var(--mantine-color-primary, #0e6b66)' : 'none',
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
  )
}
