'use client'

import React, { useMemo } from 'react'
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
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import type {
  LetterSpacingPreset,
  LineHeightPreset,
  TextAlign,
  TextEffectPreset,
  TypographyStyleConfig,
} from '@/lib/style-engine/types'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'

export interface TypographyStyleControlProps {
  value?: TypographyStyleConfig
  themeConfig?: ThemeConfig
  onChange: (val: TypographyStyleConfig) => void
  onOpenColorModal: () => void
}

export function TypographyStyleControl({
  value = {},
  themeConfig,
  onChange,
  onOpenColorModal,
}: TypographyStyleControlProps) {
  // Discover typography presets from theme tokens
  const typographyPresets = useMemo(() => {
    const typo = (themeConfig?.tokens?.typography || {}) as Record<string, any>
    const knownKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3']
    const keys = Array.from(
      new Set([
        ...knownKeys,
        ...Object.keys(typo).filter((k) => typeof typo[k] === 'object' && typo[k]?.size),
      ]),
    )

    return keys.map((k) => ({
      value: k,
      label: k.toUpperCase().startsWith('H')
        ? `${k.toUpperCase()} (Heading ${k.slice(1)})`
        : `${k.toUpperCase()} (Body ${k.slice(1)})`,
    }))
  }, [themeConfig])

  const currentColorToken = value.colorToken || 'text'
  const currentTextColor = resolveColorToken(currentColorToken, '#17201f')

  const update = (partial: Partial<TypographyStyleConfig>) => {
    onChange({
      ...value,
      ...partial,
    })
  }

  const handleReset = () => {
    onChange({
      typography: 'h1',
      colorToken: 'text',
      align: 'left',
      effectPreset: 'none',
      letterSpacing: 'normal',
      lineHeight: 'normal',
      verticalText: false,
    })
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text size="xs" fw={700} c="dimmed" style={{ fontSize: 11 }}>
          Typography & Text Style
        </Text>
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<RotateCcw size={12} />}
          onClick={handleReset}
        >
          Reset
        </Button>
      </Group>

      {/* Preset Selector */}
      <Select
        size="xs"
        label="Theme Typography Preset"
        placeholder="Select preset"
        value={value.typography || 'h1'}
        onChange={(val) => update({ typography: val || undefined })}
        data={typographyPresets}
      />

      {/* Color Token Selector */}
      <Box>
        <Text size="xs" fw={500} mb={4} style={{ fontSize: 11 }}>
          Color Token
        </Text>
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
            <Button size="xs" variant="subtle" color="teal" onClick={onOpenColorModal}>
              Change
            </Button>
          </Group>
        </Paper>
      </Box>

      {/* Text Alignment */}
      <Box>
        <Text size="xs" fw={500} mb={4} style={{ fontSize: 11 }}>
          Alignment
        </Text>
        <SegmentedControl
          size="xs"
          fullWidth
          value={value.align || 'left'}
          onChange={(val) => update({ align: val as TextAlign })}
          data={[
            { label: <AlignLeft size={13} />, value: 'left' },
            { label: <AlignCenter size={13} />, value: 'center' },
            { label: <AlignRight size={13} />, value: 'right' },
            { label: <AlignJustify size={13} />, value: 'justify' },
          ]}
        />
      </Box>

      {/* Text Effects */}
      <Select
        size="xs"
        label="Text Effect"
        placeholder="Select effect"
        value={value.effectPreset || 'none'}
        onChange={(val) => update({ effectPreset: (val as TextEffectPreset) || 'none' })}
        data={[
          { value: 'none', label: 'None' },
          { value: 'shadow-soft', label: 'Soft Shadow' },
          { value: 'shadow-hard', label: 'Hard Shadow' },
          { value: 'outline', label: 'Outline' },
          { value: 'glow', label: 'Neon Glow' },
          { value: 'subtle-depth', label: 'Subtle Depth' },
        ]}
      />

      <Divider my={2} />

      {/* Spacing & Line Height */}
      <Group grow gap="xs">
        <Select
          size="xs"
          label="Letter Spacing"
          value={value.letterSpacing || 'normal'}
          onChange={(val) => update({ letterSpacing: (val as LetterSpacingPreset) || 'normal' })}
          data={[
            { value: 'tighter', label: 'Tighter (-0.05em)' },
            { value: 'tight', label: 'Tight (-0.025em)' },
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Wide (+0.05em)' },
            { value: 'wider', label: 'Wider (+0.1em)' },
          ]}
        />

        <Select
          size="xs"
          label="Line Spacing"
          value={value.lineHeight || 'normal'}
          onChange={(val) => update({ lineHeight: (val as LineHeightPreset) || 'normal' })}
          data={[
            { value: 'compact', label: 'Compact (1.2)' },
            { value: 'normal', label: 'Normal (1.5)' },
            { value: 'relaxed', label: 'Relaxed (1.75)' },
            { value: 'loose', label: 'Loose (2.0)' },
          ]}
        />
      </Group>

      {/* Vertical Text */}
      <Switch
        size="xs"
        color="teal"
        label="Vertical Text (vertical-rl)"
        checked={value.verticalText || false}
        onChange={(e) => update({ verticalText: e.currentTarget.checked })}
      />
    </Stack>
  )
}
