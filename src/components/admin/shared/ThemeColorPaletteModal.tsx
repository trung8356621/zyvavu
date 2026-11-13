'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
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
import { ArrowLeft, Check, Palette, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme-engine/types'
import { parseColorToRgb, getRelativeLuminance } from '@/lib/theme-engine/presets'
import { SharedDraggableModal } from './SharedDraggableModal'
import type { GradientDef, GradientStop, MeshDef, MeshPoint } from '@/lib/style-engine/types'
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
    ...(c.white ? [{ id: 'white', label: 'White', color: c.white }] : []),
    ...(c.black ? [{ id: 'black', label: 'Black', color: c.black }] : []),
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

type TokenPickTarget =
  | { kind: 'gradient-stop'; key: string }
  | { kind: 'mesh-point'; id: string }

let stopKeySeq = 0
function nextStopKey(): string {
  stopKeySeq += 1
  return `gstop-${stopKeySeq}`
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function colorOfToken(swatches: PaletteSwatchItem[], token: string, fallback = '#888888'): string {
  return swatches.find((s) => s.id === token)?.color || fallback
}

function labelOfToken(swatches: PaletteSwatchItem[], token: string): string {
  return swatches.find((s) => s.id === token)?.label || token
}

/** Modal-local preview CSS from resolved swatch HEX (Canvas still uses Style Engine serializer). */
function previewGradientCss(gradient: GradientDef, swatches: PaletteSwatchItem[]): string {
  const stops = gradient.stops
    .map((s) => ({ ...s, position: clampPct(s.position) }))
    .sort((a, b) => a.position - b.position)
    .map((s) => `${colorOfToken(swatches, s.token)} ${s.position}%`)
    .join(', ')
  if (gradient.type === 'radial') {
    return `radial-gradient(circle at center, ${stops})`
  }
  const angle = typeof gradient.angle === 'number' ? gradient.angle : 135
  return `linear-gradient(${angle}deg, ${stops})`
}

function previewMeshCss(mesh: MeshDef, swatches: PaletteSwatchItem[]): string {
  return mesh.points
    .map((p) => {
      const color = colorOfToken(swatches, p.token)
      const x = clampPct(p.x)
      const y = clampPct(p.y)
      const radius = typeof p.radius === 'number' ? p.radius : 50
      return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent ${radius}%)`
    })
    .join(', ')
}

/**
 * Reusable Theme Color Palette Modal
 * Extended with Solid, Gradient, and Mesh Gradient tabs referencing theme color tokens.
 */
export function ThemeColorPaletteModal(props: ThemeColorPaletteModalProps) {
  return props.opened ? <ThemeColorPaletteSession {...props} /> : null
}

function ThemeColorPaletteSession({
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

  const [activeTab, setActiveTab] = useState<ColorPickerMode>(() => {
    if (gradientValue && supportedModes.includes('gradient')) return 'gradient'
    if (meshValue && supportedModes.includes('mesh')) return 'mesh'
    return supportedModes.includes(initialMode) ? initialMode : supportedModes[0] || 'solid'
  })

  const [selectedToken, setSelectedToken] = useState<string>(() => value || 'surface')
  const [selectedColor, setSelectedColor] = useState<string>(() => resolveInitialColor(value))
  const initialColorRef = useRef<string>(resolveInitialColor(value))
  const initialTokenRef = useRef<string>(value || 'surface')

  const [gradient, setGradient] = useState<GradientDef>(gradientValue || DEFAULT_GRADIENT)
  const [stopKeys, setStopKeys] = useState<string[]>(() =>
    (gradientValue || DEFAULT_GRADIENT).stops.map(() => nextStopKey()),
  )
  const [selectedStopKey, setSelectedStopKey] = useState<string>(() => stopKeys[0] || '')

  const [mesh, setMesh] = useState<MeshDef>(meshValue || DEFAULT_MESH)
  const [selectedMeshId, setSelectedMeshId] = useState<string>(
    () => (meshValue || DEFAULT_MESH).points[0]?.id || '',
  )

  const [tokenPickTarget, setTokenPickTarget] = useState<TokenPickTarget | null>(null)

  const stopBarRef = useRef<HTMLDivElement | null>(null)
  const meshPreviewRef = useRef<HTMLDivElement | null>(null)
  const dragStopKeyRef = useRef<string | null>(null)
  const dragMeshIdRef = useRef<string | null>(null)
  const stopKeysRef = useRef(stopKeys)
  const gradientRef = useRef(gradient)
  const meshRef = useRef(mesh)
  const onChangeGradientRef = useRef(onChangeGradient)
  const onChangeMeshRef = useRef(onChangeMesh)
  stopKeysRef.current = stopKeys
  gradientRef.current = gradient
  meshRef.current = mesh
  onChangeGradientRef.current = onChangeGradient
  onChangeMeshRef.current = onChangeMesh

  const normalizedSelected = (selectedColor || '').toLowerCase().trim()

  const activeSwatch = useMemo(() => {
    if (selectedToken) {
      const byToken = swatches.find((s) => s.id === selectedToken)
      if (byToken) return byToken
    }
    return swatches.find((s) => s.color.toLowerCase().trim() === normalizedSelected)
  }, [swatches, selectedToken, normalizedSelected])

  const selectedStopIndex = stopKeys.findIndex((k) => k === selectedStopKey)
  const selectedStop =
    selectedStopIndex >= 0 ? gradient.stops[selectedStopIndex] : gradient.stops[0]
  const selectedMeshPoint = mesh.points.find((p) => p.id === selectedMeshId) || mesh.points[0]

  const tokenPickStopIndex =
    tokenPickTarget?.kind === 'gradient-stop'
      ? stopKeys.findIndex((k) => k === tokenPickTarget.key)
      : -1
  const tokenPickStop = tokenPickStopIndex >= 0 ? gradient.stops[tokenPickStopIndex] : null
  const tokenPickMesh =
    tokenPickTarget?.kind === 'mesh-point'
      ? mesh.points.find((p) => p.id === tokenPickTarget.id) || null
      : null

  useEffect(() => {
    if (selectedStopIndex < 0 && stopKeys[0]) setSelectedStopKey(stopKeys[0])
  }, [selectedStopIndex, stopKeys])

  useEffect(() => {
    if (!mesh.points.some((p) => p.id === selectedMeshId) && mesh.points[0]) {
      setSelectedMeshId(mesh.points[0].id)
    }
  }, [mesh.points, selectedMeshId])

  const keepClose = () => {
    onClose()
  }

  const updateGradient = (updater: (prev: GradientDef) => GradientDef) => {
    const next = updater(gradientRef.current)
    gradientRef.current = next
    setGradient(next)
    onChangeGradientRef.current?.(next)
  }

  const updateMesh = (updater: (prev: MeshDef) => MeshDef) => {
    const next = updater(meshRef.current)
    meshRef.current = next
    setMesh(next)
    onChangeMeshRef.current?.(next)
  }

  const handleSelectColor = (hex: string, tokenId: string) => {
    if (tokenPickTarget) {
      if (tokenPickTarget.kind === 'gradient-stop') {
        const idx = stopKeysRef.current.findIndex((k) => k === tokenPickTarget.key)
        if (idx >= 0) {
          updateGradient((prev) => ({
            ...prev,
            stops: prev.stops.map((s, i) => (i === idx ? { ...s, token: tokenId } : s)),
          }))
          setSelectedStopKey(tokenPickTarget.key)
        }
      } else {
        updateMesh((prev) => ({
          ...prev,
          points: prev.points.map((p) =>
            p.id === tokenPickTarget.id ? { ...p, token: tokenId } : p,
          ),
        }))
        setSelectedMeshId(tokenPickTarget.id)
      }
      setTokenPickTarget(null)
      return
    }

    setSelectedToken(tokenId)
    setSelectedColor(hex)
    onChange?.(hex)
    onSelectToken?.(tokenId, hex)
    onApply?.(hex)
    onApplyToken?.(tokenId, hex)
    keepClose()
  }

  const handleCancelClick = () => {
    setSelectedColor(initialColorRef.current)
    setSelectedToken(initialTokenRef.current)
    if (onCancel) onCancel()
    else onClose()
  }

  const handleAddStopAt = (position: number, select = true) => {
    const key = nextStopKey()
    const pos = clampPct(position)
    setStopKeys((prev) => [...prev, key])
    updateGradient((prev) => ({
      ...prev,
      stops: [...prev.stops, { token: 'primary', position: pos }],
    }))
    if (select) setSelectedStopKey(key)
  }

  const handleAddStop = () => {
    const last = gradient.stops[gradient.stops.length - 1]?.position ?? 50
    handleAddStopAt(Math.min(100, last + 20))
  }

  const handleRemoveSelectedStop = () => {
    if (gradient.stops.length <= 2 || selectedStopIndex < 0) return
    const removeKey = selectedStopKey
    const nextKeys = stopKeys.filter((k) => k !== removeKey)
    setStopKeys(nextKeys)
    setSelectedStopKey(nextKeys[Math.max(0, selectedStopIndex - 1)] || nextKeys[0] || '')
    updateGradient((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== selectedStopIndex),
    }))
  }

  const handleUpdateStopByKey = (key: string, partial: Partial<GradientStop>) => {
    const idx = stopKeysRef.current.findIndex((k) => k === key)
    if (idx < 0) return
    updateGradient((prev) => ({
      ...prev,
      stops: prev.stops.map((s, i) => (i === idx ? { ...s, ...partial } : s)),
    }))
  }

  const handleAddMeshPoint = () => {
    if (mesh.points.length >= 5) return
    const id = `p-${Date.now()}`
    updateMesh((prev) => ({
      ...prev,
      points: [
        ...prev.points,
        {
          id,
          token: 'primary',
          x: 50,
          y: 50,
          radius: 50,
        },
      ],
    }))
    setSelectedMeshId(id)
  }

  const handleRemoveSelectedMeshPoint = () => {
    if (mesh.points.length <= 2 || !selectedMeshPoint) return
    const removeId = selectedMeshPoint.id
    const nextPoints = mesh.points.filter((p) => p.id !== removeId)
    updateMesh((prev) => ({
      ...prev,
      points: prev.points.filter((p) => p.id !== removeId),
    }))
    setSelectedMeshId(nextPoints[0]?.id || '')
  }

  const handleUpdateMeshPoint = (id: string, partial: Partial<MeshPoint>) => {
    updateMesh((prev) => ({
      ...prev,
      points: prev.points.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    }))
  }

  const pctFromClientX = (clientX: number, el: HTMLElement | null) => {
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return clampPct(((clientX - rect.left) / rect.width) * 100)
  }

  const pctFromClientXY = (clientX: number, clientY: number, el: HTMLElement | null) => {
    if (!el) return { x: 50, y: 50 }
    const rect = el.getBoundingClientRect()
    return {
      x: rect.width <= 0 ? 50 : clampPct(((clientX - rect.left) / rect.width) * 100),
      y: rect.height <= 0 ? 50 : clampPct(((clientY - rect.top) / rect.height) * 100),
    }
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const stopKey = dragStopKeyRef.current
      if (stopKey) {
        const idx = stopKeysRef.current.findIndex((k) => k === stopKey)
        if (idx < 0) return
        const pos = pctFromClientX(event.clientX, stopBarRef.current)
        updateGradient((prev) => ({
          ...prev,
          stops: prev.stops.map((s, i) => (i === idx ? { ...s, position: pos } : s)),
        }))
        return
      }
      const meshId = dragMeshIdRef.current
      if (meshId) {
        const { x, y } = pctFromClientXY(event.clientX, event.clientY, meshPreviewRef.current)
        updateMesh((prev) => ({
          ...prev,
          points: prev.points.map((p) => (p.id === meshId ? { ...p, x, y } : p)),
        }))
      }
    }
    const onUp = () => {
      dragStopKeyRef.current = null
      dragMeshIdRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // Stable listeners; mutate via refs so stop identity survives cross-overs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderedGradientCss = useMemo(
    () => previewGradientCss(gradient, swatches),
    [gradient, swatches],
  )
  const renderedMeshCss = useMemo(() => previewMeshCss(mesh, swatches), [mesh, swatches])

  const showTabs = supportedModes.length > 1 && !tokenPickTarget

  const renderSwatchGrid = () => (
    <Box>
      <Text
        size="xs"
        fw={600}
        mb={8}
        style={{ fontSize: 13, color: 'var(--mantine-color-text, #17201f)' }}
      >
        Theme Swatches:
      </Text>
      <Flex wrap="wrap" gap={8} align="center">
        {swatches.map((item) => {
          const isSelected = tokenPickTarget
            ? tokenPickTarget.kind === 'gradient-stop'
              ? tokenPickStop?.token === item.id
              : tokenPickMesh?.token === item.id
            : selectedToken
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
  )

  const renderTokenButton = (
    token: string,
    onOpen: () => void,
    testId: string,
  ) => {
    const color = colorOfToken(swatches, token)
    const label = labelOfToken(swatches, token)
    return (
      <Button
        variant="default"
        size="sm"
        fullWidth
        data-testid={testId}
        onClick={onOpen}
        leftSection={
          <Box
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              backgroundColor: color,
              border: '1px solid rgba(0,0,0,0.25)',
              flexShrink: 0,
            }}
          />
        }
        styles={{
          inner: { justifyContent: 'flex-start' },
          label: { flex: 1, textAlign: 'left' },
        }}
      >
        {label}
      </Button>
    )
  }

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
      closeOnClickOutside={true}
      onClickOutside={keepClose}
      closeOnEscape={true}
      zIndex={zIndex}
      footer={
        <Group grow gap="xs">
          <Button variant="default" size="sm" onClick={handleCancelClick}>
            Cancel
          </Button>
        </Group>
      }
    >
      <Stack gap="xs">
        {showTabs && (
          <Tabs
            value={activeTab}
            onChange={(val) => {
              setTokenPickTarget(null)
              setActiveTab(val as ColorPickerMode)
            }}
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

        {tokenPickTarget && (
          <Stack gap="xs" data-testid="token-pick-subview">
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="Back to stops"
                onClick={() => setTokenPickTarget(null)}
              >
                <ArrowLeft size={16} />
              </ActionIcon>
              <Text size="sm" fw={600}>
                Chọn màu token
              </Text>
            </Group>
            {renderSwatchGrid()}
          </Stack>
        )}

        {!tokenPickTarget && activeTab === 'solid' && (
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
            {renderSwatchGrid()}
          </Stack>
        )}

        {!tokenPickTarget && activeTab === 'gradient' && (
          <Stack gap="xs" data-testid="gradient-editor">
            <Box
              style={{
                height: 56,
                borderRadius: 6,
                backgroundImage: renderedGradientCss || 'none',
                border: '1px solid var(--zyvavu-border, #dfe5e2)',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
              }}
              data-testid="gradient-preview"
            />

            {/* Direct stop bar under preview (Wix-like handles; custom track — not Radix multi-thumb). */}
            <Box
              ref={stopBarRef}
              data-testid="gradient-stop-bar"
              role="slider"
              aria-label="Gradient color stops"
              onPointerDown={(event) => {
                if (event.target !== event.currentTarget) return
                const pos = pctFromClientX(event.clientX, stopBarRef.current)
                handleAddStopAt(pos)
              }}
              style={{
                position: 'relative',
                height: 28,
                borderRadius: 6,
                backgroundImage: renderedGradientCss || 'none',
                border: '1px solid var(--zyvavu-border, #dfe5e2)',
                cursor: 'copy',
                touchAction: 'none',
              }}
            >
              {gradient.stops.map((stop, idx) => {
                const key = stopKeys[idx]
                if (!key) return null
                const selected = key === selectedStopKey
                const color = colorOfToken(swatches, stop.token)
                return (
                  <Box
                    key={key}
                    component="button"
                    type="button"
                    data-testid={`gradient-stop-handle-${idx}`}
                    data-stop-key={key}
                    aria-label={`Color stop ${idx + 1}, ${stop.position}%`}
                    aria-pressed={selected}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft') {
                        event.preventDefault()
                        handleUpdateStopByKey(key, { position: clampPct(stop.position - 1) })
                        setSelectedStopKey(key)
                      } else if (event.key === 'ArrowRight') {
                        event.preventDefault()
                        handleUpdateStopByKey(key, { position: clampPct(stop.position + 1) })
                        setSelectedStopKey(key)
                      } else if (event.key === 'Delete' || event.key === 'Backspace') {
                        event.preventDefault()
                        setSelectedStopKey(key)
                        // defer remove to selected handler state
                        if (gradient.stops.length > 2) {
                          const nextKeys = stopKeys.filter((k) => k !== key)
                          const removeIdx = stopKeys.findIndex((k) => k === key)
                          setStopKeys(nextKeys)
                          setSelectedStopKey(nextKeys[Math.max(0, removeIdx - 1)] || nextKeys[0] || '')
                          updateGradient((prev) => ({
                            ...prev,
                            stops: prev.stops.filter((_, i) => i !== removeIdx),
                          }))
                        }
                      }
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      dragStopKeyRef.current = key
                      setSelectedStopKey(key)
                      ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedStopKey(key)
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${clampPct(stop.position)}%`,
                      transform: 'translate(-50%, -50%)',
                      width: selected ? 16 : 14,
                      height: selected ? 16 : 14,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: selected
                        ? '2px solid var(--mantine-color-teal-7, #0e6b66)'
                        : '2px solid #ffffff',
                      boxShadow: selected
                        ? '0 0 0 2px rgba(14,107,102,0.35), 0 1px 3px rgba(0,0,0,0.35)'
                        : '0 1px 3px rgba(0,0,0,0.35)',
                      cursor: 'grab',
                      padding: 0,
                      zIndex: selected ? 2 : 1,
                    }}
                  />
                )
              })}
            </Box>

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
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  leftSection={<RotateCcw size={12} />}
                  onClick={() => {
                    const next = DEFAULT_GRADIENT
                    const keys = next.stops.map(() => nextStopKey())
                    setStopKeys(keys)
                    setSelectedStopKey(keys[0] || '')
                    updateGradient(() => next)
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  leftSection={<Plus size={14} />}
                  onClick={handleAddStop}
                  data-testid="gradient-add-stop"
                >
                  Thêm điểm màu
                </Button>
              </Group>
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

            {selectedStop && (
              <Paper withBorder p="xs" radius="sm" data-testid="gradient-selected-stop">
                <Stack gap="xs">
                  <Text size="xs" fw={600}>
                    Điểm màu đang chọn
                  </Text>
                  {renderTokenButton(selectedStop.token, () => {
                    if (selectedStopKey) {
                      setTokenPickTarget({ kind: 'gradient-stop', key: selectedStopKey })
                    }
                  }, 'gradient-stop-color-button')}
                  <Group grow align="flex-end" gap="xs">
                    <NumberInput
                      label="Vị trí %"
                      size="xs"
                      min={0}
                      max={100}
                      value={selectedStop.position}
                      onChange={(val) => {
                        const n = typeof val === 'number' ? val : Number(val)
                        if (!Number.isFinite(n) || !selectedStopKey) return
                        handleUpdateStopByKey(selectedStopKey, { position: clampPct(n) })
                      }}
                    />
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      leftSection={<Trash2 size={14} />}
                      disabled={gradient.stops.length <= 2}
                      onClick={handleRemoveSelectedStop}
                      data-testid="gradient-remove-stop"
                    >
                      Xóa
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}

        {!tokenPickTarget && activeTab === 'mesh' && (
          <Stack gap="xs" data-testid="mesh-editor">
            <Box
              ref={meshPreviewRef}
              data-testid="mesh-preview"
              style={{
                position: 'relative',
                height: 140,
                borderRadius: 6,
                backgroundImage: renderedMeshCss || 'none',
                backgroundColor: colorOfToken(swatches, 'background', '#ffffff'),
                border: '1px solid var(--zyvavu-border, #dfe5e2)',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
                touchAction: 'none',
                overflow: 'hidden',
              }}
            >
              {mesh.points.map((pt) => {
                const selected = pt.id === selectedMeshId
                const color = colorOfToken(swatches, pt.token)
                return (
                  <Box
                    key={pt.id}
                    component="button"
                    type="button"
                    data-testid={`mesh-point-handle-${pt.id}`}
                    aria-label={`Mesh point ${pt.id}`}
                    aria-pressed={selected}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      dragMeshIdRef.current = pt.id
                      setSelectedMeshId(pt.id)
                      ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedMeshId(pt.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: `${clampPct(pt.x)}%`,
                      top: `${clampPct(pt.y)}%`,
                      transform: 'translate(-50%, -50%)',
                      width: selected ? 18 : 14,
                      height: selected ? 18 : 14,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: selected
                        ? '2px solid var(--mantine-color-teal-7, #0e6b66)'
                        : '2px solid #ffffff',
                      boxShadow: selected
                        ? '0 0 0 2px rgba(14,107,102,0.35), 0 1px 3px rgba(0,0,0,0.4)'
                        : '0 1px 3px rgba(0,0,0,0.35)',
                      cursor: 'grab',
                      padding: 0,
                      zIndex: selected ? 2 : 1,
                    }}
                  />
                )
              })}
            </Box>

            <Group justify="space-between" align="center">
              <Text size="xs" fw={600} style={{ fontSize: 13 }}>
                Mesh Points ({mesh.points.length})
              </Text>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  leftSection={<RotateCcw size={13} />}
                  onClick={() => {
                    const next = DEFAULT_MESH
                    updateMesh(() => next)
                    setSelectedMeshId(next.points[0]?.id || '')
                  }}
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
                  data-testid="mesh-add-point"
                >
                  Thêm điểm
                </Button>
              </Group>
            </Group>

            {selectedMeshPoint && (
              <Paper withBorder p="xs" radius="sm" data-testid="mesh-selected-point">
                <Stack gap="xs">
                  <Text size="xs" fw={600}>
                    Điểm đang chọn
                  </Text>
                  {renderTokenButton(selectedMeshPoint.token, () => {
                    setTokenPickTarget({ kind: 'mesh-point', id: selectedMeshPoint.id })
                  }, 'mesh-point-color-button')}
                  <Group grow gap="xs">
                    <NumberInput
                      label="X %"
                      size="xs"
                      min={0}
                      max={100}
                      value={selectedMeshPoint.x}
                      onChange={(val) => {
                        const n = typeof val === 'number' ? val : Number(val)
                        if (!Number.isFinite(n)) return
                        handleUpdateMeshPoint(selectedMeshPoint.id, { x: clampPct(n) })
                      }}
                    />
                    <NumberInput
                      label="Y %"
                      size="xs"
                      min={0}
                      max={100}
                      value={selectedMeshPoint.y}
                      onChange={(val) => {
                        const n = typeof val === 'number' ? val : Number(val)
                        if (!Number.isFinite(n)) return
                        handleUpdateMeshPoint(selectedMeshPoint.id, { y: clampPct(n) })
                      }}
                    />
                    <NumberInput
                      label="Radius"
                      size="xs"
                      min={20}
                      max={100}
                      value={selectedMeshPoint.radius ?? 50}
                      onChange={(val) => {
                        const n = typeof val === 'number' ? val : Number(val)
                        if (!Number.isFinite(n)) return
                        handleUpdateMeshPoint(selectedMeshPoint.id, {
                          radius: Math.max(20, Math.min(100, Math.round(n))),
                        })
                      }}
                    />
                  </Group>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<Trash2 size={14} />}
                    disabled={mesh.points.length <= 2}
                    onClick={handleRemoveSelectedMeshPoint}
                    data-testid="mesh-remove-point"
                  >
                    Xóa
                  </Button>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Stack>
    </SharedDraggableModal>
  )
}
