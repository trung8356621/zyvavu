'use client'

import React, { useState } from 'react'
import {
  Accordion,
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
} from '@mantine/core'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import type { StyleDomainGroup } from '@/lib/style-engine/domains'
import type {
  DimensionsConfig,
  ResponsiveConfig,
  SpacingConfig,
  TextAlign,
} from '@/lib/style-engine/types'
import {
  CONTAINER_WIDTH_LABELS,
  MIN_HEIGHT_LABELS,
  SPACING_TOKEN_LABELS,
} from '@/lib/style-engine/semantic-preset-labels'
import {
  type ResponsiveBreakpoint,
  resetResponsiveSpacing,
  setResponsiveSpacing,
} from '@/lib/style-engine/responsive-style'

export interface SpacingDimensionsControlProps {
  spacing?: SpacingConfig
  dimensions?: DimensionsConfig
  showDimensions?: boolean
  onChangeSpacing: (spacing: SpacingConfig) => void
  onChangeDimensions: (dimensions: DimensionsConfig) => void
  onResetGroup?: (group: StyleDomainGroup) => void
  responsive?: ResponsiveConfig
  onChangeResponsive?: (responsive: ResponsiveConfig | undefined) => void
}

const PADDING_OPTIONS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'].map((value) => ({
  value,
  label: SPACING_TOKEN_LABELS[value],
}))

const MARGIN_OPTIONS = ['none', 'xs', 'sm', 'md', 'lg'].map((value) => ({
  value,
  label: SPACING_TOKEN_LABELS[value],
}))

function hasPaddingSides(padding?: SpacingConfig['padding']): boolean {
  if (!padding) return false
  return Boolean(padding.topToken || padding.bottomToken || padding.leftToken || padding.rightToken)
}

function hasMarginSides(margin?: SpacingConfig['margin']): boolean {
  if (!margin) return false
  return Boolean(margin.topToken || margin.bottomToken)
}

function GroupReset({
  label,
  onReset,
}: {
  label: string
  onReset?: () => void
}) {
  if (!onReset) return null
  return (
    <Group justify="flex-end" mb={4}>
      <Button variant="subtle" size="compact-xs" onClick={onReset} aria-label={`Reset ${label}`}>
        Reset group
      </Button>
    </Group>
  )
}

