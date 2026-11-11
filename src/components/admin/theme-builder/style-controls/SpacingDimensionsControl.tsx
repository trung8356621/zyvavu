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
import { COLUMNS_LAYOUT_DEFAULTS, normalizeSpacing, resolveSpacingDisplay, STYLE_DEFAULTS } from '@/lib/style-engine/effective-defaults'
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
  onChangeDimensions: (dimensions: DimensionsConfig, key?: keyof DimensionsConfig) => void
  onResetGroup?: (group: StyleDomainGroup) => void
  responsive?: ResponsiveConfig
  onChangeResponsive?: (responsive: ResponsiveConfig | undefined) => void
  sectionLayout?: { containerWidth: string; verticalPadding: string; minHeight: string }
  sectionOverrides?: { containerWidth?: string; minHeight?: string }
  onBreakpointChange?: (breakpoint: ResponsiveBreakpoint) => void
  activeBreakpoint?: ResponsiveBreakpoint
  columns?: boolean
  columnGap?: string
}

const spacingLabel = (token: string) =>
  token === 'none' ? '0 px' : SPACING_TOKEN_LABELS[token] || token.replace(/^(\d+(?:\.\d+)?)(px|rem)$/, '$1 $2')

const PADDING_OPTIONS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'].map((value) => ({
  value,
  label: spacingLabel(value),
}))

const MARGIN_OPTIONS = ['none', 'xs', 'sm', 'md', 'lg'].map((value) => ({
  value,
  label: spacingLabel(value),
}))

