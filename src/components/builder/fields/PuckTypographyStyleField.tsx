'use client'

import React, { useCallback, useRef, useState } from 'react'
import type { CustomField } from '@puckeditor/core'
import { createUsePuck } from '@puckeditor/core'
import { Stack } from '@mantine/core'
import { TypographyStyleControl } from '@/components/admin/theme-builder/style-controls/TypographyStyleControl'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import { useBuilderChrome } from '@/components/builder/core/editor-bridge'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { resetStyleDomain } from '@/lib/style-engine/domains'
import type { TypographyStyleConfig } from '@/lib/style-engine/types'
import type { WidgetSemanticStyle } from '@/lib/theme-engine/types'

const usePuck = createUsePuck()

function normalizeTypography(style?: WidgetSemanticStyle): TypographyStyleConfig {
  const s = style || {}
  const typo =
    s.typography && typeof s.typography === 'object'
      ? s.typography
      : typeof s.typography === 'string'
        ? { typography: s.typography }
        : {}
  return {
    ...typo,
    colorToken: typo.colorToken || s.colorToken,
    align: typo.align || s.align,
  }
}

function applyTypography(
  style: WidgetSemanticStyle | undefined,
  typography: TypographyStyleConfig,
): WidgetSemanticStyle {
  const next: WidgetSemanticStyle & Record<string, unknown> = {
    ...(style || {}),
    typography,
  }
  if (typography.colorToken) next.colorToken = typography.colorToken
  else delete next.colorToken
  if (typography.align) next.align = typography.align
  else delete next.align
  return next
}

/**
 * Puck Fields adapter for Style Engine typography.
 * Writes `props.style.typography` (+ legacy colorToken/align) via field onChange.
 */
export function PuckTypographyStyleFieldRender({
  value,
  onChange,
  readOnly,
  htmlTag,
  widgetType,
}: {
  value?: WidgetSemanticStyle
  onChange: (style: WidgetSemanticStyle) => void
  readOnly?: boolean
  htmlTag?: string | null
  widgetType?: string | null
}) {
  const { themeConfig } = useBuilderChrome()
  const [colorOpen, setColorOpen] = useState(false)
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null)
  const preColorRef = useRef<WidgetSemanticStyle | null>(null)
  const liveRef = useRef<WidgetSemanticStyle>(value || {})

  liveRef.current = value || {}

  const typography = normalizeTypography(value)

  const commitTypography = useCallback(
    (nextTypo: TypographyStyleConfig) => {
      if (readOnly) return
      onChange(applyTypography(liveRef.current, nextTypo))
    },
    [onChange, readOnly],
  )

  const handleResetDomain = useCallback(() => {
    if (readOnly) return
    onChange(resetStyleDomain(liveRef.current || {}, 'typography') as WidgetSemanticStyle)
  }, [onChange, readOnly])

  return (
    <Stack gap="xs">
      <TypographyStyleControl
        value={typography}
        themeConfig={themeConfig}
        htmlTag={htmlTag}
        widgetType={widgetType}
        onChange={commitTypography}
        onResetDomain={handleResetDomain}
        onOpenColorModal={(el) => {
          if (readOnly) return
          preColorRef.current = liveRef.current
          setColorAnchor(el || null)
          setColorOpen(true)
        }}
      />
      {colorOpen && (
        <ThemeColorPaletteModal
          opened={colorOpen}
          title="Theme Typography Color"
          subtitle="Theme color tokens · Cancel restores"
          anchorEl={colorAnchor}
          value={typography.colorToken || 'text'}
          tokens={themeConfig?.tokens}
          zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
          includeBackgroundTokens
          supportedModes={['solid']}
          onClose={() => setColorOpen(false)}
          onCancel={() => {
            if (preColorRef.current) onChange(preColorRef.current)
            setColorOpen(false)
          }}
          onSelectToken={(tokenId) => {
            commitTypography({ ...normalizeTypography(liveRef.current), colorToken: tokenId })
          }}
          onApplyToken={(tokenId) => {
            commitTypography({ ...normalizeTypography(liveRef.current), colorToken: tokenId })
            setColorOpen(false)
          }}
        />
      )}
    </Stack>
  )
}

/** Connected field: reads HTML tag / widget type from the selected Puck item for effective values. */
function PuckTypographyStyleFieldConnected({
  value,
  onChange,
  readOnly,
}: {
  value?: WidgetSemanticStyle
  onChange: (style: WidgetSemanticStyle) => void
  readOnly?: boolean
}) {
  const selected = usePuck((state) => state.selectedItem)
  return (
    <PuckTypographyStyleFieldRender
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      htmlTag={typeof selected?.props?.tag === 'string' ? selected.props.tag : null}
      widgetType={selected?.type || null}
    />
  )
}

export const puckTypographyStyleField: CustomField<WidgetSemanticStyle> = {
  type: 'custom',
  label: 'Typography',
  render: ({ value, onChange, readOnly }) => (
    <PuckTypographyStyleFieldConnected value={value} onChange={onChange} readOnly={readOnly} />
  ),
}
