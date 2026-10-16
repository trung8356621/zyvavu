'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Accordion,
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Sliders, Type } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme-engine/types'
import { WixFontPicker } from './WixFontPicker'
import { ThemeColorPalettePicker } from './ThemeColorPalettePicker'
import { SharedDraggableModal, type ModalPresentationMode } from '@/components/admin/shared/SharedDraggableModal'

export interface TypographyStyleValue {
  fontFamily?: string
  size?: string
  weight?: string
  color?: string
  lineHeight?: string
  letterSpacing?: string
}

export interface TypographyStyleModalProps {
  opened: boolean
  onClose: () => void
  title: string
  subtitle?: string
  value: TypographyStyleValue
  paletteTokens?: ThemeTokens
  defaultFontFamily?: string
  sampleText?: string
  isHeading?: boolean
  anchorEl?: HTMLElement | null
  mode?: ModalPresentationMode
  onChange?: (style: TypographyStyleValue) => void
  onApply?: (style: TypographyStyleValue) => void
  onCancel?: () => void
}

const WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi-Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
]

/**
 * Reusable Typography Style Modal
 *
 * Independent of ThemeCustomizer and backend APIs.
 * Supports visual font selection, size, weight, Theme Palette colors,
 * advanced line-height/letter-spacing, and live typography previews.
 */
