'use client'

import React, { useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Tabs,
  Text,
} from '@mantine/core'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import {
  BUTTON_HOVER_SUPPORTED,
  BUTTON_NORMAL_SUPPORTED,
  BUTTON_STYLE_CLASS,
  normalizeButtonStyle,
  resolveButtonHoverCssVars,
  resolveButtonNormalStyles,
} from '@/lib/style-engine/button-style'
import '@/lib/style-engine/button-style.css'
import {
  BORDER_WIDTH_LABELS,
  colorTokenLabel,
  RADIUS_SCALE_LABELS,
} from '@/lib/style-engine/semantic-preset-labels'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'
import type { ButtonStyleShell } from '@/lib/style-engine/types'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'

type ButtonColorTarget =
  | 'normal.background'
  | 'normal.border'
  | 'hover.background'
  | 'hover.text'
  | 'hover.border'

export interface ButtonStyleControlProps {
  themeConfig?: ThemeConfig
  value?: ButtonStyleShell
  onChange: (button: ButtonStyleShell) => void
  typography?: React.ReactNode
}

function ColorRow({
  label,
  token,
  onChange,
}: {
  label: string
  token?: string
  onChange: (anchor: HTMLElement) => void
}) {
  return (
    <Paper p="xs" withBorder radius="xs">
      <Group justify="space-between" align="center">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              backgroundColor: resolveColorToken(token, '#dfe5e2'),
              border: '1px solid rgba(0,0,0,0.18)',
              flex: 'none',
            }}
          />
          <Text size="xs" fw={500} truncate>
            {label}: {token ? colorTokenLabel(token) : '—'}
          </Text>
        </Group>
        <Button
          size="compact-xs"
          variant="light"
          color="teal"
          onClick={(event) => onChange(event.currentTarget)}
        >
          Change
        </Button>
      </Group>
    </Paper>
  )
}

