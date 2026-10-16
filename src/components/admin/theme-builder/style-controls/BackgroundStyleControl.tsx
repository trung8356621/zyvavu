'use client'

import React from 'react'
import {
  ActionIcon,
  Box,
  Button,
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
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import type {
  BackgroundConfig,
  BackgroundMode,
  PatternPreset,
} from '@/lib/style-engine/types'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'

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

  const update = (partial: Partial<BackgroundConfig>) => {
    onChange({
      ...value,
      ...partial,
    })
  }

  const currentColorToken = value.colorToken || 'surface'
  const currentBgColor = resolveColorToken(currentColorToken, '#ffffff')

  const overlayColorToken =
    mode === 'image'
      ? value.image?.overlay?.colorToken || 'text'
      : mode === 'video'
        ? value.video?.overlay?.colorToken || 'text'
        : 'text'

  const overlayColor = resolveColorToken(overlayColorToken, '#000000')

  return (
    <Stack gap="xs">
      {/* Mode Switcher */}
      <SegmentedControl
        size="xs"
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
          <Text size="xs" fw={600} style={{ fontSize: 11 }}>
            Theme Color / Gradient / Mesh
          </Text>

          <Paper p="xs" withBorder radius="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    backgroundColor: currentBgColor,
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Box>
                  <Text size="xs" fw={600}>
                    {value.mesh ? 'Mesh Gradient' : value.gradient ? 'Theme Gradient' : currentColorToken}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    {value.mesh
                      ? `${value.mesh.points?.length || 0} color points`
                      : value.gradient
                        ? `${value.gradient.type} gradient`
                        : 'Solid theme color'}
                  </Text>
                </Box>
              </Group>

              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<Palette size={12} />}
                onClick={() => onOpenColorModal('background')}
              >
                Configure
              </Button>
            </Group>
          </Paper>
        </Stack>
      )}

      {/* 2. IMAGE MODE */}
      {mode === 'image' && (
        <Stack gap="xs">
          <TextInput
            size="xs"
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
                leftSection={<Trash2 size={12} />}
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

          {/* 3x3 Position Selector */}
          <Box>
            <Text size="xs" fw={500} mb={4} style={{ fontSize: 11 }}>
              Focal Position (3x3 Grid)
            </Text>
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
                width: 120,
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
                    style={{ fontSize: 9, padding: '2px 0', height: 24 }}
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
              size="xs"
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
              size="xs"
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
            <Group justify="space-between" mb={2}>
              <Text size="xs" fw={600} style={{ fontSize: 11 }}>
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
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  backgroundColor: overlayColor,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              <Box style={{ flex: 1 }}>
                <Slider
                  size="xs"
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
              <Text size="xs" c="dimmed" style={{ width: 32, textAlign: 'right' }}>
                {Math.round((value.image?.overlay?.opacity ?? 0.5) * 100)}%
              </Text>
            </Group>
          </Box>

          {/* Pattern Presets */}
          <Group grow gap="xs">
            <Select
              size="xs"
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
                <Text size="xs" fw={500} mb={2} style={{ fontSize: 11 }}>
                  Pattern Opacity
                </Text>
                <Slider
                  size="xs"
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
            size="xs"
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
            size="xs"
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
            <Text size="xs" c="dimmed">
              Videos autoplay muted with loop enabled and automatically fall back to poster image when reduced-motion is requested.
            </Text>
          </Paper>

          <Switch
            size="xs"
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
              <Text size="xs" fw={600} style={{ fontSize: 11 }}>
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
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  backgroundColor: overlayColor,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              <Box style={{ flex: 1 }}>
                <Slider
                  size="xs"
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
              <Text size="xs" c="dimmed" style={{ width: 32, textAlign: 'right' }}>
                {Math.round((value.video?.overlay?.opacity ?? 0.5) * 100)}%
              </Text>
            </Group>
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
