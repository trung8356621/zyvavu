'use client'

import React, { useMemo, useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Tabs,
  Text,
} from '@mantine/core'
import {
  BoxSelect,
  Layers,
  Palette,
  Sliders,
  Type,
  X,
} from 'lucide-react'

import type { ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { SharedDraggableModal } from '@/components/admin/shared/SharedDraggableModal'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import { getComponentStyleCapabilities } from '@/lib/style-engine/capabilities'
import type {
  BackgroundConfig,
  BorderConfig,
  DimensionsConfig,
  EffectsConfig,
  GradientDef,
  MeshDef,
  RadiusConfig,
  ShadowConfig,
  SpacingConfig,
  StyleDomain,
  TypographyStyleConfig,
  UniversalStyle,
} from '@/lib/style-engine/types'

import { TypographyStyleControl } from './style-controls/TypographyStyleControl'
import { BackgroundStyleControl } from './style-controls/BackgroundStyleControl'
import { SpacingDimensionsControl } from './style-controls/SpacingDimensionsControl'
import { BordersEffectsControl } from './style-controls/BordersEffectsControl'

export interface WidgetStyleContextMenuProps {
  opened: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
  componentType: string
  componentId: string
  currentStyle?: WidgetSemanticStyle
  themeConfig?: ThemeConfig
  onUpdateStyle: (style: WidgetSemanticStyle) => void
}

export function WidgetStyleContextMenu({
  opened,
  onClose,
  anchorEl,
  componentType,
  componentId,
  currentStyle = {},
  themeConfig,
  onUpdateStyle,
}: WidgetStyleContextMenuProps) {
  // Color Modal Target: 'text' | 'background' | 'overlay' | 'border' | null
  const [colorModalTarget, setColorModalTarget] = useState<
    'text' | 'background' | 'overlay' | 'border' | null
  >(null)

  // Manifest and Style Capability check
  const manifest = useMemo(() => {
    try {
      return getWidgetManifest(componentType)
    } catch {
      return null
    }
  }, [componentType])

  const capabilities: StyleDomain[] = useMemo(() => {
    return getComponentStyleCapabilities(componentType, manifest || undefined)
  }, [componentType, manifest])

  const hasTypography = capabilities.includes('typography')
  const hasBackground = capabilities.includes('background')
  const hasSpacingOrDimensions =
    capabilities.includes('spacing') ||
    capabilities.includes('dimensions') ||
    capabilities.includes('section')
  const hasBorderOrEffects =
    capabilities.includes('border') ||
    capabilities.includes('shadow') ||
    capabilities.includes('effects')

  // Initial active tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (componentType === 'Section' && hasBackground) return 'background'
    if (hasTypography) return 'typography'
    if (hasBackground) return 'background'
    if (hasSpacingOrDimensions) return 'spacing'
    return 'borders'
  })

  // Normalize currentStyle into UniversalStyle
  const normalizedStyle: UniversalStyle = useMemo(() => {
    const s = currentStyle as UniversalStyle
    return {
      ...s,
      typography: {
        typography: s.typography?.typography || (typeof currentStyle.typography === 'string' ? currentStyle.typography : undefined),
        colorToken: s.typography?.colorToken || currentStyle.colorToken,
        align: s.typography?.align || currentStyle.align,
        effectPreset: s.typography?.effectPreset,
        letterSpacing: s.typography?.letterSpacing,
        lineHeight: s.typography?.lineHeight,
        verticalText: s.typography?.verticalText,
      },
      background: s.background || (currentStyle.backgroundToken ? { mode: 'color', colorToken: currentStyle.backgroundToken } : undefined),
      spacing: s.spacing && typeof s.spacing === 'object' ? s.spacing : { padding: { token: typeof currentStyle.spacing === 'string' ? currentStyle.spacing : 'md' } },
      radius: s.radius && typeof s.radius === 'object' ? s.radius : { radiusToken: typeof currentStyle.radius === 'string' ? currentStyle.radius : 'none' },
    }
  }, [currentStyle])

  const update = (partial: Partial<UniversalStyle>) => {
    const merged: WidgetSemanticStyle = {
      ...currentStyle,
      ...normalizedStyle,
      ...partial,
      // Maintain legacy top-level mirrors for backward compatibility
      colorToken: partial.typography?.colorToken || normalizedStyle.typography?.colorToken || currentStyle.colorToken,
      align: partial.typography?.align || normalizedStyle.typography?.align || currentStyle.align,
      backgroundToken: partial.background?.colorToken || normalizedStyle.background?.colorToken || currentStyle.backgroundToken,
    }
    onUpdateStyle(merged)
  }

  if (!opened) return null

  return (
    <>
      <SharedDraggableModal
        opened={opened}
        onClose={onClose}
        title={`Style: ${manifest?.label || componentType}`}
        subtitle={`Configure presentation without handwritten CSS`}
        headerExtra={<Sliders size={15} color="var(--mantine-color-teal-7, #0e6b66)" />}
        width={340}
        anchorEl={anchorEl}
        mode="floating"
        draggable={true}
        showCloseButton={true}
        closeOnClickOutside={false}
        closeOnEscape={true}
        zIndex={1050}
        footer={
          <Group justify="space-between" w="100%">
            <Text size="xs" c="dimmed">
              Prop: {componentId}
            </Text>
            <Button size="xs" color="teal" onClick={onClose}>
              Done
            </Button>
          </Group>
        }
      >
        <Stack gap="xs">
          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={(val) => setActiveTab(val || 'typography')}
            variant="pills"
            color="teal"
          >
            <Tabs.List grow mb="xs">
              {hasTypography && (
                <Tabs.Tab value="typography" leftSection={<Type size={12} />}>
                  Type
                </Tabs.Tab>
              )}
              {hasBackground && (
                <Tabs.Tab value="background" leftSection={<Palette size={12} />}>
                  Backdrop
                </Tabs.Tab>
              )}
              {hasSpacingOrDimensions && (
                <Tabs.Tab value="spacing" leftSection={<BoxSelect size={12} />}>
                  Layout
                </Tabs.Tab>
              )}
              {hasBorderOrEffects && (
                <Tabs.Tab value="borders" leftSection={<Layers size={12} />}>
                  Borders
                </Tabs.Tab>
              )}
            </Tabs.List>
          </Tabs>

          {/* 1. TYPOGRAPHY DOMAIN */}
          {activeTab === 'typography' && hasTypography && (
            <TypographyStyleControl
              value={normalizedStyle.typography}
              themeConfig={themeConfig}
              onChange={(typo) => update({ typography: typo })}
              onOpenColorModal={() => setColorModalTarget('text')}
            />
          )}

          {/* 2. BACKGROUND DOMAIN */}
          {activeTab === 'background' && hasBackground && (
            <BackgroundStyleControl
              value={normalizedStyle.background}
              themeConfig={themeConfig}
              onChange={(bg) => update({ background: bg })}
              onOpenColorModal={(target) =>
                setColorModalTarget(target === 'background' ? 'background' : 'overlay')
              }
            />
          )}

          {/* 3. SPACING & DIMENSIONS DOMAIN */}
          {activeTab === 'spacing' && hasSpacingOrDimensions && (
            <SpacingDimensionsControl
              spacing={normalizedStyle.spacing}
              dimensions={normalizedStyle.dimensions}
              showDimensions={capabilities.includes('dimensions') || capabilities.includes('section')}
              onChangeSpacing={(sp) => update({ spacing: sp })}
              onChangeDimensions={(dim) => update({ dimensions: dim })}
            />
          )}

          {/* 4. BORDERS & EFFECTS DOMAIN */}
          {activeTab === 'borders' && hasBorderOrEffects && (
            <BordersEffectsControl
              border={normalizedStyle.border}
              radius={normalizedStyle.radius}
              shadow={normalizedStyle.shadow}
              effects={normalizedStyle.effects}
              onChangeBorder={(border) => update({ border })}
              onChangeRadius={(radius) => update({ radius })}
              onChangeShadow={(shadow) => update({ shadow })}
              onChangeEffects={(effects) => update({ effects })}
              onOpenColorModal={() => setColorModalTarget('border')}
            />
          )}
        </Stack>
      </SharedDraggableModal>

      {/* Unified Color / Gradient / Mesh Modal */}
      {colorModalTarget && (
        <ThemeColorPaletteModal
          opened={Boolean(colorModalTarget)}
          anchorEl={anchorEl}
          title={
            colorModalTarget === 'text'
              ? 'Theme Typography Color'
              : colorModalTarget === 'overlay'
                ? 'Theme Overlay Color'
                : colorModalTarget === 'border'
                  ? 'Theme Border Color'
                  : 'Theme Background & Palette'
          }
          subtitle="Select semantic theme tokens or custom gradients"
          value={
            colorModalTarget === 'text'
              ? normalizedStyle.typography?.colorToken || 'text'
              : colorModalTarget === 'overlay'
                ? normalizedStyle.background?.image?.overlay?.colorToken || 'text'
                : colorModalTarget === 'border'
                  ? normalizedStyle.border?.colorToken || 'border'
                  : normalizedStyle.background?.colorToken || 'surface'
          }
          tokens={themeConfig?.tokens}
          zIndex={1150}
          supportedModes={
            colorModalTarget === 'background'
              ? ['solid', 'gradient', 'mesh']
              : ['solid']
          }
          gradientValue={normalizedStyle.background?.gradient}
          meshValue={normalizedStyle.background?.mesh}
          onClose={() => setColorModalTarget(null)}
          onApplyToken={(tokenId) => {
            if (colorModalTarget === 'text') {
              update({
                typography: {
                  ...normalizedStyle.typography,
                  colorToken: tokenId,
                },
              })
            } else if (colorModalTarget === 'overlay') {
              if (normalizedStyle.background?.mode === 'image') {
                update({
                  background: {
                    ...normalizedStyle.background,
                    image: {
                      ...normalizedStyle.background?.image,
                      overlay: {
                        ...normalizedStyle.background?.image?.overlay,
                        colorToken: tokenId,
                      },
                    },
                  },
                })
              } else if (normalizedStyle.background?.mode === 'video') {
                update({
                  background: {
                    ...normalizedStyle.background,
                    video: {
                      ...normalizedStyle.background?.video,
                      overlay: {
                        ...normalizedStyle.background?.video?.overlay,
                        colorToken: tokenId,
                      },
                    },
                  },
                })
              }
            } else if (colorModalTarget === 'border') {
              update({
                border: {
                  ...normalizedStyle.border,
                  colorToken: tokenId,
                },
              })
            } else {
              update({
                background: {
                  ...normalizedStyle.background,
                  mode: 'color',
                  colorToken: tokenId,
                  gradient: undefined,
                  mesh: undefined,
                },
              })
            }
          }}
          onApplyGradient={(gradient: GradientDef) => {
            update({
              background: {
                ...normalizedStyle.background,
                mode: 'color',
                gradient,
                mesh: undefined,
              },
            })
          }}
          onApplyMesh={(mesh: MeshDef) => {
            update({
              background: {
                ...normalizedStyle.background,
                mode: 'color',
                mesh,
                gradient: undefined,
              },
            })
          }}
        />
      )}
    </>
  )
}
