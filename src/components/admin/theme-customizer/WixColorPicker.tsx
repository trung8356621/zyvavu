'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import {
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Popover,
  Slider,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { validateColorString } from '@/lib/theme-engine/presets'

export type WixColorPickerVariant = 'row' | 'basic-swatch' | 'strip-segment' | 'accent-swatch'

export type WixColorPickerProps = {
  label: string
  description?: string
  value: string
  onChange: (newColor: string) => void
  variant?: WixColorPickerVariant
  stripPosition?: 'first' | 'middle' | 'last'
}

export function normalizeHex(color: string, fallback = '#0e6b66'): string {
  if (!color || typeof color !== 'string') return fallback
  const trimmed = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    return trimmed.slice(0, 7).toLowerCase()
  }
  return fallback
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = normalizeHex(hex).replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

function hsvToHex(h: number, s: number, v: number): string {
  const hNorm = ((h % 360) + 360) % 360 / 360
  const sNorm = Math.max(0, Math.min(100, s)) / 100
  const vNorm = Math.max(0, Math.min(100, v)) / 100

  const i = Math.floor(hNorm * 6)
  const f = hNorm * 6 - i
  const p = vNorm * (1 - sNorm)
  const q = vNorm * (1 - f * sNorm)
  const t = vNorm * (1 - (1 - f) * sNorm)

  let r = 0
  let g = 0
  let b = 0

  switch (i % 6) {
    case 0:
      r = vNorm
      g = t
      b = p
      break
    case 1:
      r = q
      g = vNorm
      b = p
      break
    case 2:
      r = p
      g = vNorm
      b = t
      break
    case 3:
      r = p
      g = q
      b = vNorm
      break
    case 4:
      r = t
      g = p
      b = vNorm
      break
    case 5:
      r = vNorm
      g = p
      b = q
      break
  }

  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function WixColorPicker({
  label,
  description,
  value,
  onChange,
  variant = 'row',
  stripPosition = 'middle',
}: WixColorPickerProps) {
  const committedColor = normalizeHex(value)
  const [opened, setOpened] = useState(false)
  const [tempColor, setTempColor] = useState<string>(committedColor)
  const [hexInput, setHexInput] = useState<string>(committedColor)
  const [showAdvancedHex, setShowAdvancedHex] = useState(false)

  useEffect(() => {
    if (!opened) {
      const norm = normalizeHex(value)
      setTempColor(norm)
      setHexInput(norm)
    }
  }, [value, opened])

  const hsv = useMemo(() => hexToHsv(tempColor), [tempColor])

  const handleOpenChange = (nextOpened: boolean) => {
    if (nextOpened) {
      const norm = normalizeHex(value)
      setTempColor(norm)
      setHexInput(norm)
      setShowAdvancedHex(false)
    }
    setOpened(nextOpened)
  }

  const handlePickerChange = (newHex: string) => {
    setTempColor(newHex)
    setHexInput(newHex)
  }

  const handleSaturationChange = (nextS: number) => {
    const nextHex = hsvToHex(hsv.h, nextS, hsv.v)
    setTempColor(nextHex)
    setHexInput(nextHex)
  }

  const handleBrightnessChange = (nextV: number) => {
    const nextHex = hsvToHex(hsv.h, hsv.s, nextV)
    setTempColor(nextHex)
    setHexInput(nextHex)
  }

  const handleHexInputChange = (raw: string) => {
    setHexInput(raw)
    const formatted = raw.startsWith('#') ? raw.trim() : `#${raw.trim()}`
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(formatted)) {
      setTempColor(normalizeHex(formatted, tempColor))
    }
  }

  const handleCancel = () => {
    const norm = normalizeHex(value)
    setTempColor(norm)
    setHexInput(norm)
    setShowAdvancedHex(false)
    setOpened(false)
  }

  const handleApply = () => {
    const candidate = hexInput.startsWith('#') ? hexInput.trim() : `#${hexInput.trim()}`
    const finalColor = validateColorString(candidate)
      ? normalizeHex(candidate, tempColor)
      : tempColor
    onChange(finalColor)
    setOpened(false)
  }

  const renderTrigger = () => {
    if (variant === 'basic-swatch') {
      return (
        <UnstyledButton
          onClick={() => handleOpenChange(!opened)}
          aria-label={`Edit ${label}`}
          aria-expanded={opened}
          style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
        >
          <Paper
            withBorder
            p={8}
            radius="sm"
            style={{
              cursor: 'pointer',
              borderColor: opened
                ? 'var(--mantine-color-primary, #0e6b66)'
                : undefined,
              borderWidth: opened ? 2 : 1,
              transition: 'border-color 0.15s ease',
            }}
          >
            <Box
              style={{
                width: '100%',
                height: 36,
                borderRadius: 4,
                backgroundColor: committedColor,
                border: '1px solid rgba(0,0,0,0.12)',
                marginBottom: 6,
              }}
            />
            <Text size="xs" fw={600} truncate>
              {label}
            </Text>
            {description && (
              <Text size="xs" c="dimmed" truncate style={{ fontSize: 10 }}>
                {description}
              </Text>
            )}
          </Paper>
        </UnstyledButton>
      )
    }

    if (variant === 'strip-segment') {
      const borderRadius =
        stripPosition === 'first'
          ? '6px 0 0 6px'
          : stripPosition === 'last'
            ? '0 6px 6px 0'
            : '0'

      return (
        <Tooltip label={label} position="top" withArrow>
          <UnstyledButton
            onClick={() => handleOpenChange(!opened)}
            aria-label={`Edit ${label}`}
            aria-expanded={opened}
            style={{ flex: 1, minWidth: 0, display: 'block' }}
          >
            <Box
              style={{
                height: 34,
                backgroundColor: committedColor,
                borderRadius,
                border: opened
                  ? '2px solid var(--mantine-color-primary, #0e6b66)'
                  : '1px solid rgba(0,0,0,0.12)',
                cursor: 'pointer',
                transition: 'transform 0.1s ease, border-color 0.15s ease',
              }}
            />
            <Text size="xs" c="dimmed" ta="center" mt={4} style={{ fontSize: 11 }}>
              {description || label}
            </Text>
          </UnstyledButton>
        </Tooltip>
      )
    }

    if (variant === 'accent-swatch') {
      return (
        <UnstyledButton
          onClick={() => handleOpenChange(!opened)}
          aria-label={`Edit ${label}`}
          aria-expanded={opened}
          style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
        >
          <Paper
            withBorder
            p={8}
            radius="sm"
            style={{
              cursor: 'pointer',
              borderColor: opened
                ? 'var(--mantine-color-primary, #0e6b66)'
                : undefined,
              borderWidth: opened ? 2 : 1,
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: committedColor,
                  border: '1px solid rgba(0,0,0,0.12)',
                  flexShrink: 0,
                }}
              />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text size="xs" fw={600} truncate>
                  {label}
                </Text>
                {description && (
                  <Text size="xs" c="dimmed" truncate style={{ fontSize: 10 }}>
                    {description}
                  </Text>
                )}
              </Box>
            </Group>
          </Paper>
        </UnstyledButton>
      )
    }

    return (
      <UnstyledButton
        onClick={() => handleOpenChange(!opened)}
        aria-label={`Edit ${label}`}
        aria-expanded={opened}
        style={{ width: '100%', display: 'block', textAlign: 'left' }}
      >
        <Paper
          withBorder
          p="xs"
          radius="sm"
          style={{
            width: '100%',
            cursor: 'pointer',
            borderColor: opened
              ? 'var(--mantine-color-primary, #0e6b66)'
              : undefined,
            borderWidth: opened ? 2 : 1,
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
        >
          <Flex align="center" justify="space-between" gap="xs">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                {label}
              </Text>
              {description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {description}
                </Text>
              )}
            </Box>
            <Box
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: committedColor,
                border: '2px solid var(--mantine-color-default-border, #dfe5e2)',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                flexShrink: 0,
              }}
            />
          </Flex>
        </Paper>
      </UnstyledButton>
    )
  }

  return (
    <Popover
      opened={opened}
      onChange={handleOpenChange}
      position="right-start"
      offset={12}
      withArrow
      shadow="md"
      withinPortal
      zIndex={1000}
      middlewares={{ flip: true, shift: { padding: 12 } }}
    >
      <Popover.Target>{renderTrigger()}</Popover.Target>

      <Popover.Dropdown p="sm" style={{ width: 268 }}>
        <Stack gap="xs">
          <Flex align="center" justify="space-between">
            <Text size="xs" fw={700}>
              {label}
            </Text>
            <Group gap={6} align="center">
              <Text size="xs" c="dimmed">
                Preview:
              </Text>
              <Group gap={4} align="center">
                <Box
                  title="Current color"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: committedColor,
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
                <Text size="xs" c="dimmed">
                  →
                </Text>
                <Box
                  title="Selected color"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    backgroundColor: tempColor,
                    border: '2px solid var(--mantine-color-primary, #0e6b66)',
                  }}
                />
              </Group>
            </Group>
          </Flex>

          <Box className="zyvavu-color-picker-surface" style={{ width: '100%' }}>
            <HexColorPicker
              color={tempColor}
              onChange={handlePickerChange}
              style={{ width: '100%', height: 155 }}
            />
          </Box>

          {/* Saturation & Brightness adjustment sliders */}
          <Stack gap={6} mt={2}>
            <Box>
              <Flex justify="space-between" mb={2}>
                <Text size="xs" c="dimmed">
                  Saturation
                </Text>
                <Text size="xs" c="dimmed">
                  {hsv.s}%
                </Text>
              </Flex>
              <Slider
                size="xs"
                min={0}
                max={100}
                value={hsv.s}
                onChange={handleSaturationChange}
                label={null}
              />
            </Box>
            <Box>
              <Flex justify="space-between" mb={2}>
                <Text size="xs" c="dimmed">
                  Brightness
                </Text>
                <Text size="xs" c="dimmed">
                  {hsv.v}%
                </Text>
              </Flex>
              <Slider
                size="xs"
                min={0}
                max={100}
                value={hsv.v}
                onChange={handleBrightnessChange}
                label={null}
              />
            </Box>
          </Stack>

          <Box>
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              rightSection={
                showAdvancedHex ? <ChevronUp size={12} /> : <ChevronDown size={12} />
              }
              onClick={() => setShowAdvancedHex((prev) => !prev)}
              px={4}
            >
              Advanced (HEX)
            </Button>
            {showAdvancedHex && (
              <Box pt={6}>
                <TextInput
                  size="xs"
                  label="HEX Code"
                  placeholder="#0e6b66"
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.currentTarget.value)}
                />
              </Box>
            )}
          </Box>

          <Group grow gap="xs" mt={4}>
            <Button variant="default" size="xs" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              color="teal"
              size="xs"
              leftSection={<Check size={14} />}
              onClick={handleApply}
            >
              Apply
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
