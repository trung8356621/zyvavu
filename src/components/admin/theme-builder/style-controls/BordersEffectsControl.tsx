'use client'

import React, { useState } from 'react'
import {
  Accordion,
  Box,
  Button,
  Group,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
  Switch,
} from '@mantine/core'
import type { StyleDomainGroup } from '@/lib/style-engine/domains'
import { STYLE_DEFAULTS } from '@/lib/style-engine/effective-defaults'
import type {
  BorderConfig,
  EffectsConfig,
  RadiusConfig,
  ShadowConfig,
} from '@/lib/style-engine/types'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'
import {
  BLUR_SCALE_LABELS,
  BORDER_WIDTH_LABELS,
  colorTokenLabel,
  RADIUS_SCALE_LABELS,
} from '@/lib/style-engine/semantic-preset-labels'
import type { ThemeConfig } from '@/lib/theme-engine/types'

export interface BordersEffectsControlProps {
  domain?: 'all' | 'borders' | 'shadow' | 'effects'
  themeConfig?: ThemeConfig
  border?: BorderConfig
  radius?: RadiusConfig
  shadow?: ShadowConfig
  effects?: EffectsConfig
  onChangeBorder: (border: BorderConfig) => void
  onChangeRadius: (radius: RadiusConfig) => void
  onChangeShadow: (shadow: ShadowConfig) => void
  onChangeEffects: (effects: EffectsConfig) => void
  onOpenColorModal: (anchor?: HTMLElement | null, side?: 'top' | 'right' | 'bottom' | 'left') => void
  onResetGroup?: (group: StyleDomainGroup) => void
}