export function TypographyStyleModal({
  opened,
  onClose,
  title,
  subtitle,
  value,
  paletteTokens,
  defaultFontFamily = 'Inter',
  sampleText,
  isHeading = true,
  anchorEl,
  mode = 'floating',
  onChange,
  onApply,
  onCancel,
}: TypographyStyleModalProps) {
  // Capture snapshot on open so Cancel can restore exact original
  const snapshotRef = useRef<TypographyStyleValue>(value)

  const defaultColor = paletteTokens?.colors?.text || '#17201f'

  const [currentFont, setCurrentFont] = useState(value.fontFamily || defaultFontFamily)
  const [currentSize, setCurrentSize] = useState(value.size || (isHeading ? '32px' : '16px'))
  const [currentWeight, setCurrentWeight] = useState(String(value.weight || (isHeading ? '600' : '400')))
  const [currentColor, setCurrentColor] = useState(value.color || defaultColor)
  const [currentLineHeight, setCurrentLineHeight] = useState(value.lineHeight || (isHeading ? '1.25' : '1.6'))
  const [currentLetterSpacing, setCurrentLetterSpacing] = useState(value.letterSpacing || 'normal')

  // Parse numerical size for slider
  const numericSize = parseInt(currentSize, 10) || (isHeading ? 32 : 16)

  // Sync state when modal opens
  useEffect(() => {
    if (opened) {
      const snap: TypographyStyleValue = {
        fontFamily: value.fontFamily || defaultFontFamily,
        size: value.size || (isHeading ? '32px' : '16px'),
        weight: String(value.weight || (isHeading ? '600' : '400')),
        color: value.color || paletteTokens?.colors?.text || '#17201f',
        lineHeight: value.lineHeight || (isHeading ? '1.25' : '1.6'),
        letterSpacing: value.letterSpacing || 'normal',
      }
      snapshotRef.current = snap
      setCurrentFont(snap.fontFamily!)
      setCurrentSize(snap.size!)
      setCurrentWeight(snap.weight!)
      setCurrentColor(snap.color!)
      setCurrentLineHeight(snap.lineHeight!)
      setCurrentLetterSpacing(snap.letterSpacing!)
    }
  }, [opened, value, defaultFontFamily, isHeading, paletteTokens?.colors?.text])

  const notifyChange = (updated: Partial<TypographyStyleValue>) => {
    const nextStyle: TypographyStyleValue = {
      fontFamily: updated.fontFamily ?? currentFont,
      size: updated.size ?? currentSize,
      weight: updated.weight ?? currentWeight,
      color: updated.color ?? currentColor,
      lineHeight: updated.lineHeight ?? currentLineHeight,
      letterSpacing: updated.letterSpacing ?? currentLetterSpacing,
    }
    onChange?.(nextStyle)
  }

  const handleFontChange = (font: string) => {
    setCurrentFont(font)
    notifyChange({ fontFamily: font })
  }

  const handleSizeChange = (sizeStr: string) => {
    setCurrentSize(sizeStr)
    notifyChange({ size: sizeStr })
  }

  const handleWeightChange = (weightStr: string) => {
    setCurrentWeight(weightStr)
    notifyChange({ weight: weightStr })
  }

  const handleColorChange = (colorStr: string) => {
    setCurrentColor(colorStr)
    notifyChange({ color: colorStr })
  }

  const handleLineHeightChange = (lhStr: string) => {
    setCurrentLineHeight(lhStr)
    notifyChange({ lineHeight: lhStr })
  }

  const handleLetterSpacingChange = (lsStr: string) => {
    setCurrentLetterSpacing(lsStr)
    notifyChange({ letterSpacing: lsStr })
  }

  const handleCancelClick = () => {
    onChange?.(snapshotRef.current)
    onCancel?.()
    onClose()
  }

  const handleApplyClick = () => {
    const finalStyle: TypographyStyleValue = {
      fontFamily: currentFont,
      size: currentSize,
      weight: currentWeight,
      color: currentColor,
      lineHeight: currentLineHeight,
      letterSpacing: currentLetterSpacing,
    }
    onApply?.(finalStyle)
    onClose()
  }

  return (
    <SharedDraggableModal
      opened={opened}
      onClose={handleCancelClick}
      title={title}
      subtitle={subtitle}
      headerExtra={<Type size={16} color="var(--mantine-color-teal-7, #0e6b66)" />}
      width={460}
      anchorEl={anchorEl}
      mode={mode}
      draggable={true}
      showCloseButton={true}
      closeOnClickOutside={false}
      closeOnEscape={true}
      zIndex={1000}
      footer={
        <Flex justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button color="teal" size="xs" onClick={handleApplyClick}>
            Apply Changes
          </Button>
        </Flex>
      }
    >
      <Stack gap="md">
        {/* Font Family Selection */}
        <WixFontPicker
          label="Font Family"
          description="Choose a curated or system typeface"
          value={currentFont}
          onChange={handleFontChange}
          size="sm"
        />

        {/* Size Slider & Input */}
        <Box>
          <Flex align="center" justify="space-between" mb={4}>
            <Text size="xs" fw={600}>
              Font Size
            </Text>
            <TextInput
              size="xs"
              value={currentSize}
              onChange={(e) => handleSizeChange(e.currentTarget.value)}
              style={{ width: 80 }}
            />
          </Flex>
          <Slider
            value={numericSize}
            min={isHeading ? 14 : 10}
            max={isHeading ? 80 : 36}
            step={1}
            size="xs"
            color="teal"
            onChange={(val) => handleSizeChange(`${val}px`)}
          />
        </Box>

        {/* Weight Selection */}
        <Select
          size="xs"
          label="Font Weight"
          data={WEIGHT_OPTIONS}
          value={currentWeight}
          onChange={(val) => val && handleWeightChange(val)}
        />

        {/* Typography Color from Theme Palette */}
        {paletteTokens && (
          <Box>
            <Flex align="center" justify="space-between" mb={6}>
              <div>
                <Text size="xs" fw={600}>
                  Text Color
                </Text>
                <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                  Select from Theme Palette
                </Text>
              </div>
              <Box
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: currentColor,
                  border: '1px solid rgba(0,0,0,0.18)',
                }}
              />
            </Flex>
            <ThemeColorPalettePicker
              tokens={paletteTokens}
              value={currentColor}
              onChange={handleColorChange}
            />
          </Box>
        )}

        {/* Advanced Section: Line Height & Letter Spacing */}
        <Accordion variant="separated">
          <Accordion.Item value="advanced">
            <Accordion.Control icon={<Sliders size={14} color="var(--mantine-color-dimmed)" />}>
              <Text size="xs" fw={600}>
                Advanced Typography (Spacing & Line Height)
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Group grow gap="xs">
                <TextInput
                  size="xs"
                  label="Line Height"
                  placeholder="e.g. 1.25"
                  value={currentLineHeight}
                  onChange={(e) => handleLineHeightChange(e.currentTarget.value)}
                />
                <TextInput
                  size="xs"
                  label="Letter Spacing"
                  placeholder="e.g. -0.02em"
                  value={currentLetterSpacing}
                  onChange={(e) => handleLetterSpacingChange(e.currentTarget.value)}
                />
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Live Typography Preview Box */}
        <Paper
          withBorder
          p="md"
          radius="sm"
          style={{
            background: 'var(--mantine-color-gray-0, #f8f9fa)',
            overflow: 'hidden',
          }}
        >
          <Text size="xs" c="dimmed" mb={6} fw={600} style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Live Sample
          </Text>
          <div
            style={{
              fontFamily: currentFont,
              fontSize: currentSize,
              fontWeight: currentWeight,
              lineHeight: currentLineHeight,
              letterSpacing: currentLetterSpacing,
              color: currentColor,
              wordBreak: 'break-word',
            }}
          >
            {sampleText ||
              (isHeading
                ? `${title} Sample Headline`
                : 'The quick brown fox jumps over the lazy dog. Comfortable reading across all devices.')}
          </div>
        </Paper>
      </Stack>
    </SharedDraggableModal>
  )
}
