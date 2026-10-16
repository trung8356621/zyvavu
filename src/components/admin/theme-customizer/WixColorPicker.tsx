'use client'

import React, { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import {
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Popover,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { validateColorString } from '@/lib/theme-engine/presets'

export type WixColorPickerProps = {
  label: string
  description?: string
  value: string
  onChange: (newColor: string) => void
}

function normalizeHex(color: string, fallback = '#0e6b66'): string {
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

export function WixColorPicker({
  label,
  description,
  value,
  onChange,
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
      <Popover.Target>
        <UnstyledButton
          onClick={() => handleOpenChange(!opened)}
          aria-label={`Chọn màu: ${label}`}
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
      </Popover.Target>

      <Popover.Dropdown p="sm" style={{ width: 260 }}>
        <Stack gap="xs">
          <Flex align="center" justify="space-between">
            <Text size="xs" fw={700}>
              {label}
            </Text>
            <Group gap={6} align="center">
              <Text size="xs" c="dimmed">
                Xem trước:
              </Text>
              <Group gap={4} align="center">
                <Box
                  title="Màu hiện tại"
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
                  title="Màu đang chọn"
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

          <Box
            className="zyvavu-color-picker-surface"
            style={{
              width: '100%',
            }}
          >
            <HexColorPicker
              color={tempColor}
              onChange={handlePickerChange}
              style={{ width: '100%', height: 170 }}
            />
          </Box>

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
              Tùy chọn nâng cao (HEX)
            </Button>
            {showAdvancedHex && (
              <Box pt={6}>
                <TextInput
                  size="xs"
                  label="Mã màu HEX"
                  placeholder="#0e6b66"
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.currentTarget.value)}
                />
              </Box>
            )}
          </Box>

          <Group grow gap="xs" mt={4}>
            <Button variant="default" size="xs" onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              color="teal"
              size="xs"
              leftSection={<Check size={14} />}
              onClick={handleApply}
            >
              Áp dụng
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