export function BordersEffectsControl({
  domain = 'all',
  themeConfig,
  border = {},
  radius = {},
  shadow = {},
  effects = {},
  onChangeBorder,
  onChangeRadius,
  onChangeShadow,
  onChangeEffects,
  onOpenColorModal,
  onResetGroup,
}: BordersEffectsControlProps) {
  const currentBorderColor = resolveColorToken(border.colorToken, '#dfe5e2')
  const activeBorder = Boolean(border.style && border.style !== 'none')
  const [opened, setOpened] = useState<string[]>(['border', 'radius'])

  return (
    <Stack gap="xs">
      {(domain === 'all' || domain === 'borders') && (
        <Accordion
          multiple
          value={opened}
          onChange={setOpened}
          variant="separated"
          chevronPosition="left"
        >
          <Accordion.Item value="border">
            <Accordion.Control>
              <Text size="sm" fw={600}>
                Border
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {onResetGroup && (
                  <Group justify="flex-end">
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      aria-label="Reset Border"
                      onClick={() => onResetGroup('border')}
                    >
                      Reset group
                    </Button>
                  </Group>
                )}
                <Group grow gap="xs">
                  <Select
                    size="sm"
                    label="Border Style"
                    clearable={Boolean(border.style)}
                    value={border.style || 'none'}
                    onChange={(val) =>
                      onChangeBorder({
                        ...border,
                        style: (val as BorderConfig['style']) || undefined,
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
                    size="sm"
                    label="Border Width"
                    clearable={Boolean(border.widthToken)}
                    disabled={!activeBorder}
                    value={activeBorder ? border.widthToken || STYLE_DEFAULTS.activeBorderWidth : 'none'}
                    onChange={(val) =>
                      onChangeBorder({
                        ...border,
                        widthToken: val || undefined,
                      })
                    }
                    data={['none', 'thin', 'medium', 'thick'].map((value) => ({
                      value,
                      label: value === 'none' ? '0 px' : BORDER_WIDTH_LABELS[value],
                      disabled: value === 'none',
                    }))}
                  />
                </Group>

                <Switch
                  label="Link border sides"
                  checked={border.linked !== false}
                  onChange={(event) => {
                    const linked = event.currentTarget.checked
                    if (linked) {
                      // Keep per-side values in data; serializer ignores them while linked.
                      onChangeBorder({ ...border, linked: true })
                      return
                    }
                    onChangeBorder({ ...border, linked: false })
                  }}
                />
                {border.linked === false &&
                  (['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    const value = border.sides?.[side] || {}
                    const hasSide = Boolean(value.style || value.widthToken || value.colorToken)
                    const baseApplies = !border.side || border.side === 'all' || border.side === side
                    const effectiveSideStyle = hasSide ? value.style || 'solid' : baseApplies ? border.style || 'none' : 'none'
                    const update = (partial: Partial<BorderConfig>) =>
                      onChangeBorder({
                        ...border,
                        sides: { ...border.sides, [side]: { ...value, ...partial } },
                      })
                    return (
                      <Group key={side} grow align="flex-end">
                        <Select
                          label={`${side} style`}
                          clearable={Boolean(value.style)}
                          value={effectiveSideStyle}
                          data={[
                            { value: 'none', label: 'None' },
                            { value: 'solid', label: 'Solid' },
                            { value: 'dashed', label: 'Dashed' },
                            { value: 'dotted', label: 'Dotted' },
                          ]}
                          onChange={(style) =>
                            update({ style: (style as BorderConfig['style']) || undefined })
                          }
                        />
                        <Select
                          label={`${side} width`}
                          clearable={Boolean(value.widthToken)}
                          value={effectiveSideStyle === 'none' ? 'none' : (hasSide ? value.widthToken : border.widthToken) || STYLE_DEFAULTS.activeBorderWidth}
                          data={['none', 'thin', 'medium', 'thick'].map((token) => ({
                            value: token,
                            label: token === 'none' ? '0 px' : BORDER_WIDTH_LABELS[token],
                            disabled: token === 'none',
                          }))}
                          onChange={(widthToken) => update({ widthToken: widthToken || undefined })}
                        />
                        <Stack gap={4}>
                          <Button
                            size="compact-sm"
                            variant="light"
                            aria-label={`Change ${side} border color`}
                            onClick={(event) => onOpenColorModal(event.currentTarget, side)}
                          >
                            {value.colorToken
                              ? colorTokenLabel(value.colorToken)
                              : effectiveSideStyle === 'none'
                                ? 'None'
                                : hasSide ? 'Current color' : colorTokenLabel(border.colorToken || 'border')}
                          </Button>
                          {value.colorToken && (
                            <Button size="compact-xs" variant="subtle" onClick={() => update({ colorToken: undefined })}>
                              Reset color
                            </Button>
                          )}
                        </Stack>
                      </Group>
                    )
                  })}

                {border.style && border.style !== 'none' && (
                  <Paper p="xs" withBorder radius="xs">
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <Box
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            backgroundColor: currentBorderColor,
                            border: '1px solid rgba(0,0,0,0.2)',
                          }}
                        />
                        <Text size="xs" fw={600} style={{ fontSize: 12 }}>
                          Border: {border.colorToken || 'border'}
                        </Text>
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        color="teal"
                        onClick={(event) => onOpenColorModal(event.currentTarget)}
                      >
                        Change
                      </Button>
                    </Group>
                  </Paper>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="radius">
            <Accordion.Control>
              <Text size="sm" fw={600}>
                Radius
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {onResetGroup && (
                  <Group justify="flex-end">
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      aria-label="Reset Radius"
                      onClick={() => onResetGroup('radius')}
                    >
                      Reset group
                    </Button>
                  </Group>
                )}
                <Select
                  size="sm"
                  label="Border Radius"
                  clearable={Boolean(radius.radiusToken)}
                  value={radius.radiusToken || 'none'}
                  onChange={(val) =>
                    onChangeRadius({
                      ...radius,
                      radiusToken: val || undefined,
                    })
                  }
                  data={['none', 'sm', 'md', 'lg', 'pill'].map((value) => ({
                    value,
                    label: RADIUS_SCALE_LABELS[value],
                  }))}
                />
                <Switch
                  label="Link radius corners"
                  checked={radius.linked !== false}
                  onChange={(event) => {
                    const linked = event.currentTarget.checked
                    if (linked) {
                      // Preserve asymmetric corners for undo / unlink; serializer uses radiusToken while linked.
                      onChangeRadius({ ...radius, linked: true })
                      return
                    }
                    onChangeRadius({ ...radius, linked: false })
                  }}
                />
                {radius.linked === false &&
                  (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((corner) => {
                    const labels: Record<string, string> = {
                      topLeft: 'Top left',
                      topRight: 'Top right',
                      bottomRight: 'Bottom right',
                      bottomLeft: 'Bottom left',
                    }
                    const radiusKeys = Array.from(
                      new Set([
                        'none',
                        'sm',
                        'md',
                        'lg',
                        'pill',
                        ...Object.keys(themeConfig?.tokens.radius || {}),
                      ]),
                    )
                    return (
                      <Select
                        key={corner}
                        label={labels[corner]}
                        clearable={Boolean(radius.corners?.[corner])}
                        value={radius.corners?.[corner] || radius.radiusToken || STYLE_DEFAULTS.radius}
                        data={radiusKeys.map((value) => ({
                          value,
                          label: RADIUS_SCALE_LABELS[value] || value,
                        }))}
                        onChange={(value) => {
                          const nextCorners = { ...(radius.corners || {}) }
                          if (value) nextCorners[corner] = value
                          else delete nextCorners[corner]
                          onChangeRadius({
                            ...radius,
                            corners: Object.keys(nextCorners).length ? nextCorners : undefined,
                          })
                        }}
                      />
                    )
                  })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
      {(domain === 'all' || domain === 'shadow') && (
        <>
          <Text size="sm" fw={700}>
            Shadow
          </Text>

          <Select
            size="sm"
            label="Elevation / Shadow"
            value={shadow.shadowToken || 'none'}
            onChange={(val) =>
              onChangeShadow({
                ...shadow,
                shadowToken: val || 'none',
                layers: undefined,
              })
            }
            data={[
              { value: 'none', label: 'None' },
              { value: 'shadowSoft', label: 'Soft' },
              { value: 'shadowMedium', label: 'Medium' },
              { value: 'shadowStrong', label: 'Strong' },
            ]}
          />
          <Button
            variant="default"
            disabled={(shadow.layers?.length || 0) >= 4}
            onClick={() =>
              onChangeShadow({
                ...shadow,
                shadowToken: undefined,
                layers: [...(shadow.layers || []), 'shadowSoft'],
              })
            }
          >
            Add shadow layer
          </Button>
          {shadow.layers?.map((layer, index) => (
            <Group key={index} grow>
              <Select
                label={`Shadow layer ${index + 1}`}
                value={layer}
                data={['shadowSoft', 'shadowMedium', 'shadowStrong']}
                onChange={(value) =>
                  onChangeShadow({
                    ...shadow,
                    layers: shadow.layers?.map((token, i) =>
                      i === index ? value || token : token,
                    ),
                  })
                }
              />
              <Button
                variant="subtle"
                onClick={() =>
                  onChangeShadow({
                    ...shadow,
                    layers: shadow.layers?.filter((_, i) => i !== index),
                  })
                }
              >
                Remove layer {index + 1}
              </Button>
            </Group>
          ))}
        </>
      )}
      {(domain === 'all' || domain === 'effects') && (
        <>
          <Box>
            <Group justify="space-between" mb={2}>
              <Text
                size="xs"
                fw={600}
                style={{ fontSize: 12, color: 'var(--mantine-color-text, #17201f)' }}
              >
                Opacity
              </Text>
              <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                {Math.round((effects.opacity ?? 1) * 100)}%
              </Text>
            </Group>
            <Slider
              size="sm"
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
            size="sm"
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
              ...(['sm', 'md', 'lg'] as const).map((value) => ({
                value,
                label: BLUR_SCALE_LABELS[value],
              })),
            ]}
          />
        </>
      )}
    </Stack>
  )
}
