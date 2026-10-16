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
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'

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
  onChangeGradient?: (gradient: GradientDef) => void
  onChangeMesh?: (mesh: MeshDef) => void
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
  zIndex = ADMIN_OVERLAY_LAYERS.PALETTE_MODAL,
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
  onChangeGradient,
  onChangeMesh,
  onApplyGradient,
  onApplyMesh,
}: ThemeColorPaletteModalProps) {
  const shouldIncludeBg =
    includeBackgroundTokens || value === 'background' || value === 'surface'

  const swatches = useMemo(
    () => getThemePaletteSwatches(tokens, colors, { includeBackgroundTokens: shouldIncludeBg }),
    [tokens, colors, shouldIncludeBg],
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

  // Solid State: Track both selectedToken and selectedColor
  const [selectedToken, setSelectedToken] = useState<string>(() => value || 'surface')
  const [selectedColor, setSelectedColor] = useState<string>(() => resolveInitialColor(value))
  const initialColorRef = useRef<string>(resolveInitialColor(value))
  const initialTokenRef = useRef<string>(value || 'surface')

  // Gradient State
  const [gradient, setGradient] = useState<GradientDef>(gradientValue || DEFAULT_GRADIENT)

  // Mesh State
  const [mesh, setMesh] = useState<MeshDef>(meshValue || DEFAULT_MESH)

  useEffect(() => {
    if (opened) {
      const resolved = resolveInitialColor(value)
      initialColorRef.current = resolved
      initialTokenRef.current = value || 'surface'
      setSelectedColor(resolved)
      setSelectedToken(value || 'surface')
      if (gradientValue) setGradient(gradientValue)
      if (meshValue) setMesh(meshValue)
    }
  }, [opened, value, gradientValue, meshValue])

  const normalizedSelected = (selectedColor || '').toLowerCase().trim()

  const activeSwatch = useMemo(() => {
    if (selectedToken) {
      const byToken = swatches.find((s) => s.id === selectedToken)
      if (byToken) return byToken
    }
    return swatches.find((s) => s.color.toLowerCase().trim() === normalizedSelected)
  }, [swatches, selectedToken, normalizedSelected])

  const handleSelectColor = (hex: string, tokenId: string) => {
    setSelectedToken(tokenId)
    setSelectedColor(hex)
    onChange?.(hex)
    onSelectToken?.(tokenId, hex)
  }

  const handleCancelClick = () => {
    const originalColor = initialColorRef.current
    const originalToken = initialTokenRef.current
    setSelectedColor(originalColor)
    setSelectedToken(originalToken)
    onChange?.(originalColor)
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
    const tokenId = selectedToken || activeSwatch?.id || 'primary'
    onApply?.(selectedColor)
    onApplyToken?.(tokenId, selectedColor)
    onClose()
  }

  // Gradient Handlers
  const updateGradient = (updater: (prev: GradientDef) => GradientDef) => {
    setGradient((prev) => {
      const next = updater(prev)
      onChangeGradient?.(next)
      return next
    })
  }

  const handleAddStop = () => {
    updateGradient((prev) => ({
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
    updateGradient((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== idx),
    }))
  }

  const handleUpdateStop = (idx: number, partial: Partial<GradientStop>) => {
    updateGradient((prev) => ({
      ...prev,
      stops: prev.stops.map((s, i) => (i === idx ? { ...s, ...partial } : s)),
    }))
  }

  // Mesh Handlers
  const updateMesh = (updater: (prev: MeshDef) => MeshDef) => {
    setMesh((prev) => {
      const next = updater(prev)
      onChangeMesh?.(next)
      return next
    })
  }

  const handleAddMeshPoint = () => {
    updateMesh((prev) => ({
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
    updateMesh((prev) => ({
      ...prev,
      points: prev.points.filter((p) => p.id !== id),
    }))
  }

  const handleUpdateMeshPoint = (id: string, partial: Partial<MeshPoint>) => {
    updateMesh((prev) => ({
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
      headerExtra={<Palette size={16} color="var(--mantine-color-teal-7, #0e6b66)" />}
      width={360}
      anchorEl={anchorEl}
      mode="floating"
      draggable={true}
      showCloseButton={true}
      closeOnClickOutside={false}
      closeOnEscape={true}
      zIndex={zIndex}
      footer={
        <Group grow gap="xs">
          <Button variant="default" size="sm" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button color="teal" size="sm" onClick={handleApplyClick}>
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
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: selectedColor,
                      border: '1px solid rgba(0,0,0,0.2)',
                      flexShrink: 0,
                    }}
                  />
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={700} truncate>
                      {activeSwatch?.label || 'Selected Color'}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                      {selectedColor.toUpperCase()} ({selectedToken || 'custom'})
                    </Text>
                  </Box>
                </Group>
              </Flex>
            </Paper>

            <Box>
              <Text size="xs" fw={600} mb={8} style={{ fontSize: 13, color: 'var(--mantine-color-text, #17201f)' }}>
                Theme Swatches:
              </Text>
              <Flex wrap="wrap" gap={8} align="center">
                {swatches.map((item) => {
                  const isSelected = selectedToken
                    ? item.id === selectedToken
                    : normalizedSelected === item.color.toLowerCase().trim()
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
                          width: 32,
                          height: 32,
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
                        {isSelected && <Check size={16} color={checkColor} strokeWidth={3} />}
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
                  updateGradient((prev) => ({ ...prev, type: val as 'linear' | 'radial' }))
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
                onClick={() => updateGradient(() => DEFAULT_GRADIENT)}
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
                  onChange={(val) => updateGradient((prev) => ({ ...prev, angle: val }))}
                />
              </Box>
            )}

            <Divider my={2} />

            <Group justify="space-between">
              <Text size="xs" fw={600} style={{ fontSize: 13, color: 'var(--mantine-color-text, #17201f)' }}>
                Color Stops ({gradient.stops.length}):
              </Text>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<Plus size={14} />}
                onClick={handleAddStop}
              >
                Add Stop
              </Button>
            </Group>

            <Stack gap="xs">
              {gradient.stops.map((stop, idx) => (
                <Paper key={idx} p="xs" withBorder radius="xs">
                  <Group justify="space-between" gap="xs">
                    <Group gap="xs">
                      {/* Swatch buttons */}
                      <Flex gap={4}>
                        {swatches.slice(0, 6).map((sw) => (
                          <Box
                            key={sw.id}
                            component="button"
                            type="button"
                            title={sw.label}
                            onClick={() => handleUpdateStop(idx, { token: sw.id })}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              backgroundColor: sw.color,
                              border:
                                stop.token === sw.id
                                  ? '2px solid #0e6b66'
                                  : '1px solid rgba(0,0,0,0.25)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          />
                        ))}
                      </Flex>
                      <Text size="xs" fw={600} style={{ fontSize: 12 }}>
                        {stop.token}
                      </Text>
                    </Group>

                    <Group gap="xs" style={{ flex: 1, justifyContent: 'flex-end' }}>
                      <Box style={{ width: 90 }}>
                        <Slider
                          size="sm"
                          color="teal"
                          min={0}
                          max={100}
                          value={stop.position}
                          onChange={(val) => handleUpdateStop(idx, { position: val })}
                        />
                      </Box>
                      <Text size="xs" c="dimmed" style={{ width: 32, textAlign: 'right', fontSize: 12 }}>
                        {stop.position}%
                      </Text>

                      {gradient.stops.length > 2 && (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveStop(idx)}
                          aria-label="Remove stop"
                        >
                          <Trash2 size={14} />
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
                height: 64,
                borderRadius: 6,
                backgroundImage: renderedMeshCss || 'none',
                backgroundColor: 'var(--zyvavu-theme-background, #ffffff)',
                border: '1px solid var(--zyvavu-border, #dfe5e2)',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
              }}
            />

            <Group justify="space-between" align="center">
              <Text size="xs" fw={600} style={{ fontSize: 13, color: 'var(--mantine-color-text, #17201f)' }}>
                Mesh Points ({mesh.points.length}):
              </Text>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  leftSection={<RotateCcw size={13} />}
                  onClick={() => updateMesh(() => DEFAULT_MESH)}
                >
                  Reset
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  leftSection={<Plus size={14} />}
                  onClick={handleAddMeshPoint}
                  disabled={mesh.points.length >= 5}
                >
                  Add Point
                </Button>
              </Group>
            </Group>

            <Stack gap="xs">
              {mesh.points.map((pt) => (
                <Paper key={pt.id} p="xs" withBorder radius="xs">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Flex gap={4}>
                        {swatches.slice(0, 6).map((sw) => (
                          <Box
                            key={sw.id}
                            component="button"
                            type="button"
                            title={sw.label}
                            onClick={() => handleUpdateMeshPoint(pt.id, { token: sw.id })}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              backgroundColor: sw.color,
                              border:
                                pt.token === sw.id
                                  ? '2px solid #0e6b66'
                                  : '1px solid rgba(0,0,0,0.25)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          />
                        ))}
                      </Flex>
                      <Text size="xs" fw={600} style={{ fontSize: 12 }}>
                        {pt.token}
                      </Text>
                      {mesh.points.length > 2 && (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveMeshPoint(pt.id)}
                          aria-label="Remove mesh point"
                        >
                          <Trash2 size={14} />
                        </ActionIcon>
                      )}
                    </Group>

                    <Group grow gap="xs">
                      <Box>
                        <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                          X: {pt.x}%
                        </Text>
                        <Slider
                          size="sm"
                          color="teal"
                          min={0}
                          max={100}
                          value={pt.x}
                          onChange={(val) => handleUpdateMeshPoint(pt.id, { x: val })}
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                          Y: {pt.y}%
                        </Text>
                        <Slider
                          size="sm"
                          color="teal"
                          min={0}
                          max={100}
                          value={pt.y}
                          onChange={(val) => handleUpdateMeshPoint(pt.id, { y: val })}
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                          Radius: {pt.radius || 50}%
                        </Text>
                        <Slider
                          size="sm"
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
