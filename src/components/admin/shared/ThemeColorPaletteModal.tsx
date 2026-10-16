'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core'
import { Check, Palette, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme-engine/types'
import { parseColorToRgb, getRelativeLuminance } from '@/lib/theme-engine/presets'
import { SharedDraggableModal } from './SharedDraggableModal'
import type { GradientDef, GradientStop, MeshDef, MeshPoint } from '@/lib/style-engine/types'
import { serializeGradientCss, serializeMeshCss } from '@/lib/style-engine/token-resolver'

export interface PaletteSwatchItem {
  id: string
  label: string
  color: string
}

export type ColorPickerMode = 'solid' | 'gradient' | 'mesh'

export interface ThemeColorPaletteModalProps {
  opened: boolean
  onClose: () => void
  value?: string
  tokens?: ThemeTokens
  colors?: Record<string, string>
  title?: string
  subtitle?: string
  anchorEl?: HTMLElement | null
  zIndex?: number
  includeBackgroundTokens?: boolean
  onChange?: (colorHex: string) => void
  onApply?: (colorHex: string) => void
  onSelectToken?: (token: string, colorHex: string) => void
  onApplyToken?: (token: string, colorHex: string) => void
  onCancel?: () => void

  // Extended capabilities for Unified Color Picker
  supportedModes?: ColorPickerMode[]
  initialMode?: ColorPickerMode
  gradientValue?: GradientDef
  meshValue?: MeshDef
  onApplyGradient?: (gradient: GradientDef) => void
  onApplyMesh?: (mesh: MeshDef) => void
}

/**
 * Helper to build the standard palette swatches from ThemeTokens or raw colors map.
 */
export function getThemePaletteSwatches(
  tokens?: ThemeTokens,
  colors?: Record<string, string>,
  options?: { includeBackgroundTokens?: boolean },
): PaletteSwatchItem[] {
  const c = tokens?.colors || colors || {}
  const bgSwatches = options?.includeBackgroundTokens
    ? [
        { id: 'background', label: 'Background', color: c.background || '#ffffff' },
        { id: 'surface', label: 'Surface Card', color: c.surface || '#ffffff' },
      ]
    : []

  return [
    ...bgSwatches,
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

const DEFAULT_GRADIENT: GradientDef = {
  type: 'linear',
  angle: 135,
  stops: [
    { token: 'primary', position: 0 },
    { token: 'accent', position: 100 },
  ],
}

const DEFAULT_MESH: MeshDef = {
  points: [
    { id: 'p1', token: 'primary', x: 20, y: 20, radius: 60 },
    { id: 'p2', token: 'accent', x: 80, y: 30, radius: 50 },
    { id: 'p3', token: 'surface', x: 50, y: 80, radius: 70 },
  ],
}

/**
 * Reusable Theme Color Palette Modal
 * Extended with Solid, Gradient, and Mesh Gradient tabs referencing theme color tokens.
 */
export function ThemeColorPaletteModal({
  opened,
  onClose,
  value = '',
  tokens,
  colors,
  title = 'Theme Color Palette',
  subtitle = 'Choose a coordinated theme color',
  anchorEl,
  zIndex = 1100,
  includeBackgroundTokens = false,
  onChange,
  onApply,
  onSelectToken,
  onApplyToken,
  onCancel,
  supportedModes = ['solid', 'gradient', 'mesh'],
  initialMode = 'solid',
  gradientValue,
  meshValue,
  onApplyGradient,
  onApplyMesh,
}: ThemeColorPaletteModalProps) {
  const swatches = useMemo(
    () => getThemePaletteSwatches(tokens, colors, { includeBackgroundTokens }),
    [tokens, colors, includeBackgroundTokens],
  )

  const resolveInitialColor = (val: string) => {
    if (!val) return '#17201f'
    const foundToken = swatches.find((s) => s.id === val)
    if (foundToken) return foundToken.color
    return val
  }

  // Active Tab Mode
  const [activeTab, setActiveTab] = useState<ColorPickerMode>(() => {
    if (gradientValue && supportedModes.includes('gradient')) return 'gradient'
    if (meshValue && supportedModes.includes('mesh')) return 'mesh'
    return supportedModes.includes(initialMode) ? initialMode : supportedModes[0] || 'solid'
  })

  // Solid State
  const initialColorRef = useRef<string>(resolveInitialColor(value))
  const [selectedColor, setSelectedColor] = useState<string>(resolveInitialColor(value))

  // Gradient State
  const [gradient, setGradient] = useState<GradientDef>(gradientValue || DEFAULT_GRADIENT)

  // Mesh State
  const [mesh, setMesh] = useState<MeshDef>(meshValue || DEFAULT_MESH)

  useEffect(() => {
    if (opened) {
      const resolved = resolveInitialColor(value)
      initialColorRef.current = resolved
      setSelectedColor(resolved)
      if (gradientValue) setGradient(gradientValue)
      if (meshValue) setMesh(meshValue)
    }
  }, [opened, value, gradientValue, meshValue])

  const normalizedSelected = (selectedColor || '').toLowerCase().trim()

  const activeSwatch = useMemo(() => {
    const byToken = swatches.find((s) => s.id === value)
    if (byToken) return byToken
    return swatches.find((s) => s.color.toLowerCase().trim() === normalizedSelected)
  }, [swatches, value, normalizedSelected])

  const handleSelectColor = (hex: string, tokenId: string) => {
    setSelectedColor(hex)
    onChange?.(hex)
    onSelectToken?.(tokenId, hex)
  }

  const handleCancelClick = () => {
    const original = initialColorRef.current
    setSelectedColor(original)
    onChange?.(original)
    onCancel?.()
    onClose()
  }

  const handleApplyClick = () => {
    if (activeTab === 'gradient') {
      const css = serializeGradientCss(gradient)
      onApplyGradient?.(gradient)
      if (css) onApply?.(css)
      onClose()
      return
    }

    if (activeTab === 'mesh') {
      const css = serializeMeshCss(mesh)
      onApplyMesh?.(mesh)
      if (css) onApply?.(css)
      onClose()
      return
    }

    // Solid
    const tokenId = activeSwatch?.id || 'primary'
    onApply?.(selectedColor)
    onApplyToken?.(tokenId, selectedColor)
    onClose()
  }

  // Gradient Handlers
  const handleAddStop = () => {
    setGradient((prev) => ({
      ...prev,
      stops: [
        ...prev.stops,
        {
          token: 'primary',
          position: Math.min(100, (prev.stops[prev.stops.length - 1]?.position || 50) + 20),
        },
      ],
    }))
  }

  const handleRemoveStop = (idx: number) => {
    if (gradient.stops.length <= 2) return
    setGradient((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== idx),
    }))
  }

  const handleUpdateStop = (idx: number, partial: Partial<GradientStop>) => {
    setGradient((prev) => ({
      ...prev,
      stops: prev.stops.map((s, i) => (i === idx ? { ...s, ...partial } : s)),
    }))
  }

  // Mesh Handlers
  const handleAddMeshPoint = () => {
    setMesh((prev) => ({
      ...prev,
      points: [
        ...prev.points,
        {
          id: `p-${Date.now()}`,
          token: 'primary',
          x: Math.floor(Math.random() * 80) + 10,
          y: Math.floor(Math.random() * 80) + 10,
          radius: 50,
        },
      ],
    }))
  }

  const handleRemoveMeshPoint = (id: string) => {
    if (mesh.points.length <= 2) return
    setMesh((prev) => ({
      ...prev,
      points: prev.points.filter((p) => p.id !== id),
    }))
  }

  const handleUpdateMeshPoint = (id: string, partial: Partial<MeshPoint>) => {
    setMesh((prev) => ({
      ...prev,
      points: prev.points.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    }))
  }

  const renderedGradientCss = useMemo(() => serializeGradientCss(gradient), [gradient])
  const renderedMeshCss = useMemo(() => serializeMeshCss(mesh), [mesh])

  const showTabs = supportedModes.length > 1

  return (
    <SharedDraggableModal
      opened={opened}
      onClose={handleCancelClick}
      title={title}
      subtitle={subtitle}
      headerExtra={<Palette size={15} color="var(--mantine-color-teal-7, #0e6b66)" />}
      width={340}
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
        {showTabs && (
          <Tabs
            value={activeTab}
            onChange={(val) => setActiveTab(val as ColorPickerMode)}
            variant="pills"
            color="teal"
          >
            <Tabs.List grow mb="xs">
              {supportedModes.includes('solid') && <Tabs.Tab value="solid">Solid</Tabs.Tab>}
              {supportedModes.includes('gradient') && <Tabs.Tab value="gradient">Gradient</Tabs.Tab>}
              {supportedModes.includes('mesh') && <Tabs.Tab value="mesh">Mesh</Tabs.Tab>}
            </Tabs.List>
          </Tabs>
        )}

        {/* 1. SOLID TAB */}
        {activeTab === 'solid' && (
          <Stack gap="xs">
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
                        onClick={() => handleSelectColor(item.color, item.id)}
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
        )}

        {/* 2. GRADIENT TAB */}
        {activeTab === 'gradient' && (
          <Stack gap="xs">
            {/* Live Gradient Preview */}
            <Box
              style={{
                height: 56,
                borderRadius: 6,
                backgroundImage: renderedGradientCss || 'none',
                border: '1px solid var(--zyvavu-border, #dfe5e2)',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
              }}
            />

            <Group justify="space-between" align="center">
              <SegmentedControl
                size="xs"
                value={gradient.type}
                onChange={(val) =>
                  setGradient((prev) => ({ ...prev, type: val as 'linear' | 'radial' }))
                }
                data={[
                  { label: 'Linear', value: 'linear' },
                  { label: 'Radial', value: 'radial' },
                ]}
              />

              <Button
                variant="subtle"
                size="xs"
                color="gray"
                leftSection={<RotateCcw size={12} />}
                onClick={() => setGradient(DEFAULT_GRADIENT)}
              >
                Reset
              </Button>
            </Group>

            {gradient.type === 'linear' && (
              <Box>
                <Group justify="space-between" mb={2}>
                  <Text size="xs" c="dimmed">
                    Angle: {gradient.angle}°
                  </Text>
                </Group>
                <Slider
                  size="xs"
                  color="teal"
                  min={0}
                  max={360}
                  step={5}
                  value={gradient.angle}
                  onChange={(val) => setGradient((prev) => ({ ...prev, angle: val }))}
                />
              </Box>
            )}

            <Divider my={2} />

            <Group justify="space-between">
              <Text size="xs" fw={600} style={{ fontSize: 11 }}>
                Color Stops ({gradient.stops.length}):
              </Text>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<Plus size={12} />}
                onClick={handleAddStop}
              >
                Add Stop
              </Button>
            </Group>

            <Stack gap={6}>
              {gradient.stops.map((stop, idx) => (
                <Paper key={idx} p={6} withBorder radius="xs">
                  <Group justify="space-between" gap="xs">
                    <Group gap={6}>
                      {/* Swatch dropdown or buttons */}
                      <Flex gap={4}>
                        {swatches.slice(0, 5).map((sw) => (
                          <Box
                            key={sw.id}
                            component="button"
                            type="button"
                            onClick={() => handleUpdateStop(idx, { token: sw.id })}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 3,
                              backgroundColor: sw.color,
                              border:
                                stop.token === sw.id
                                  ? '2px solid #0e6b66'
                                  : '1px solid rgba(0,0,0,0.2)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          />
                        ))}
                      </Flex>
                      <Text size="xs" fw={500} style={{ fontSize: 11 }}>
                        {stop.token}
                      </Text>
                    </Group>

                    <Group gap="xs" style={{ flex: 1, justifyContent: 'flex-end' }}>
                      <Box style={{ width: 80 }}>
                        <Slider
                          size="xs"
                          color="teal"
                          min={0}
                          max={100}
                          value={stop.position}
                          onChange={(val) => handleUpdateStop(idx, { position: val })}
                        />
                      </Box>
                      <Text size="xs" c="dimmed" style={{ width: 28, textAlign: 'right' }}>
                        {stop.position}%
                      </Text>

                      {gradient.stops.length > 2 && (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveStop(idx)}
                        >
                          <Trash2 size={12} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}

        {/* 3. MESH TAB */}
        {activeTab === 'mesh' && (
          <Stack gap="xs">
            {/* Live Mesh Preview */}
            <Box
              style={{
                height: 60,
                borderRadius: 6,
                backgroundImage: renderedMeshCss || 'none',
                backgroundColor: 'var(--zyvavu-theme-background, #ffffff)',
                border: '1px solid var(--zyvavu-border, #dfe5e2)',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
              }}
            />

            <Group justify="space-between" align="center">
              <Text size="xs" fw={600} style={{ fontSize: 11 }}>
                Mesh Points ({mesh.points.length}):
              </Text>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  leftSection={<RotateCcw size={12} />}
                  onClick={() => setMesh(DEFAULT_MESH)}
                >
                  Reset
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  leftSection={<Plus size={12} />}
                  onClick={handleAddMeshPoint}
                  disabled={mesh.points.length >= 5}
                >
                  Add Point
                </Button>
              </Group>
            </Group>

            <Stack gap={6}>
              {mesh.points.map((pt) => (
                <Paper key={pt.id} p={6} withBorder radius="xs">
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Flex gap={4}>
                        {swatches.slice(0, 5).map((sw) => (
                          <Box
                            key={sw.id}
                            component="button"
                            type="button"
                            onClick={() => handleUpdateMeshPoint(pt.id, { token: sw.id })}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 3,
                              backgroundColor: sw.color,
                              border:
                                pt.token === sw.id
                                  ? '2px solid #0e6b66'
                                  : '1px solid rgba(0,0,0,0.2)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          />
                        ))}
                      </Flex>
                      <Text size="xs" fw={500} style={{ fontSize: 11 }}>
                        {pt.token}
                      </Text>
                      {mesh.points.length > 2 && (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveMeshPoint(pt.id)}
                        >
                          <Trash2 size={12} />
                        </ActionIcon>
                      )}
                    </Group>

                    <Group grow gap="xs">
                      <Box>
                        <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                          X: {pt.x}%
                        </Text>
                        <Slider
                          size="xs"
                          color="teal"
                          min={0}
                          max={100}
                          value={pt.x}
                          onChange={(val) => handleUpdateMeshPoint(pt.id, { x: val })}
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                          Y: {pt.y}%
                        </Text>
                        <Slider
                          size="xs"
                          color="teal"
                          min={0}
                          max={100}
                          value={pt.y}
                          onChange={(val) => handleUpdateMeshPoint(pt.id, { y: val })}
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                          Radius: {pt.radius || 50}%
                        </Text>
                        <Slider
                          size="xs"
                          color="teal"
                          min={20}
                          max={100}
                          value={pt.radius || 50}
                          onChange={(val) => handleUpdateMeshPoint(pt.id, { radius: val })}
                        />
                      </Box>
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </SharedDraggableModal>
  )
}