function withEffectiveOption(options: typeof PADDING_OPTIONS, value: string) {
  return options.some((option) => option.value === value)
    ? options
    : [{ value, label: spacingLabel(value), disabled: true }, ...options]
}

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
  sectionLayout,
  sectionOverrides,
  onBreakpointChange,
  activeBreakpoint,
  columns,
  columnGap,
}: SpacingDimensionsControlProps) {
  const [opened, setOpened] = useState<string[]>(['spacing', 'dimensions', 'alignment'])
  const [localBreakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>('desktop')
  const breakpoint = activeBreakpoint ?? localBreakpoint
  const overrideBp = breakpoint === 'desktop' ? null : breakpoint
  const bpActive = Boolean(overrideBp && onChangeResponsive)
  const activeSpacing = normalizeSpacing(overrideBp ? responsive?.[overrideBp]?.spacing : spacing)
  const displayed = resolveSpacingDisplay(
    spacing,
    responsive,
    breakpoint,
    sectionLayout?.verticalPadding,
    columns ? COLUMNS_LAYOUT_DEFAULTS.verticalMargin : undefined,
  )
  const gapValue = displayed.gap || (columns ? columnGap || COLUMNS_LAYOUT_DEFAULTS.gap : STYLE_DEFAULTS.spacing)
  const [split, setSplit] = useState<Partial<Record<ResponsiveBreakpoint, { padding?: boolean; margin?: boolean }>>>({})

  const commitSpacing = (next: SpacingConfig) => {
    if (bpActive && onChangeResponsive && overrideBp) {
      onChangeResponsive(setResponsiveSpacing(responsive, overrideBp, next))
      return
    }
    onChangeSpacing(next)
  }

  const updateSpacing = (partial: Partial<SpacingConfig>) => {
    const next = {
      ...activeSpacing,
      ...partial,
    }
    if (!next.padding) delete next.padding
    if (!next.margin) delete next.margin
    if (!next.gapToken) delete next.gapToken
    commitSpacing(next)
  }

  const updateDimensions = (partial: Partial<DimensionsConfig>) => {
    const next = { ...dimensions, ...partial }
    const key = Object.keys(partial)[0] as keyof DimensionsConfig
    if (next[key] === undefined) delete next[key]
    onChangeDimensions(next, key)
  }

  const padValues = (['topToken', 'rightToken', 'bottomToken', 'leftToken'] as const).map(displayed.padding)
  const marginValues = (['topToken', 'bottomToken'] as const).map(displayed.margin)
  const paddingLinked = split[breakpoint]?.padding === false ||
    (!hasPaddingSides(activeSpacing.padding) && split[breakpoint]?.padding !== true && new Set(padValues).size === 1)
  const marginLinked = split[breakpoint]?.margin === false ||
    (!hasMarginSides(activeSpacing.margin) && split[breakpoint]?.margin !== true && new Set(marginValues).size === 1)

  const setPaddingLinked = (linked: boolean) => {
    setSplit((previous) => ({ ...previous, [breakpoint]: { ...previous[breakpoint], padding: !linked } }))
    const current = activeSpacing.padding || {}
    if (linked && hasPaddingSides(current)) {
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
  }

  const setMarginLinked = (linked: boolean) => {
    setSplit((previous) => ({ ...previous, [breakpoint]: { ...previous[breakpoint], margin: !linked } }))
    const current = activeSpacing.margin || {}
    if (linked && hasMarginSides(current)) {
      const token = current.token || current.topToken || current.bottomToken
      updateSpacing({
        margin: token ? { token } : undefined,
      })
      return
    }
  }

  const updatePaddingSide = (
    side: 'topToken' | 'bottomToken' | 'leftToken' | 'rightToken',
    value: string | null,
  ) => {
    const next = {
      topToken: activeSpacing.padding?.token || activeSpacing.padding?.topToken,
      bottomToken: activeSpacing.padding?.token || activeSpacing.padding?.bottomToken,
      leftToken: activeSpacing.padding?.token || activeSpacing.padding?.leftToken,
      rightToken: activeSpacing.padding?.token || activeSpacing.padding?.rightToken,
      [side]: value || undefined,
    }
    const empty = !next.topToken && !next.bottomToken && !next.leftToken && !next.rightToken
    updateSpacing({ padding: empty ? undefined : next })
  }

  const updateMarginSide = (side: 'topToken' | 'bottomToken', value: string | null) => {
    const next = {
      topToken: activeSpacing.margin?.token || activeSpacing.margin?.topToken,
      bottomToken: activeSpacing.margin?.token || activeSpacing.margin?.bottomToken,
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
          onChange={(val) => {
            const next = val as ResponsiveBreakpoint
            if (activeBreakpoint === undefined) setBreakpoint(next)
            onBreakpointChange?.(next)
          }}
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
          Unset values follow wider breakpoints. Dimensions stay desktop-only.
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
                placeholder="Mixed"
                clearable={Boolean(activeSpacing.padding?.token)}
                value={new Set(padValues).size === 1 ? padValues[0] : null}
                onChange={(val) =>
                  updateSpacing({
                    padding: val ? { token: val } : undefined,
                  })
                }
                data={withEffectiveOption(PADDING_OPTIONS, padValues[0])}
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
                    clearable={Boolean(activeSpacing.padding?.token || activeSpacing.padding?.[side])}
                    value={displayed.padding(side)}
                    data={withEffectiveOption(PADDING_OPTIONS, displayed.padding(side))}
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
                placeholder="Mixed"
                clearable={Boolean(activeSpacing.margin?.token)}
                value={new Set(marginValues).size === 1 ? marginValues[0] : null}
                onChange={(val) =>
                  updateSpacing({
                    margin: val ? { token: val } : undefined,
                  })
                }
                data={withEffectiveOption(MARGIN_OPTIONS, marginValues[0])}
              />
            ) : (
              <Group grow gap="xs">
                <Select
                  size="sm"
                  label="Top"
                  clearable={Boolean(activeSpacing.margin?.token || activeSpacing.margin?.topToken)}
                  value={displayed.margin('topToken')}
                  data={withEffectiveOption(MARGIN_OPTIONS, displayed.margin('topToken'))}
                  onChange={(val) => updateMarginSide('topToken', val)}
                />
                <Select
                  size="sm"
                  label="Bottom"
                  clearable={Boolean(activeSpacing.margin?.token || activeSpacing.margin?.bottomToken)}
                  value={displayed.margin('bottomToken')}
                  data={withEffectiveOption(MARGIN_OPTIONS, displayed.margin('bottomToken'))}
                  onChange={(val) => updateMarginSide('bottomToken', val)}
                />
              </Group>
            )}
            {(columns || (sectionLayout && !bpActive)) && (
              <Select
                size="sm"
                label="Gap"
                value={gapValue}
                clearable={Boolean(activeSpacing.gapToken)}
                onChange={(gapToken) => updateSpacing({ gapToken: gapToken || undefined })}
                data={withEffectiveOption(PADDING_OPTIONS, gapValue)}
              />
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
                placeholder="Auto"
                clearable={Boolean(dimensions.containerWidth || sectionOverrides?.containerWidth)}
                value={sectionLayout?.containerWidth || dimensions.containerWidth || null}
                onChange={(val) => updateDimensions({ containerWidth: val || undefined })}
                data={['containerWidth', 'narrowWidth', 'wideWidth', 'full'].map((value) => ({
                  value,
                  label: CONTAINER_WIDTH_LABELS[value],
                }))}
              />
              <Select
                size="sm"
                label="Minimum Height"
                clearable={Boolean(dimensions.minHeight || sectionOverrides?.minHeight)}
                value={sectionLayout?.minHeight || dimensions.minHeight || STYLE_DEFAULTS.minHeight}
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
