'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Portal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { AlignCenter, AlignLeft, AlignRight, Palette, Sliders, Type, X } from 'lucide-react'

import type { ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { resolveColorToken } from '@/lib/theme-engine/page-settings'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'

export interface WidgetStyleContextMenuProps {
  opened: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
  componentType: string
  componentId: string
  currentStyle?: WidgetSemanticStyle
  themeConfig?: ThemeConfig
  onUpdateStyle: (style: WidgetSemanticStyle) => void
}

export function WidgetStyleContextMenu({
  opened,
  onClose,
  anchorEl,
  componentType,
  componentId,
  currentStyle = {},
  themeConfig,
  onUpdateStyle,
}: WidgetStyleContextMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [colorModalTarget, setColorModalTarget] = useState<'text' | 'background' | null>(null)
  const [colorModalAnchor, setColorModalAnchor] = useState<HTMLElement | null>(null)

  // Widget capability check
  const manifest = useMemo(() => {
    try {
      return getWidgetManifest(componentType)
    } catch {
      return null
    }
  }, [componentType])

  const capabilities = manifest?.capabilities || []
  const category = manifest?.category || ''

  const isTypographyWidget =
    capabilities.some((c) =>
      ['document.title', 'document.content', 'document.meta', 'layout.text'].includes(c),
    ) ||
    ['PostTitle', 'TextBlock', 'ItemTitle', 'ItemExcerpt', 'CategoryHeader'].includes(componentType)

  const isLayoutWidget =
    category === 'layout' ||
    capabilities.some((c) => ['layout.container', 'layout.columns'].includes(c)) ||
    ['Columns', 'TextBlock', 'Header', 'Footer'].includes(componentType)

  // Typography preset options from theme tokens
  const typographyPresets = useMemo(() => {
    const typo = (themeConfig?.tokens?.typography || {}) as Record<string, any>
    const knownKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3']
    const keys = Array.from(new Set([...knownKeys, ...Object.keys(typo).filter((k) => typeof typo[k] === 'object')]))

    return keys.map((k) => ({
      value: k,
      label: k.toUpperCase().startsWith('H') ? `${k.toUpperCase()} (Heading ${k.slice(1)})` : `${k.toUpperCase()} (Body ${k.slice(1)})`,
    }))
  }, [themeConfig])

  // Viewport-safe position calculation
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 100, left: 100 })

  useEffect(() => {
    if (!opened || !anchorEl) return

    const rect = anchorEl.getBoundingClientRect()
    const panelWidth = 280
    const panelHeight = 320

    const top = Math.max(
      16,
      Math.min(window.innerHeight - panelHeight - 16, rect.bottom + 8),
    )
    const left = Math.max(
      16,
      Math.min(window.innerWidth - panelWidth - 16, rect.left),
    )

    setCoords({ top, left })
  }, [opened, anchorEl])

  // Close on Escape or click outside
  useEffect(() => {
    if (!opened) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !colorModalTarget) {
        onClose()
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      // Don't close if color modal is opened
      if (colorModalTarget) return

      const target = e.target as Node
      if (panelRef.current && !panelRef.current.contains(target) && anchorEl && !anchorEl.contains(target)) {
        // Also ensure not clicking inside Mantine modal/portal
        const portal = document.querySelector('.mantine-Modal-root')
        if (portal && portal.contains(target)) return

        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [opened, onClose, anchorEl, colorModalTarget])

  if (!opened) return null

  const currentColorToken = currentStyle.colorToken || 'text'
  const currentTextColor = resolveColorToken(currentColorToken, '#17201f')
  const currentBgToken = currentStyle.backgroundToken || 'surface'
  const currentBgColor = resolveColorToken(currentBgToken, '#ffffff')

  const update = (partial: Partial<WidgetSemanticStyle>) => {
    onUpdateStyle({
      ...currentStyle,
      ...partial,
    })
  }

  return (
    <Portal>
      <Paper
        ref={panelRef}
        withBorder
        shadow="md"
        radius="sm"
        p="xs"
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: 280,
          zIndex: 1050,
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          border: '1px solid var(--zyvavu-border, #dfe5e2)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        <Stack gap="xs">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Group gap={6}>
              <Sliders size={14} color="var(--mantine-color-teal-7, #0e6b66)" />
              <Text fw={700} size="xs" c="var(--zyvavu-text, #17201f)">
                Style: {componentType}
              </Text>
            </Group>
            <ActionIcon size="xs" variant="subtle" color="gray" onClick={onClose}>
              <X size={13} />
            </ActionIcon>
          </Group>

          <Divider />

          {/* Typography Controls */}
          {isTypographyWidget && (
            <Stack gap={6}>
              <Text size="xs" fw={600} c="dimmed" style={{ fontSize: 11 }}>
                Typography & Color
              </Text>

              <Select
                size="xs"
                placeholder="Typography Preset"
                value={currentStyle.typography || (componentType === 'PostTitle' ? 'h1' : 'p1')}
                onChange={(val) => update({ typography: val || undefined })}
                data={typographyPresets}
              />

              {/* Color Token Selector */}
              <Paper p={6} withBorder radius="xs">
                <Group justify="space-between" align="center">
                  <Group gap={6}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        backgroundColor: currentTextColor,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                    <Text size="xs" fw={500} style={{ fontSize: 11 }}>
                      {currentColorToken}
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="teal"
                    onClick={(e) => {
                      setColorModalAnchor(e.currentTarget)
                      setColorModalTarget('text')
                    }}
                  >
                    Change
                  </Button>
                </Group>
              </Paper>

              {/* Alignment */}
              <Box>
                <SegmentedControl
                  size="xs"
                  fullWidth
                  value={currentStyle.align || 'left'}
                  onChange={(val) => update({ align: val as 'left' | 'center' | 'right' })}
                  data={[
                    { label: <AlignLeft size={13} />, value: 'left' },
                    { label: <AlignCenter size={13} />, value: 'center' },
                    { label: <AlignRight size={13} />, value: 'right' },
                  ]}
                />
              </Box>
            </Stack>
          )}

          {/* Layout & Box Controls */}
          {isLayoutWidget && (
            <Stack gap={6}>
              {isTypographyWidget && <Divider />}
              <Text size="xs" fw={600} c="dimmed" style={{ fontSize: 11 }}>
                Spacing & Radius
              </Text>

              <Select
                size="xs"
                label="Padding Spacing"
                placeholder="Spacing Scale"
                value={currentStyle.spacing || 'md'}
                onChange={(val) => update({ spacing: val || undefined })}
                data={[
                  { value: 'none', label: 'None (0px)' },
                  { value: 'xs', label: 'Extra Small (xs)' },
                  { value: 'sm', label: 'Small (sm)' },
                  { value: 'md', label: 'Medium (md)' },
                  { value: 'lg', label: 'Large (lg)' },
                  { value: 'xl', label: 'Extra Large (xl)' },
                ]}
              />

              <Select
                size="xs"
                label="Border Radius"
                placeholder="Radius Scale"
                value={currentStyle.radius || 'sm'}
                onChange={(val) => update({ radius: val || undefined })}
                data={[
                  { value: 'none', label: 'None (0px)' },
                  { value: 'sm', label: 'Small (sm)' },
                  { value: 'md', label: 'Medium (md)' },
                  { value: 'lg', label: 'Large (lg)' },
                  { value: 'pill', label: 'Pill / Rounded' },
                ]}
              />

              {/* Background Token */}
              <Paper p={6} withBorder radius="xs">
                <Group justify="space-between" align="center">
                  <Group gap={6}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        backgroundColor: currentBgColor,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                    <Text size="xs" fw={500} style={{ fontSize: 11 }}>
                      Bg: {currentBgToken}
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="teal"
                    onClick={(e) => {
                      setColorModalAnchor(e.currentTarget)
                      setColorModalTarget('background')
                    }}
                  >
                    Change
                  </Button>
                </Group>
              </Paper>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Palette Modal */}
      {colorModalTarget && (
        <ThemeColorPaletteModal
          opened={Boolean(colorModalTarget)}
          anchorEl={colorModalAnchor}
          title={colorModalTarget === 'text' ? 'Widget Text Color Token' : 'Widget Background Token'}
          subtitle="Select semantic theme color token"
          value={colorModalTarget === 'text' ? currentColorToken : currentBgToken}
          tokens={themeConfig?.tokens}
          zIndex={1150}
          onClose={() => {
            setColorModalTarget(null)
            setColorModalAnchor(null)
          }}
          onApplyToken={(tokenId) => {
            if (colorModalTarget === 'text') {
              update({ colorToken: tokenId })
            } else {
              update({ backgroundToken: tokenId })
            }
          }}
        />
      )}
    </Portal>
  )
}
