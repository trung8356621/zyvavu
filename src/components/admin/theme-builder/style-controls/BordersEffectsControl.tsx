'use client'

import React from 'react'
import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
} from '@mantine/core'
import type {
  BorderConfig,
  EffectsConfig,
  RadiusConfig,
  ShadowConfig,
} from '@/lib/style-engine/types'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'

export interface BordersEffectsControlProps {
  border?: BorderConfig
  radius?: RadiusConfig
  shadow?: ShadowConfig
  effects?: EffectsConfig
  onChangeBorder: (border: BorderConfig) => void
  onChangeRadius: (radius: RadiusConfig) => void
  onChangeShadow: (shadow: ShadowConfig) => void
  onChangeEffects: (effects: EffectsConfig) => void
  onOpenColorModal: () => void
}

export function BordersEffectsControl({
  border = {},
  radius = {},
  shadow = {},
  effects = {},
  onChangeBorder,
  onChangeRadius,
  onChangeShadow,
  onChangeEffects,
  onOpenColorModal,
}: BordersEffectsControlProps) {
  const currentBorderColor = resolveColorToken(border.colorToken, '#dfe5e2')

  return (
    <Stack gap="xs">
      <Text size="xs" fw={700} c="dimmed" style={{ fontSize: 11 }}>
        Borders & Radius
      </Text>

      <Group grow gap="xs">
        <Select
          size="xs"
          label="Border Style"
          value={border.style || 'none'}
          onChange={(val) =>
            onChangeBorder({
              ...border,
              style: (val as any) || 'none',
            })
          }
          data={[
            { value: 'none', label: 'None' },
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ]}
        />

        <Select
          size="xs"
          label="Border Width"
          disabled={!border.style || border.style === 'none'}
          value={border.widthToken || 'thin'}
          onChange={(val) =>
            onChangeBorder({
              ...border,
              widthToken: val || 'thin',
            })
          }
          data={[
            { value: 'thin', label: 'Thin (1px)' },
            { value: 'medium', label: 'Medium (2px)' },
            { value: 'thick', label: 'Thick (4px)' },
          ]}
        />
      </Group>

      {border.style && border.style !== 'none' && (
        <Paper p={6} withBorder radius="xs">
          <Group justify="space-between" align="center">
            <Group gap={6}>
              <Box
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  backgroundColor: currentBorderColor,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              <Text size="xs" fw={500} style={{ fontSize: 11 }}>
                Border: {border.colorToken || 'border'}
              </Text>
            </Group>
            <Button size="xs" variant="subtle" color="teal" onClick={onOpenColorModal}>
              Change
            </Button>
          </Group>
        </Paper>
      )}

      <Select
        size="xs"
        label="Border Radius"
        value={radius.radiusToken || 'none'}
        onChange={(val) =>
          onChangeRadius({
            ...radius,
            radiusToken: val || 'none',
          })
        }
        data={[
          { value: 'none', label: 'None (0px)' },
          { value: 'sm', label: 'Small (sm)' },
          { value: 'md', label: 'Medium (md)' },
          { value: 'lg', label: 'Large (lg)' },
          { value: 'pill', label: 'Pill / Rounded' },
        ]}
      />

      <Divider my={2} />

      <Text size="xs" fw={700} c="dimmed" style={{ fontSize: 11 }}>
        Shadow & Effects
      </Text>

      <Select
        size="xs"
        label="Elevation / Shadow"
        value={shadow.shadowToken || 'none'}
        onChange={(val) =>
          onChangeShadow({
            ...shadow,
            shadowToken: val || 'none',
          })
        }
        data={[
          { value: 'none', label: 'None' },
          { value: 'shadowSoft', label: 'Soft Shadow (Subtle)' },
          { value: 'shadowMedium', label: 'Medium Shadow (Elevated)' },
          { value: 'shadowStrong', label: 'Strong Shadow (High)' },
        ]}
      />

      <Box>
        <Group justify="space-between" mb={2}>
          <Text size="xs" fw={500} style={{ fontSize: 11 }}>
            Opacity
          </Text>
          <Text size="xs" c="dimmed">
            {Math.round((effects.opacity ?? 1) * 100)}%
          </Text>
        </Group>
        <Slider
          size="xs"
          color="teal"
          min={10}
          max={100}
          value={Math.round((effects.opacity ?? 1) * 100)}
          onChange={(val) =>
            onChangeEffects({
              ...effects,
              opacity: val / 100,
            })
          }
        />
      </Box>

      <Select
        size="xs"
        label="Backdrop Blur"
        value={effects.backdropBlur || 'none'}
        onChange={(val) =>
          onChangeEffects({
            ...effects,
            backdropBlur: (val as any) || 'none',
          })
        }
        data={[
          { value: 'none', label: 'None' },
          { value: 'sm', label: 'Subtle Blur (4px)' },
          { value: 'md', label: 'Medium Blur (8px)' },
          { value: 'lg', label: 'Heavy Blur (16px)' },
        ]}
      />
    </Stack>
  )
}
