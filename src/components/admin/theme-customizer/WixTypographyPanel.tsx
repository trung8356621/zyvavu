'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Accordion,
  Box,
  Button,
  Flex,
  Group,
  Modal,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Sliders, Type } from 'lucide-react'
import { WixFontPicker } from './WixFontPicker'

export interface TypographyStyleData {
  fontFamily?: string
  size?: string
  weight?: string
  lineHeight?: string
  letterSpacing?: string
}

export interface WixTypographyPanelProps {
  opened: boolean
  onClose: () => void
  title: string
  subtitle?: string
  initialStyle: TypographyStyleData
  defaultFontFamily: string
  isHeading?: boolean
  onLiveChange: (style: TypographyStyleData) => void
  onApply: (style: TypographyStyleData) => void
  onCancel: () => void
}

const WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi-Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
]

export function WixTypographyPanel({
  opened,
  onClose,
  title,
  subtitle,
  initialStyle,
  defaultFontFamily,
  isHeading = true,
  onLiveChange,
  onApply,
  onCancel,
}: WixTypographyPanelProps) {
  // Capture snapshot on open so Cancel can restore exact original
  const snapshotRef = useRef<TypographyStyleData>(initialStyle)

  const [currentFont, setCurrentFont] = useState(initialStyle.fontFamily || defaultFontFamily)
  const [currentSize, setCurrentSize] = useState(initialStyle.size || (isHeading ? '32px' : '16px'))
  const [currentWeight, setCurrentWeight] = useState(String(initialStyle.weight || (isHeading ? '600' : '400')))
  const [currentLineHeight, setCurrentLineHeight] = useState(initialStyle.lineHeight || (isHeading ? '1.25' : '1.6'))
  const [currentLetterSpacing, setCurrentLetterSpacing] = useState(initialStyle.letterSpacing || 'normal')

  // Parse numerical size for slider
  const numericSize = parseInt(currentSize, 10) || (isHeading ? 32 : 16)

  // Sync state when modal opens
  useEffect(() => {
    if (opened) {
      const snap: TypographyStyleData = {
        fontFamily: initialStyle.fontFamily || defaultFontFamily,
        size: initialStyle.size || (isHeading ? '32px' : '16px'),
        weight: String(initialStyle.weight || (isHeading ? '600' : '400')),
        lineHeight: initialStyle.lineHeight || (isHeading ? '1.25' : '1.6'),
        letterSpacing: initialStyle.letterSpacing || 'normal',
      }
      snapshotRef.current = snap
      setCurrentFont(snap.fontFamily!)
      setCurrentSize(snap.size!)
      setCurrentWeight(snap.weight!)
      setCurrentLineHeight(snap.lineHeight!)
      setCurrentLetterSpacing(snap.letterSpacing!)
    }
  }, [opened, initialStyle, defaultFontFamily, isHeading])

  const notifyChange = (updated: Partial<TypographyStyleData>) => {
    const nextStyle: TypographyStyleData = {
      fontFamily: updated.fontFamily ?? currentFont,
      size: updated.size ?? currentSize,
      weight: updated.weight ?? currentWeight,
      lineHeight: updated.lineHeight ?? currentLineHeight,
      letterSpacing: updated.letterSpacing ?? currentLetterSpacing,
    }
    onLiveChange(nextStyle)
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

  const handleLineHeightChange = (lhStr: string) => {
    setCurrentLineHeight(lhStr)
    notifyChange({ lineHeight: lhStr })
  }

  const handleLetterSpacingChange = (lsStr: string) => {
    setCurrentLetterSpacing(lsStr)
    notifyChange({ letterSpacing: lsStr })
  }

  const handleCancelClick = () => {
    onLiveChange(snapshotRef.current)
    onCancel()
    onClose()
  }

  const handleApplyClick = () => {
    const finalStyle: TypographyStyleData = {
      fontFamily: currentFont,
      size: currentSize,
      weight: currentWeight,
      lineHeight: currentLineHeight,
      letterSpacing: currentLetterSpacing,
    }
    onApply(finalStyle)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleCancelClick}
      title={
        <Group gap={6}>
          <Type size={18} color="var(--mantine-color-teal-7, #0e6b66)" />
          <div>
            <Text fw={700} size="sm">
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                {subtitle}
              </Text>
            )}
          </div>
        </Group>
      }
      size="md"
      centered
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
              wordBreak: 'break-word',
              color: '#17201f',
            }}
          >
            {isHeading
              ? `${title} Sample Headline`
              : 'The quick brown fox jumps over the lazy dog. Comfortable reading across all devices.'}
          </div>
        </Paper>

        {/* Action Buttons: Cancel and Apply */}
        <Flex justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" size="xs" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button color="teal" size="xs" onClick={handleApplyClick}>
            Apply Changes
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}
