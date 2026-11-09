'use client'

import React, { useMemo, useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Group,
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
} from 'lucide-react'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import type {
  FontFamilyRole,
  FontStyleToken,
  FontWeightToken,
  LetterSpacingPreset,
  LineHeightPreset,
  ResponsiveConfig,
  TextAlign,
  TextDecorationToken,
  TextEffectPreset,
  TextTransformToken,
  TypographyStyleConfig,
} from '@/lib/style-engine/types'
import {
  formatSourceIndicator,
  resolveEffectiveTypography,
  type EffectiveTypographyField,
} from '@/lib/style-engine/effective-typography'
import {
  FONT_FAMILY_ROLE_LABELS,
  FONT_WEIGHT_LABELS,
  LETTER_SPACING_LABELS,
  LINE_HEIGHT_LABELS,
  typographyPresetLabel,
} from '@/lib/style-engine/semantic-preset-labels'
import { matchLineHeightPreset, resolveColorToken } from '@/lib/style-engine/token-resolver'
import {
  type ResponsiveBreakpoint,
  resetResponsiveTypographyProperty,
  setResponsiveTypographyProperty,
} from '@/lib/style-engine/responsive-style'

export interface TypographyStyleControlProps {
  value?: TypographyStyleConfig
  themeConfig?: ThemeConfig
  /** Semantic HTML tag from Atom Settings (Heading). Independent of font overrides. */
  htmlTag?: string | null
  widgetType?: string | null
  onChange: (val: TypographyStyleConfig) => void
  /** Clears the typography domain (and legacy flat color/align) via Style Session. */
  onResetDomain?: () => void
  onOpenColorModal: (anchor?: HTMLElement | null) => void
  /** Responsive V1 — tablet/mobile store explicit size/LH/align overrides only. */
  responsive?: ResponsiveConfig
  onChangeResponsive?: (responsive: ResponsiveConfig | undefined) => void
}

const SELECT_INPUT_STYLES = {
  input: {
    color: 'var(--mantine-color-text, #17201f)',
    fontWeight: 500,
  },
} as const

function withoutKey(
  value: TypographyStyleConfig,
  key: keyof TypographyStyleConfig,
): TypographyStyleConfig {
  const next = { ...value }
  delete next[key]
  return next
}

function FieldLabel({
  label,
  field,
  end,
}: {
  label: string
  field?: EffectiveTypographyField
  end?: React.ReactNode
}) {
  const source = field ? formatSourceIndicator(field) : null
  const overrideMark = field && !field.inherited && !field.unresolved
  return (
    <Group gap={6} justify="space-between" wrap="nowrap" mb={2}>
      <Text
        component="span"
        size="xs"
        fw={600}
        style={{ fontSize: 12, color: 'var(--mantine-color-text, #17201f)' }}
      >
        {label}
      </Text>
      <Group gap={4} wrap="nowrap">
        {source ? (
          <Text
            component="span"
            size="xs"
            c={field?.unresolved ? 'orange' : 'dimmed'}
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
            data-effective-source={field?.source}
            data-effective-inherited={field?.inherited ? 'true' : 'false'}
          >
            {source}
          </Text>
        ) : overrideMark ? (
          <Text
            component="span"
            size="xs"
            c="dimmed"
            style={{ fontSize: 11 }}
            data-effective-source={field.source}
            data-effective-inherited="false"
          >
            Override
          </Text>
        ) : null}
        {end}
      </Group>
    </Group>
  )
}

type SelectOption = { value: string; label: string }

/**
 * Shows effective inherited values as a real selected Select value (full-contrast text).
 * Labels are semantic preset names; custom/unknown values show raw (custom mode).
 * Does not write inherited values into style — only onChange from user edits persists.
 */
