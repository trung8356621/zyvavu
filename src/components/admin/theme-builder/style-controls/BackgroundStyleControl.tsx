'use client'

import React, { useState } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  Film,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import type {
  BackgroundConfig,
  BackgroundMode,
  PatternPreset,
} from '@/lib/style-engine/types'
import {
  resolveColorToken,
  serializeGradientCss,
  serializeMeshCss,
  resolvePatternCss,
  resolvePatternSize,
} from '@/lib/style-engine/token-resolver'

export interface BackgroundStyleControlProps {
  value?: BackgroundConfig
  themeConfig?: ThemeConfig
  onChange: (val: BackgroundConfig) => void
  onOpenColorModal: (target: 'background' | 'overlay' | 'fallback') => void
}

const POSITION_3X3 = [
  { label: 'TL', value: 'top left' },
  { label: 'TC', value: 'top center' },
  { label: 'TR', value: 'top right' },
  { label: 'CL', value: 'center left' },
  { label: 'CC', value: 'center center' },
  { label: 'CR', value: 'center right' },
  { label: 'BL', value: 'bottom left' },
  { label: 'BC', value: 'bottom center' },
  { label: 'BR', value: 'bottom right' },
]

export function BackgroundStyleControl({
  value = { mode: 'color', colorToken: 'surface' },
  themeConfig,
  onChange,
  onOpenColorModal,
}: BackgroundStyleControlProps) {
  const mode = value.mode || 'color'
  const [showImageSettings, setShowImageSettings] = useState<boolean>(true)
  const [showVideoSettings, setShowVideoSettings] = useState<boolean>(true)

  const update = (partial: Partial<BackgroundConfig>) => {
    onChange({
      ...value,
      ...partial,
    })
  }

  const currentColorToken = value.colorToken || 'surface'
  const currentBgColor = resolveColorToken(currentColorToken, '#ffffff')

  const fallbackColorToken =
    mode === 'image'
      ? value.image?.fallbackColorToken || 'surface'
      : mode === 'video'
        ? value.video?.fallbackColorToken || 'surface'
        : 'surface'
  const fallbackColor = resolveColorToken(fallbackColorToken, '#ffffff')

  const overlayColorToken =
    mode === 'image'
      ? value.image?.overlay?.colorToken || 'text'
      : mode === 'video'
        ? value.video?.overlay?.colorToken || 'text'
        : 'text'

  const overlayColor = resolveColorToken(overlayColorToken, '#000000')
  const overlayOpacity =
    mode === 'image'
      ? value.image?.overlay?.opacity ?? 0.5
      : mode === 'video'
        ? value.video?.overlay?.opacity ?? 0.5
        : 0

  const hasOverlay =
    mode === 'image'
      ? Boolean(value.image?.overlay?.colorToken || value.image?.overlay?.opacity !== undefined)
      : mode === 'video'
        ? Boolean(value.video?.overlay?.colorToken || value.video?.overlay?.opacity !== undefined)
        : false

  const patternPreset = value.image?.pattern?.preset || 'none'
  const hasPattern = mode === 'image' && patternPreset !== 'none'
  const patternOpacity = value.image?.pattern?.opacity ?? 0.15

  const gradientCss = value.gradient ? serializeGradientCss(value.gradient) : undefined
  const meshCss = value.mesh ? serializeMeshCss(value.mesh) : undefined
  const patternCss = hasPattern ? resolvePatternCss(patternPreset) : undefined
  const patternSize = hasPattern ? resolvePatternSize(patternPreset) : undefined

  const handleConfigureClick = () => {
    if (mode === 'color') {
      onOpenColorModal('background')
    } else if (mode === 'image') {
      setShowImageSettings((prev) => !prev)
    } else if (mode === 'video') {
      setShowVideoSettings((prev) => !prev)
    }
  }

  return (
    <Stack gap="sm">
      {/* 0. PROMINENT BACKGROUND VISUAL PREVIEW (Wix-inspired) */}
      <Box
        style={{
          width: '100%',
          height: 115,
          borderRadius: 8,
          border: '1px solid var(--mantine-color-default-border, #dfe5e2)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden',
          // Transparent checkerboard underlay
          background: 'repeating-conic-gradient(#edf2f0 0% 25%, #ffffff 0% 50%) 50% / 14px 14px',
        }}
      >
        {/* Layer 1: Base Color / Gradient / Mesh / Fallback */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundColor:
              mode === 'color'
                ? (!meshCss && !gradientCss ? currentBgColor : undefined)
                : fallbackColor,
            backgroundImage:
              mode === 'color'
                ? (meshCss || gradientCss || undefined)
                : undefined,
          }}
        />

        {/* Layer 2: Image Media or Video Poster */}
        {mode === 'image' && value.image?.url && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              backgroundImage: `url("${value.image.url}")`,
              backgroundPosition: value.image.position || 'center center',
              backgroundSize: value.image.size || 'cover',
              backgroundRepeat: value.image.repeat || 'no-repeat',
            }}
          />
        )}

        {mode === 'video' && (value.video?.posterUrl || value.video?.fallbackImageUrl) && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              backgroundImage: `url("${value.video.posterUrl || value.video.fallbackImageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
            }}
          />
        )}

        {/* Layer 3: Overlay */}
        {hasOverlay && (mode === 'image' || mode === 'video') && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              backgroundColor: overlayColor,
              opacity: overlayOpacity,
            }}
          />
        )}

        {/* Layer 4: Pattern */}
        {hasPattern && patternCss && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              backgroundImage: patternCss,
              backgroundSize: patternSize || 'auto',
              opacity: patternOpacity,
            }}
          />
        )}

        {/* Layer 5: Preview Header Bar & Configure Action */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          {/* Top Info Badges */}
          <Group justify="space-between" align="flex-start" gap={6} style={{ width: '100%' }}>
            <Badge
              size="sm"
              variant="filled"
              color="dark"
              style={{
                textTransform: 'none',
                backdropFilter: 'blur(4px)',
                backgroundColor: 'rgba(23, 32, 31, 0.82)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {mode === 'color'
                ? value.mesh
                  ? `Mesh (${value.mesh.points?.length || 0} pts)`
                  : value.gradient
                    ? `Gradient (${value.gradient.type})`
                    : `Color: ${currentColorToken}`
                : mode === 'image'
                  ? value.image?.url
                    ? `Image: ${value.image.size || 'cover'}`
                    : 'No media selected'
                  : value.video?.url
                    ? 'Video backdrop'
                    : 'No video selected'}
            </Badge>

            <Group gap={4}>
              {hasOverlay && (mode === 'image' || mode === 'video') && (
                <Badge
                  size="xs"
                  variant="filled"
                  color="gray"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    color: '#17201f',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Overlay {Math.round(overlayOpacity * 100)}%
                </Badge>
              )}
              {hasPattern && (
                <Badge
                  size="xs"
                  variant="filled"
                  color="teal"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Pattern: {patternPreset}
                </Badge>
              )}
            </Group>
          </Group>

          {/* Bottom Action: Prominent Configure / Thiết lập button */}
          <Group justify="flex-end" style={{ width: '100%', pointerEvents: 'auto' }}>
            <Button
              size="xs"
              color="teal"
              variant="filled"
              leftSection={<Settings size={13} />}
              onClick={handleConfigureClick}
              style={{
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Configure / Thiết lập
            </Button>
          </Group>
        </Box>
      </Box>

      {/* Mode Switcher */}
      <SegmentedControl
        size="sm"
        fullWidth
        value={mode}
        onChange={(val) => update({ mode: val as BackgroundMode })}
        data={[
          { label: 'Color', value: 'color' },
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
        ]}
      />

      {/* 1. COLOR MODE */}
      {mode === 'color' && (
        <Stack gap="xs">
          <Text size="xs" fw={600} style={{ fontSize: 13, color: 'var(--mantine-color-text, #17201f)' }}>
            Theme Color / Gradient / Mesh
          </Text>

          <Paper p="xs" withBorder radius="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Box
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: !value.mesh && !value.gradient ? currentBgColor : undefined,
                    backgroundImage: meshCss || gradientCss || undefined,
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Box>
                  <Text size="sm" fw={600}>
                    {value.mesh ? 'Mesh Gradient' : value.gradient ? 'Theme Gradient' : currentColorToken}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                    {value.mesh
                      ? `${value.mesh.points?.length || 0} color points`
                      : value.gradient
                        ? `${value.gradient.type} gradient (${value.gradient.stops?.length || 0} stops)`
                        : 'Solid theme color'}
                  </Text>
                </Box>
              </Group>

              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<Palette size={14} />}
                onClick={() => onOpenColorModal('background')}
              >
                Change Palette
              </Button>
            </Group>
          </Paper>
        </Stack>
      )}

      {/* 2. IMAGE MODE */}
      {mode === 'image' && (
        <Stack gap="xs">
          <TextInput
            size="sm"
            label="Image URL or Media Path"
            placeholder="https://... or /media/..."
            value={value.image?.url || ''}
            onChange={(e) =>
              update({
                image: {
                  ...value.image,
                  url: e.currentTarget.value,
                },
              })
            }
          />

          {value.image?.url && (
            <Group justify="flex-end">
              <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<Trash2 size={13} />}
                onClick={() =>
                  update({
                    image: {
                      ...value.image,
                      url: '',
                    },
                  })
                }
              >
                Remove Image
              </Button>
            </Group>
          )}

          {/* Fallback Color Selection */}
          <Paper p="xs" withBorder radius="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    backgroundColor: fallbackColor,
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Box>
                  <Text size="xs" fw={600} style={{ fontSize: 12 }}>
                    Fallback Color
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                    {fallbackColorToken}
                  </Text>
                </Box>
              </Group>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<Palette size={13} />}
                onClick={() => onOpenColorModal('fallback')}
              >
                Change
              </Button>
            </Group>
          </Paper>

          {/* 3x3 Position Selector */}
          <Box>
            <Text size="xs" fw={600} mb={6} style={{ fontSize: 12, color: 'var(--mantine-color-text, #17201f)' }}>
              Focal Position (3x3 Grid)
            </Text>
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 5,
                width: 140,
              }}
            >
              {POSITION_3X3.map((pos) => {
                const isSelected = (value.image?.position || 'center center') === pos.value
                return (
                  <Button
                    key={pos.value}
                    size="compact-xs"
                    variant={isSelected ? 'filled' : 'default'}
                    color={isSelected ? 'teal' : 'gray'}
                    style={{ fontSize: 11, fontWeight: 600, padding: '2px 0', height: 28 }}
                    onClick={() =>
                      update({
                        image: {
                          ...value.image,
                          position: pos.value,
                        },
                      })
                    }
                  >
                    {pos.label}
                  </Button>
                )
              })}
            </Box>
          </Box>

          <Group grow gap="xs">
            <Select
              size="sm"
              label="Size"
              value={value.image?.size || 'cover'}
              onChange={(val) =>
                update({
                  image: {
                    ...value.image,
                    size: (val as 'cover' | 'contain' | 'auto') || 'cover',
                  },
                })
              }
              data={[
                { value: 'cover', label: 'Cover (Fill)' },
                { value: 'contain', label: 'Contain (Fit)' },
                { value: 'auto', label: 'Auto (Original)' },
              ]}
            />

            <Select
              size="sm"
              label="Repeat"
              value={value.image?.repeat || 'no-repeat'}
              onChange={(val) =>
                update({
                  image: {
                    ...value.image,
                    repeat: (val as any) || 'no-repeat',
                  },
                })
              }
              data={[
                { value: 'no-repeat', label: 'No Repeat' },
                { value: 'repeat', label: 'Repeat XY' },
                { value: 'repeat-x', label: 'Repeat Horizontal' },
                { value: 'repeat-y', label: 'Repeat Vertical' },
              ]}
            />
          </Group>

          <Divider my={2} />

          {/* Overlay Settings */}
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" fw={600} style={{ fontSize: 12, color: 'var(--mantine-color-text, #17201f)' }}>
                Overlay Color & Opacity
              </Text>
              <Button
                size="xs"
                variant="subtle"
                color="teal"
                onClick={() => onOpenColorModal('overlay')}
              >
                Change Color
              </Button>
            </Group>

            <Group gap="xs">
              <Box
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  backgroundColor: overlayColor,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              <Box style={{ flex: 1 }}>
                <Slider
                  size="sm"
                  color="teal"
                  min={0}
                  max={100}
                  value={Math.round((value.image?.overlay?.opacity ?? 0.5) * 100)}
                  onChange={(val) =>
                    update({
                      image: {
                        ...value.image,
                        overlay: {
                          ...value.image?.overlay,
                          colorToken: overlayColorToken,
                          opacity: val / 100,
                        },
                      },
                    })
                  }
                />
              </Box>
              <Text size="xs" c="dimmed" style={{ width: 34, textAlign: 'right', fontSize: 12 }}>
                {Math.round((value.image?.overlay?.opacity ?? 0.5) * 100)}%
              </Text>
            </Group>
          </Box>

          {/* Pattern Presets */}
          <Group grow gap="xs">
            <Select
              size="sm"
              label="CSS Pattern Preset"
              value={value.image?.pattern?.preset || 'none'}
              onChange={(val) =>
                update({
                  image: {
                    ...value.image,
                    pattern: {
                      ...value.image?.pattern,
                      preset: (val as PatternPreset) || 'none',
                    },
                  },
                })
              }
              data={[
                { value: 'none', label: 'None' },
                { value: 'dots', label: 'Subtle Dots' },
                { value: 'grid', label: 'Fine Grid' },
                { value: 'diagonal', label: 'Diagonal Lines' },
                { value: 'stripes', label: 'Horizontal Stripes' },
                { value: 'noise', label: 'Subtle Noise' },
              ]}
            />

            {value.image?.pattern?.preset && value.image.pattern.preset !== 'none' && (
              <Box>
                <Text size="xs" fw={500} mb={2} style={{ fontSize: 12 }}>
                  Pattern Opacity
                </Text>
                <Slider
                  size="sm"
                  color="teal"
                  min={0}
                  max={100}
                  value={Math.round((value.image?.pattern?.opacity ?? 0.15) * 100)}
                  onChange={(val) =>
                    update({
                      image: {
                        ...value.image,
                        pattern: {
                          ...value.image?.pattern,
                          opacity: val / 100,
                        },
                      },
                    })
                  }
                />
              </Box>
            )}
          </Group>
        </Stack>
      )}

      {/* 3. VIDEO MODE */}
      {mode === 'video' && (
        <Stack gap="xs">
          <TextInput
            size="sm"
            label="Video URL (MP4 / WebM)"
            placeholder="https://.../video.mp4"
            value={value.video?.url || ''}
            onChange={(e) =>
              update({
                video: {
                  ...value.video,
                  url: e.currentTarget.value,
                },
              })
            }
          />

          <TextInput
            size="sm"
            label="Poster Image URL (Preload & Mobile fallback)"
            placeholder="https://.../poster.jpg"
            value={value.video?.posterUrl || ''}
            onChange={(e) =>
              update({
                video: {
                  ...value.video,
                  posterUrl: e.currentTarget.value,
                },
              })
            }
          />

          <Paper p="xs" withBorder radius="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0, #f8f9fa)' }}>
            <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
              Videos autoplay muted with loop enabled and automatically fall back to poster image when reduced-motion is requested.
            </Text>
          </Paper>

          {/* Fallback Color Selection */}
          <Paper p="xs" withBorder radius="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    backgroundColor: fallbackColor,
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Box>
                  <Text size="xs" fw={600} style={{ fontSize: 12 }}>
                    Fallback Color
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                    {fallbackColorToken}
                  </Text>
                </Box>
              </Group>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<Palette size={13} />}
                onClick={() => onOpenColorModal('fallback')}
              >
                Change
              </Button>
            </Group>
          </Paper>

          <Switch
            size="sm"
            color="teal"
            label="Loop Video"
            checked={value.video?.loop !== false}
            onChange={(e) =>
              update({
                video: {
                  ...value.video,
                  loop: e.currentTarget.checked,
                },
              })
            }
          />

          {/* Video Overlay */}
          <Box>
            <Group justify="space-between" mb={2}>
              <Text size="xs" fw={600} style={{ fontSize: 12, color: 'var(--mantine-color-text, #17201f)' }}>
                Video Overlay Opacity
              </Text>
              <Button
                size="xs"
                variant="subtle"
                color="teal"
                onClick={() => onOpenColorModal('overlay')}
              >
                Change Color
              </Button>
            </Group>

            <Group gap="xs">
              <Box
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  backgroundColor: overlayColor,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              <Box style={{ flex: 1 }}>
                <Slider
                  size="sm"
                  color="teal"
                  min={0}
                  max={100}
                  value={Math.round((value.video?.overlay?.opacity ?? 0.5) * 100)}
                  onChange={(val) =>
                    update({
                      video: {
                        ...value.video,
                        overlay: {
                          ...value.video?.overlay,
                          colorToken: overlayColorToken,
                          opacity: val / 100,
                        },
                      },
                    })
                  }
                />
              </Box>
              <Text size="xs" c="dimmed" style={{ width: 34, textAlign: 'right', fontSize: 12 }}>
                {Math.round((value.video?.overlay?.opacity ?? 0.5) * 100)}%
              </Text>
            </Group>
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
