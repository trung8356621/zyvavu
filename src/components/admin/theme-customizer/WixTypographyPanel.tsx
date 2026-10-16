'use client'

import React from 'react'
import type { ThemeTokens } from '@/lib/theme-engine/types'
import {
  TypographyStyleModal,
  type TypographyStyleValue,
  type TypographyStyleModalProps,
} from './TypographyStyleModal'

export type TypographyStyleData = TypographyStyleValue

export interface WixTypographyPanelProps {
  opened: boolean
  onClose: () => void
  title: string
  subtitle?: string
  initialStyle?: TypographyStyleData
  value?: TypographyStyleData
  paletteTokens?: ThemeTokens
  defaultFontFamily?: string
  sampleText?: string
  isHeading?: boolean
  anchorEl?: HTMLElement | null
  onChange?: (style: TypographyStyleData) => void
  onLiveChange?: (style: TypographyStyleData) => void
  onApply?: (style: TypographyStyleData) => void
  onCancel?: () => void
}

export function WixTypographyPanel({
  opened,
  onClose,
  title,
  subtitle,
  initialStyle,
  value,
  paletteTokens,
  defaultFontFamily = 'Inter',
  sampleText,
  isHeading = true,
  anchorEl,
  onChange,
  onLiveChange,
  onApply,
  onCancel,
}: WixTypographyPanelProps) {
  const currentVal = value || initialStyle || {}
  const handleChange = onChange || onLiveChange

  return (
    <TypographyStyleModal
      opened={opened}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      value={currentVal}
      paletteTokens={paletteTokens}
      defaultFontFamily={defaultFontFamily}
      sampleText={sampleText}
      isHeading={isHeading}
      anchorEl={anchorEl}
      onChange={handleChange}
      onApply={onApply}
      onCancel={onCancel}
    />
  )
}

export { TypographyStyleModal }