function EffectiveSelect({
  ariaLabel,
  overrideValue,
  effectiveValue,
  data,
  onSelect,
  onClear,
}: {
  ariaLabel: string
  overrideValue?: string | null
  /** Semantic option value used for display when inherited (never persisted until edit). */
  effectiveValue?: string | null
  data: SelectOption[]
  onSelect: (val: string) => void
  onClear: () => void
}) {
  const hasOverride = overrideValue !== undefined && overrideValue !== null && overrideValue !== ''
  const displayValue = hasOverride ? String(overrideValue) : effectiveValue || null
  const known = displayValue && data.some((d) => d.value === displayValue)
  const options =
    displayValue && !known
      ? [{ value: displayValue, label: displayValue }, ...data]
      : data

  return (
    <Select
      style={{ flex: 1 }}
      size="sm"
      aria-label={ariaLabel}
      styles={SELECT_INPUT_STYLES}
      data={options}
      value={displayValue}
      allowDeselect={hasOverride}
      clearable={hasOverride}
      searchable={false}
      placeholder={displayValue ? undefined : '—'}
      onChange={(val) => {
        if (val) onSelect(val)
        else onClear()
      }}
    />
  )
}

export function TypographyStyleControl({
  value = {},
  themeConfig,
  htmlTag,
  widgetType,
  onChange,
  onResetDomain,
  onOpenColorModal,
  responsive,
  onChangeResponsive,
}: TypographyStyleControlProps) {
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>('desktop')
  const overrideBp = breakpoint === 'desktop' ? null : breakpoint
  const bpActive = Boolean(overrideBp && onChangeResponsive)
  const bpOverride = overrideBp ? responsive?.[overrideBp]?.typography || {} : {}
  const typoTokens = (themeConfig?.tokens?.typography || {}) as Record<string, any>

  const sizeOptions = useMemo<SelectOption[]>(() => {
    const knownKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3']
    const keys = Array.from(
      new Set([
        ...knownKeys,
        ...Object.keys(typoTokens).filter((k) => typeof typoTokens[k] === 'object' && typoTokens[k]?.size),
      ]),
    )
    return keys.map((k) => ({
      value: k,
      label: typographyPresetLabel(k),
    }))
  }, [typoTokens])

  const presetOptions = sizeOptions

  const fontFamilyOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'theme', label: FONT_FAMILY_ROLE_LABELS.theme },
      { value: 'heading', label: FONT_FAMILY_ROLE_LABELS.heading },
    ],
    [],
  )

  const weightOptions = useMemo<SelectOption[]>(
    () =>
      Object.entries(FONT_WEIGHT_LABELS)
        .filter(([value]) => /^\d+$/.test(value))
        .map(([value, label]) => ({ value, label })),
    [],
  )

  const effective = useMemo(
    () =>
      resolveEffectiveTypography({
        override: value,
        themeConfig,
        htmlTag,
        widgetType,
      }),
    [value, themeConfig, htmlTag, widgetType],
  )

  const currentColorToken = value.colorToken
  const currentTextColor = currentColorToken
    ? resolveColorToken(currentColorToken, '#17201f')
    : effective.color.raw && effective.color.raw !== 'text'
      ? effective.color.display
      : resolveColorToken('text', themeConfig?.tokens?.colors?.text || '#17201f')

  const colorDisplay = currentColorToken
    ? currentColorToken
    : effective.color.unresolved
      ? '—'
      : effective.color.display

  const update = (partial: Partial<TypographyStyleConfig>) => {
    onChange({
      ...value,
      ...partial,
    })
  }

  const clear = (key: keyof TypographyStyleConfig) => {
    onChange(withoutKey(value, key))
  }

  const clearBreakpoint = (key: 'fontSize' | 'lineHeight' | 'align') => {
    if (!onChangeResponsive || !overrideBp) return
    onChangeResponsive(resetResponsiveTypographyProperty(responsive, overrideBp, key))
  }

  const setBreakpointTypo = (key: 'fontSize' | 'lineHeight' | 'align', next: string) => {
    if (!onChangeResponsive || !overrideBp) return
    onChangeResponsive(setResponsiveTypographyProperty(responsive, overrideBp, key, next))
  }

  const handleResetAll = () => {
    if (bpActive && onChangeResponsive && overrideBp) {
      let next = responsive
      for (const key of ['fontSize', 'lineHeight', 'align'] as const) {
        next = resetResponsiveTypographyProperty(next, overrideBp, key)
      }
      onChangeResponsive(next)
      return
    }
    if (onResetDomain) onResetDomain()
    else onChange({})
  }

  const PropertyReset = ({ field }: { field: keyof TypographyStyleConfig }) => {
    const hasBp =
      bpActive &&
      (field === 'fontSize' || field === 'lineHeight' || field === 'align') &&
      bpOverride[field as 'fontSize' | 'lineHeight' | 'align'] !== undefined
    const hasDesktop = value[field] !== undefined && value[field] !== null
    if (bpActive) {
      if (!hasBp) return null
      return (
        <Tooltip label="Reset breakpoint">
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={`Reset ${String(field)}`}
            onClick={() => clearBreakpoint(field as 'fontSize' | 'lineHeight' | 'align')}
          >
            <RotateCcw size={12} />
          </ActionIcon>
        </Tooltip>
      )
    }
    if (!hasDesktop) return null
    return (
      <Tooltip label="Reset">
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          aria-label={`Reset ${String(field)}`}
          onClick={() => clear(field)}
        >
          <RotateCcw size={12} />
        </ActionIcon>
      </Tooltip>
    )
  }

  const inheritedPreset = effective.basePreset || null
  const sizeEffectiveValue = value.fontSize || inheritedPreset
  const sizeOverride = bpActive ? bpOverride.fontSize : value.fontSize
  const lineOverride = bpActive ? bpOverride.lineHeight : value.lineHeight
  const alignOverride = bpActive ? bpOverride.align : value.align

  return (
    <Stack gap={8}>
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
          aria-label="Typography breakpoint"
        />
      )}
      {bpActive && (
        <Text size="xs" c="dimmed">
          Overrides only — unset properties inherit Desktop. No font conversion.
        </Text>
      )}
      <Group justify="flex-end" align="center">
        <Button
          variant="subtle"
          color="gray"
          size="compact-xs"
          leftSection={<RotateCcw size={12} />}
          onClick={handleResetAll}
        >
          Reset
        </Button>
      </Group>

      {!bpActive && (
        <>
          <Box>
            <FieldLabel
              label="Preset"
              field={
                value.typography
                  ? {
                      display: value.typography.toUpperCase(),
                      sourceLabel: 'Override',
                      source: 'override',
                      inherited: false,
                      unresolved: false,
                    }
                  : {
                      display: inheritedPreset
                        ? typographyPresetLabel(inheritedPreset)
                        : 'Theme',
                      sourceLabel: inheritedPreset
                        ? `Theme ${typographyPresetLabel(inheritedPreset)}`
                        : 'Theme',
                      source: 'html-tag',
                      inherited: true,
                      unresolved: false,
                    }
              }
            />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Preset"
                overrideValue={value.typography}
                effectiveValue={inheritedPreset}
                data={presetOptions}
                onSelect={(val) => update({ typography: val })}
                onClear={() => clear('typography')}
              />
              <PropertyReset field="typography" />
            </Group>
          </Box>

          <Box>
            <FieldLabel label="Font" field={effective.fontFamily} />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Font"
                overrideValue={value.fontFamily}
                effectiveValue={effective.fontFamily.raw || null}
                data={fontFamilyOptions}
                onSelect={(val) => update({ fontFamily: val as FontFamilyRole })}
                onClear={() => clear('fontFamily')}
              />
              <PropertyReset field="fontFamily" />
            </Group>
          </Box>
        </>
      )}

      <Group grow gap="xs" align="flex-start">
        {!bpActive && (
          <Box style={{ flex: 1 }}>
            <FieldLabel label="Weight" field={effective.fontWeight} />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Weight"
                overrideValue={value.fontWeight}
                effectiveValue={effective.fontWeight.raw || null}
                data={weightOptions}
                onSelect={(val) => update({ fontWeight: val as FontWeightToken })}
                onClear={() => clear('fontWeight')}
              />
              <PropertyReset field="fontWeight" />
            </Group>
          </Box>
        )}
        <Box style={{ flex: 1 }}>
          <FieldLabel
            label="Size"
            field={
              bpActive && bpOverride.fontSize
                ? {
                    display: bpOverride.fontSize,
                    sourceLabel: 'Override',
                    source: 'override',
                    inherited: false,
                    unresolved: false,
                  }
                : effective.fontSize
            }
          />
          <Group gap={4} align="center" wrap="nowrap">
            <EffectiveSelect
              ariaLabel="Size"
              overrideValue={sizeOverride}
              effectiveValue={sizeEffectiveValue}
              data={sizeOptions}
              onSelect={(val) =>
                bpActive ? setBreakpointTypo('fontSize', val) : update({ fontSize: val })
              }
              onClear={() => (bpActive ? clearBreakpoint('fontSize') : clear('fontSize'))}
            />
            <PropertyReset field="fontSize" />
          </Group>
        </Box>
      </Group>

      {!bpActive && (
        <Box>
          <FieldLabel label="Color" field={effective.color} end={<PropertyReset field="colorToken" />} />
          <Group
            justify="space-between"
            align="center"
            gap="xs"
            wrap="nowrap"
            style={{
              minHeight: 36,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Box
                style={{
                  width: 22,
                  height: 22,
                  flex: 'none',
                  borderRadius: 4,
                  backgroundColor: currentTextColor,
                  border: '1px solid rgba(0,0,0,0.18)',
                }}
              />
              <Text
                size="xs"
                fw={500}
                truncate
                style={{ fontSize: 12, color: 'var(--mantine-color-text, #17201f)' }}
                data-color-display
              >
                {colorDisplay}
              </Text>
            </Group>
            <Button
              size="compact-xs"
              variant="light"
              color="teal"
              onClick={(event) => onOpenColorModal(event.currentTarget)}
            >
              Change
            </Button>
          </Group>
        </Box>
      )}

      <Box>
        <FieldLabel label="Align" field={effective.align} end={<PropertyReset field="align" />} />
        <SegmentedControl
          size="sm"
          fullWidth
          value={alignOverride || (effective.align.raw as TextAlign) || 'left'}
          onChange={(val) =>
            bpActive
              ? setBreakpointTypo('align', val)
              : update({ align: val as TextAlign })
          }
          data={[
            { label: <AlignLeft size={15} />, value: 'left' },
            { label: <AlignCenter size={15} />, value: 'center' },
            { label: <AlignRight size={15} />, value: 'right' },
            { label: <AlignJustify size={15} />, value: 'justify' },
          ]}
        />
      </Box>

      {!bpActive && (
        <Group grow gap="xs" align="flex-start">
          <Box style={{ flex: 1 }}>
            <FieldLabel label="Style" field={effective.fontStyle} />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Style"
                overrideValue={value.fontStyle}
                effectiveValue={effective.fontStyle.raw || null}
                data={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'italic', label: 'Italic' },
                ]}
                onSelect={(val) => update({ fontStyle: val as FontStyleToken })}
                onClear={() => clear('fontStyle')}
              />
              <PropertyReset field="fontStyle" />
            </Group>
          </Box>
          <Box style={{ flex: 1 }}>
            <FieldLabel label="Decoration" field={effective.textDecoration} />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Decoration"
                overrideValue={value.textDecoration}
                effectiveValue={effective.textDecoration.raw || null}
                data={[
                  { value: 'none', label: 'None' },
                  { value: 'underline', label: 'Underline' },
                  { value: 'line-through', label: 'Strike' },
                ]}
                onSelect={(val) => update({ textDecoration: val as TextDecorationToken })}
                onClear={() => clear('textDecoration')}
              />
              <PropertyReset field="textDecoration" />
            </Group>
          </Box>
        </Group>
      )}

      {!bpActive && (
        <Box>
          <FieldLabel label="Transform" field={effective.textTransform} />
          <Group gap={4} align="center" wrap="nowrap">
            <EffectiveSelect
              ariaLabel="Transform"
              overrideValue={value.textTransform}
              effectiveValue={effective.textTransform.raw || null}
              data={[
                { value: 'none', label: 'None' },
                { value: 'uppercase', label: 'Uppercase' },
                { value: 'lowercase', label: 'Lowercase' },
                { value: 'capitalize', label: 'Capitalize' },
              ]}
              onSelect={(val) => update({ textTransform: val as TextTransformToken })}
              onClear={() => clear('textTransform')}
            />
            <PropertyReset field="textTransform" />
          </Group>
        </Box>
      )}

      <Group grow gap="xs" align="flex-start">
        {!bpActive && (
          <Box style={{ flex: 1 }}>
            <FieldLabel label="Letter spacing" field={effective.letterSpacing} />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Letter spacing"
                overrideValue={value.letterSpacing}
                effectiveValue={effective.letterSpacing.raw || null}
                data={Object.entries(LETTER_SPACING_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onSelect={(val) => update({ letterSpacing: val as LetterSpacingPreset })}
                onClear={() => clear('letterSpacing')}
              />
              <PropertyReset field="letterSpacing" />
            </Group>
          </Box>
        )}
        <Box style={{ flex: 1 }}>
          <FieldLabel label="Line height" field={effective.lineHeight} />
          <Group gap={4} align="center" wrap="nowrap">
            <EffectiveSelect
              ariaLabel="Line height"
              overrideValue={lineOverride}
              effectiveValue={
                matchLineHeightPreset(effective.lineHeight.raw) ||
                matchLineHeightPreset(effective.lineHeight.display) ||
                effective.lineHeight.raw ||
                effective.lineHeight.display ||
                null
              }
              data={Object.entries(LINE_HEIGHT_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              onSelect={(val) =>
                bpActive
                  ? setBreakpointTypo('lineHeight', val)
                  : update({ lineHeight: val as LineHeightPreset })
              }
              onClear={() => (bpActive ? clearBreakpoint('lineHeight') : clear('lineHeight'))}
            />
            <PropertyReset field="lineHeight" />
          </Group>
        </Box>
      </Group>

      {!bpActive && (
        <Group grow gap="xs" align="flex-start">
          <Box style={{ flex: 1 }}>
            <FieldLabel label="Effect" />
            <Group gap={4} align="center" wrap="nowrap">
              <EffectiveSelect
                ariaLabel="Effect"
                overrideValue={value.effectPreset}
                effectiveValue="none"
                data={[
                  { value: 'none', label: 'None' },
                  { value: 'shadow-soft', label: 'Soft shadow' },
                  { value: 'shadow-hard', label: 'Hard shadow' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'glow', label: 'Glow' },
                  { value: 'subtle-depth', label: 'Depth' },
                ]}
                onSelect={(val) => update({ effectPreset: val as TextEffectPreset })}
                onClear={() => clear('effectPreset')}
              />
              <PropertyReset field="effectPreset" />
            </Group>
          </Box>
          <Box style={{ flex: 1, paddingTop: 22 }}>
            <Switch
              size="sm"
              color="teal"
              label="Vertical text"
              checked={Boolean(value.verticalText)}
              onChange={(e) => {
                if (e.currentTarget.checked) update({ verticalText: true })
                else clear('verticalText')
              }}
            />
          </Box>
        </Group>
      )}
    </Stack>
  )
}