export function ButtonStyleControl({
  themeConfig,
  value,
  onChange,
  typography,
}: ButtonStyleControlProps) {
  const shell = useMemo(() => normalizeButtonStyle(value), [value])
  const liveRef = useRef(shell)
  // Sync from props only when the parent value changes — do not clobber optimistic edits
  // on local UI state updates (Normal/Hover tab switches) before the parent re-renders.
  const valueKey = JSON.stringify(value || { version: 1 })
  const lastValueKey = useRef(valueKey)
  if (lastValueKey.current !== valueKey) {
    lastValueKey.current = valueKey
    liveRef.current = shell
  }
  const displayShell = liveRef.current
  const preColorRef = useRef<ButtonStyleShell | null>(null)

  const [state, setState] = useState<'normal' | 'hover'>('normal')
  const [group, setGroup] = useState<string>('Background')
  const [colorOpen, setColorOpen] = useState(false)
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null)
  const [colorTarget, setColorTarget] = useState<ButtonColorTarget | null>(null)

  const commit = (next: ButtonStyleShell) => {
    const normalized = normalizeButtonStyle(next)
    // Optimistic merge so rapid Normal→Hover edits keep prior state before parent re-render.
    liveRef.current = normalized.normal || normalized.hover ? normalized : { version: 1 }
    if (!normalized.normal && !normalized.hover) onChange({ version: 1 })
    else onChange(normalized)
  }

  const updateNormal = (partial: NonNullable<ButtonStyleShell['normal']>) => {
    commit({
      version: 1,
      normal: { ...liveRef.current.normal, ...partial },
      hover: liveRef.current.hover,
    })
  }

  const updateHover = (partial: NonNullable<ButtonStyleShell['hover']>) => {
    commit({
      version: 1,
      normal: liveRef.current.normal,
      hover: { ...liveRef.current.hover, ...partial },
    })
  }

  const openColor = (target: ButtonColorTarget, anchor: HTMLElement) => {
    preColorRef.current = liveRef.current
    setColorTarget(target)
    setColorAnchor(anchor)
    setColorOpen(true)
  }

  const applyColorToken = (tokenId: string) => {
    if (!colorTarget) return
    if (colorTarget === 'normal.background') {
      updateNormal({ background: { mode: 'color', colorToken: tokenId } })
    } else if (colorTarget === 'normal.border') {
      updateNormal({ border: { ...liveRef.current.normal?.border, colorToken: tokenId } })
    } else if (colorTarget === 'hover.background') {
      updateHover({ background: { mode: 'color', colorToken: tokenId } })
    } else if (colorTarget === 'hover.text') {
      updateHover({ text: { colorToken: tokenId } })
    } else if (colorTarget === 'hover.border') {
      updateHover({ border: { colorToken: tokenId } })
    }
  }

  // Only list groups that persist — no empty Icon / Normal Layout shells.
  const groups =
    state === 'normal'
      ? ([...BUTTON_NORMAL_SUPPORTED] as string[])
      : ([...BUTTON_HOVER_SUPPORTED] as string[])

  const previewStyle = {
    ...resolveButtonNormalStyles(displayShell),
    ...resolveButtonHoverCssVars(displayShell),
    pointerEvents: 'none' as const,
    minHeight: 36,
    padding: '0 14px',
  }

  const currentColorToken =
    colorTarget === 'normal.background'
      ? displayShell.normal?.background?.colorToken
      : colorTarget === 'normal.border'
        ? displayShell.normal?.border?.colorToken
        : colorTarget === 'hover.background'
          ? displayShell.hover?.background?.colorToken
          : colorTarget === 'hover.text'
            ? displayShell.hover?.text?.colorToken
            : colorTarget === 'hover.border'
              ? displayShell.hover?.border?.colorToken
              : undefined

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Normal / Hover persist with the document. Icon and Normal Layout are not available yet.
      </Text>

      <Select
        size="sm"
        label="Preset"
        clearable
        placeholder="Custom"
        data={[
          { value: 'theme', label: 'Filled' },
          { value: 'outline', label: 'Outline' },
        ]}
        value={displayShell.normal?.preset || null}
        onChange={(preset) =>
          updateNormal({
            preset: (preset as 'theme' | 'outline') || undefined,
          })
        }
      />

      <Button component="div" variant="default" className={BUTTON_STYLE_CLASS} style={previewStyle}>
        Button sample
      </Button>

      <SegmentedControl
        value={state}
        onChange={(value) => {
          setState(value as 'normal' | 'hover')
          setGroup('Background')
        }}
        data={[
          { value: 'normal', label: 'Normal' },
          { value: 'hover', label: 'Hover' },
        ]}
      />

      <Tabs
        orientation="vertical"
        value={group}
        onChange={(value) => setGroup(value || 'Background')}
      >
        <Tabs.List>
          {groups.map((name) => (
            <Tabs.Tab key={name} value={name}>
              {name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value={group} pl="sm">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {group} · {state}
            </Text>

            {group === 'Background' && state === 'normal' && (
              <ColorRow
                label="Background"
                token={displayShell.normal?.background?.colorToken}
                onChange={(el) => openColor('normal.background', el)}
              />
            )}
            {group === 'Background' && state === 'hover' && (
              <ColorRow
                label="Hover background"
                token={displayShell.hover?.background?.colorToken}
                onChange={(el) => openColor('hover.background', el)}
              />
            )}

            {group === 'Text' && state === 'normal' && typography}
            {group === 'Text' && state === 'hover' && (
              <ColorRow
                label="Hover text"
                token={displayShell.hover?.text?.colorToken}
                onChange={(el) => openColor('hover.text', el)}
              />
            )}

            {group === 'Border' && state === 'normal' && (
              <>
                <Select
                  size="sm"
                  label="Border style"
                  value={displayShell.normal?.border?.style || 'none'}
                  data={[
                    { value: 'none', label: 'None' },
                    { value: 'solid', label: 'Solid' },
                    { value: 'dashed', label: 'Dashed' },
                    { value: 'dotted', label: 'Dotted' },
                  ]}
                  onChange={(style) =>
                    updateNormal({
                      border: {
                        ...liveRef.current.normal?.border,
                        style: (style as 'none' | 'solid' | 'dashed' | 'dotted') || 'none',
                      },
                    })
                  }
                />
                <Select
                  size="sm"
                  label="Border width"
                  disabled={
                    !displayShell.normal?.border?.style ||
                    displayShell.normal.border.style === 'none'
                  }
                  value={displayShell.normal?.border?.widthToken || 'thin'}
                  data={['thin', 'medium', 'thick'].map((value) => ({
                    value,
                    label: BORDER_WIDTH_LABELS[value],
                  }))}
                  onChange={(widthToken) =>
                    updateNormal({
                      border: {
                        ...liveRef.current.normal?.border,
                        widthToken: widthToken || 'thin',
                      },
                    })
                  }
                />
                <ColorRow
                  label="Border"
                  token={displayShell.normal?.border?.colorToken}
                  onChange={(el) => openColor('normal.border', el)}
                />
              </>
            )}
            {group === 'Border' && state === 'hover' && (
              <ColorRow
                label="Hover border"
                token={displayShell.hover?.border?.colorToken}
                onChange={(el) => openColor('hover.border', el)}
              />
            )}

            {group === 'Radius' && state === 'normal' && (
              <Select
                size="sm"
                label="Radius"
                value={displayShell.normal?.radius?.radiusToken || 'none'}
                data={['none', 'sm', 'md', 'lg', 'pill'].map((value) => ({
                  value,
                  label: RADIUS_SCALE_LABELS[value],
                }))}
                onChange={(radiusToken) =>
                  updateNormal({ radius: { radiusToken: radiusToken || 'none' } })
                }
              />
            )}

            {group === 'Shadow' && state === 'normal' && (
              <Select
                size="sm"
                label="Shadow"
                value={displayShell.normal?.shadow?.shadowToken || 'none'}
                data={[
                  { value: 'none', label: 'None' },
                  { value: 'shadowSoft', label: 'Soft' },
                  { value: 'shadowMedium', label: 'Medium' },
                  { value: 'shadowStrong', label: 'Strong' },
                ]}
                onChange={(shadowToken) =>
                  updateNormal({ shadow: { shadowToken: shadowToken || 'none' } })
                }
              />
            )}
            {group === 'Shadow' && state === 'hover' && (
              <Select
                size="sm"
                label="Hover shadow"
                value={displayShell.hover?.shadow?.shadowToken || 'none'}
                data={[
                  { value: 'none', label: 'None' },
                  { value: 'shadowSoft', label: 'Soft' },
                  { value: 'shadowMedium', label: 'Medium' },
                  { value: 'shadowStrong', label: 'Strong' },
                ]}
                onChange={(shadowToken) =>
                  updateHover({ shadow: { shadowToken: shadowToken || 'none' } })
                }
              />
            )}

            {group === 'Layout' && state === 'hover' && (
              <>
                <Select
                  size="sm"
                  label="Hover opacity"
                  value={
                    typeof displayShell.hover?.opacity === 'number'
                      ? String(displayShell.hover.opacity)
                      : '1'
                  }
                  data={[
                    { value: '1', label: '100%' },
                    { value: '0.9', label: '90%' },
                    { value: '0.8', label: '80%' },
                    { value: '0.6', label: '60%' },
                  ]}
                  onChange={(opacity) =>
                    updateHover({ opacity: opacity ? Number(opacity) : undefined })
                  }
                />
                <Select
                  size="sm"
                  label="Hover transform"
                  value={displayShell.hover?.transform || 'none'}
                  data={[
                    { value: 'none', label: 'None' },
                    { value: 'lift', label: 'Lift' },
                    { value: 'grow', label: 'Grow' },
                  ]}
                  onChange={(transform) =>
                    updateHover({
                      transform: (transform as 'none' | 'lift' | 'grow') || 'none',
                    })
                  }
                />
              </>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <ThemeColorPaletteModal
        opened={colorOpen}
        title="Button color"
        subtitle="Theme color tokens · Cancel restores"
        anchorEl={colorAnchor}
        value={currentColorToken || 'primary'}
        tokens={themeConfig?.tokens}
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
        includeBackgroundTokens
        supportedModes={['solid']}
        onClose={() => {
          setColorOpen(false)
          setColorTarget(null)
        }}
        onCancel={() => {
          if (preColorRef.current) commit(preColorRef.current)
          setColorOpen(false)
          setColorTarget(null)
        }}
        onSelectToken={(tokenId) => applyColorToken(tokenId)}
        onApplyToken={(tokenId) => {
          applyColorToken(tokenId)
          setColorOpen(false)
          setColorTarget(null)
        }}
      />
    </Stack>
  )
}
