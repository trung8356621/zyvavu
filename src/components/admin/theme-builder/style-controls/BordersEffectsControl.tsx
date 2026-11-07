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
  onOpenColorModal: (anchor?: HTMLElement | null) => void
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
                    size="sm"
                    label="Border Width"
                    disabled={!border.style || border.style === 'none'}
                    value={border.widthToken || 'thin'}
                    onChange={(val) =>
                      onChangeBorder({
                        ...border,
                        widthToken: val || 'thin',
                      })
                    }
                    data={['thin', 'medium', 'thick'].map((value) => ({
                      value,
                      label: BORDER_WIDTH_LABELS[value],
                    }))}
                  />
                </Group>

                <Switch
                  label="Link border sides"
                  checked={border.linked !== false}
                  onChange={(event) =>
                    onChangeBorder({ ...border, linked: event.currentTarget.checked })
                  }
                />
                {border.linked === false &&
                  (['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    const value = border.sides?.[side] || {}
                    const update = (partial: Partial<BorderConfig>) =>
                      onChangeBorder({
                        ...border,
                        sides: { ...border.sides, [side]: { ...value, ...partial } },
                      })
                    return (
                      <Group key={side} grow align="flex-end">
                        <Select
                          label={`${side} border`}
                          clearable
                          placeholder="Inherit"
                          value={value.style || null}
                          data={['none', 'solid', 'dashed', 'dotted']}
                          onChange={(style) =>
                            update({ style: (style as BorderConfig['style']) || undefined })
                          }
                        />
                        <Select
                          label={`${side} width`}
                          clearable
                          value={value.widthToken || null}
                          data={['thin', 'medium', 'thick']}
                          onChange={(widthToken) => update({ widthToken: widthToken || undefined })}
                        />
                        <Select
                          label={`${side} color`}
                          clearable
                          value={value.colorToken || null}
                          data={Object.keys(
                            themeConfig?.tokens.colors || { primary: '', text: '', border: '' },
                          )}
                          onChange={(colorToken) => update({ colorToken: colorToken || undefined })}
                        />
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
                  value={radius.radiusToken || 'none'}
                  onChange={(val) =>
                    onChangeRadius({
                      ...radius,
                      radiusToken: val || 'none',
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
                  onChange={(event) =>
                    onChangeRadius({ ...radius, linked: event.currentTarget.checked })
                  }
                />
                {radius.linked === false &&
                  (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((corner) => (
                    <Select
                      key={corner}
                      label={`${corner} radius`}
                      clearable
                      placeholder="Inherit"
                      value={radius.corners?.[corner] || null}
                      data={[
                        'none',
                        ...Object.keys(
                          themeConfig?.tokens.radius || { sm: '', md: '', lg: '', pill: '' },
                        ),
                      ]}
                      onChange={(value) =>
                        onChangeRadius({
                          ...radius,
                          corners: { ...radius.corners, [corner]: value || undefined },
                        })
                      }
                    />
                  ))}
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
              { value: 'shadowSoft', label: 'Soft Shadow (Subtle)' },
              { value: 'shadowMedium', label: 'Medium Shadow (Elevated)' },
              { value: 'shadowStrong', label: 'Strong Shadow (High)' },
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