export function SpacingDimensionsControl({
  spacing = {},
  dimensions = {},
  showDimensions = true,
  onChangeSpacing,
  onChangeDimensions,
  onResetGroup,
  responsive,
  onChangeResponsive,
}: SpacingDimensionsControlProps) {
  const [opened, setOpened] = useState<string[]>(['spacing', 'dimensions', 'alignment'])
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>('desktop')
  const overrideBp = breakpoint === 'desktop' ? null : breakpoint
  const bpActive = Boolean(overrideBp && onChangeResponsive)
  const activeSpacing = overrideBp ? responsive?.[overrideBp]?.spacing || {} : spacing

  const commitSpacing = (next: SpacingConfig) => {
    if (bpActive && onChangeResponsive && overrideBp) {
      onChangeResponsive(setResponsiveSpacing(responsive, overrideBp, next))
      return
    }
    onChangeSpacing(next)
  }

  const updateSpacing = (partial: Partial<SpacingConfig>) => {
    commitSpacing({
      ...activeSpacing,
      ...partial,
    })
  }

  const updateDimensions = (partial: Partial<DimensionsConfig>) => {
    onChangeDimensions({
      ...dimensions,
      ...partial,
    })
  }

  const paddingLinked = !hasPaddingSides(activeSpacing.padding)
  const marginLinked = !hasMarginSides(activeSpacing.margin)

  const setPaddingLinked = (linked: boolean) => {
    const current = activeSpacing.padding || {}
    if (linked) {
      const token =
        current.token ||
        current.topToken ||
        current.bottomToken ||
        current.leftToken ||
        current.rightToken
      updateSpacing({
        padding: token ? { token } : undefined,
      })
      return
    }
    const seed = current.token || 'md'
    updateSpacing({
      padding: {
        topToken: current.topToken || seed,
        bottomToken: current.bottomToken || seed,
        leftToken: current.leftToken || seed,
        rightToken: current.rightToken || seed,
      },
    })
  }

  const setMarginLinked = (linked: boolean) => {
    const current = activeSpacing.margin || {}
    if (linked) {
      const token = current.token || current.topToken || current.bottomToken
      updateSpacing({
        margin: token ? { token } : undefined,
      })
      return
    }
    const seed = current.token || 'sm'
    updateSpacing({
      margin: {
        topToken: current.topToken || seed,
        bottomToken: current.bottomToken || seed,
      },
    })
  }

  const updatePaddingSide = (
    side: 'topToken' | 'bottomToken' | 'leftToken' | 'rightToken',
    value: string | null,
  ) => {
    const next = {
      topToken: activeSpacing.padding?.topToken,
      bottomToken: activeSpacing.padding?.bottomToken,
      leftToken: activeSpacing.padding?.leftToken,
      rightToken: activeSpacing.padding?.rightToken,
      [side]: value || undefined,
    }
    const empty = !next.topToken && !next.bottomToken && !next.leftToken && !next.rightToken
    updateSpacing({ padding: empty ? undefined : next })
  }

  const updateMarginSide = (side: 'topToken' | 'bottomToken', value: string | null) => {
    const next = {
      topToken: activeSpacing.margin?.topToken,
      bottomToken: activeSpacing.margin?.bottomToken,
      [side]: value || undefined,
    }
    const empty = !next.topToken && !next.bottomToken
    updateSpacing({ margin: empty ? undefined : next })
  }

  return (
    <Stack gap="xs">
      {onChangeResponsive && (
        <SegmentedControl
          size="xs"
          fullWidth
          value={breakpoint}
          onChange={(val) => setBreakpoint(val as ResponsiveBreakpoint)}
          data={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'mobile', label: 'Mobile' },
          ]}
          aria-label="Spacing breakpoint"
        />
      )}
      {bpActive && (
        <Text size="xs" c="dimmed">
          Spacing overrides only — unset inherits Desktop. Dimensions stay desktop-only in V1.
        </Text>
      )}
    <Accordion
      multiple
      value={opened}
      onChange={setOpened}
      variant="separated"
      chevronPosition="left"
    >
      <Accordion.Item value="spacing">
        <Accordion.Control>
          <Text size="sm" fw={600}>
            Spacing
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            <GroupReset
              label="Spacing"
              onReset={
                bpActive && onChangeResponsive && overrideBp
                  ? () => onChangeResponsive(resetResponsiveSpacing(responsive, overrideBp))
                  : onResetGroup
                    ? () => onResetGroup('spacing')
                    : undefined
              }
            />
            <Switch
              size="sm"
              label="Link padding sides"
              checked={paddingLinked}
              onChange={(event) => setPaddingLinked(event.currentTarget.checked)}
            />
            {paddingLinked ? (
              <Select
                size="sm"
                label="Padding"
                placeholder="Inherit"
                clearable
                value={activeSpacing.padding?.token || null}
                onChange={(val) =>
                  updateSpacing({
                    padding: val ? { token: val } : undefined,
                  })
                }
                data={PADDING_OPTIONS}
              />
            ) : (
              <Group grow gap="xs">
                {(
                  [
                    ['topToken', 'Top'],
                    ['rightToken', 'Right'],
                    ['bottomToken', 'Bottom'],
                    ['leftToken', 'Left'],
                  ] as const
                ).map(([side, label]) => (
                  <Select
                    key={side}
                    size="sm"
                    label={label}
                    clearable
                    placeholder="Inherit"
                    value={activeSpacing.padding?.[side] || null}
                    data={PADDING_OPTIONS}
                    onChange={(val) => updatePaddingSide(side, val)}
                  />
                ))}
              </Group>
            )}

            <Switch
              size="sm"
              label="Link margin (vertical)"
              checked={marginLinked}
              onChange={(event) => setMarginLinked(event.currentTarget.checked)}
            />
            {marginLinked ? (
              <Select
                size="sm"
                label="Margin"
                placeholder="Inherit"
                clearable
                value={activeSpacing.margin?.token || null}
                onChange={(val) =>
                  updateSpacing({
                    margin: val ? { token: val } : undefined,
                  })
                }
                data={MARGIN_OPTIONS}
              />
            ) : (
              <Group grow gap="xs">
                <Select
                  size="sm"
                  label="Top"
                  clearable
                  placeholder="Inherit"
                  value={activeSpacing.margin?.topToken || null}
                  data={MARGIN_OPTIONS}
                  onChange={(val) => updateMarginSide('topToken', val)}
                />
                <Select
                  size="sm"
                  label="Bottom"
                  clearable
                  placeholder="Inherit"
                  value={activeSpacing.margin?.bottomToken || null}
                  data={MARGIN_OPTIONS}
                  onChange={(val) => updateMarginSide('bottomToken', val)}
                />
              </Group>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      {showDimensions && !bpActive && (
        <Accordion.Item value="dimensions">
          <Accordion.Control>
            <Text size="sm" fw={600}>
              Dimensions
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <GroupReset
              label="Dimensions"
              onReset={onResetGroup ? () => onResetGroup('dimensions') : undefined}
            />
            <Group grow gap="xs">
              <Select
                size="sm"
                label="Container Width"
                placeholder="Inherit"
                clearable
                value={dimensions.containerWidth || null}
                onChange={(val) => updateDimensions({ containerWidth: val || undefined })}
                data={['containerWidth', 'narrowWidth', 'wideWidth', 'full'].map((value) => ({
                  value,
                  label: CONTAINER_WIDTH_LABELS[value],
                }))}
              />
              <Select
                size="sm"
                label="Minimum Height"
                placeholder="Inherit"
                clearable
                value={dimensions.minHeight || null}
                onChange={(val) => updateDimensions({ minHeight: val || undefined })}
                data={['auto', 'sm', 'md', 'lg', 'screen'].map((value) => ({
                  value,
                  label: MIN_HEIGHT_LABELS[value],
                }))}
              />
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      )}

      {showDimensions && !bpActive && (
        <Accordion.Item value="alignment">
          <Accordion.Control>
            <Text size="sm" fw={600}>
              Alignment
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <GroupReset
              label="Alignment"
              onReset={onResetGroup ? () => onResetGroup('alignment') : undefined}
            />
            <SegmentedControl
              size="sm"
              fullWidth
              value={dimensions.align || 'left'}
              onChange={(val) => updateDimensions({ align: val as TextAlign })}
              data={[
                { label: <AlignLeft size={15} />, value: 'left' },
                { label: <AlignCenter size={15} />, value: 'center' },
                { label: <AlignRight size={15} />, value: 'right' },
              ]}
            />
          </Accordion.Panel>
        </Accordion.Item>
      )}
    </Accordion>
    </Stack>
  )
}
