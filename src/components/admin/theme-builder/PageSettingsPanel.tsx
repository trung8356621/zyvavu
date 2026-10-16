'use client'

import React, { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { AlertTriangle, Code, Image as ImageIcon, Layout, Palette, Settings, Type } from 'lucide-react'
import { usePuck } from '@puckeditor/core'

import type { PageSettings, ThemeConfig, ThemeTokens } from '@/lib/theme-engine/types'
import { resolveColorToken } from '@/lib/theme-engine/page-settings'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'

export interface PageSettingsPanelProps {
  themeConfig?: ThemeConfig
  templateName?: string
}

export function PageSettingsPanel({ themeConfig, templateName }: PageSettingsPanelProps) {
  const { appState, dispatch } = usePuck()

  const [colorModalTarget, setColorModalTarget] = useState<'background' | 'text' | null>(null)
  const [colorModalAnchor, setColorModalAnchor] = useState<HTMLElement | null>(null)

  // Current page settings from Puck document root
  const rootProps = (appState.data?.root?.props as Record<string, any>) || {}
  const pageSettings: PageSettings = (rootProps.pageSettings as PageSettings) || {}

  const background = pageSettings.background || { type: 'theme' }
  const text = pageSettings.text || { typography: 'p1', colorToken: 'text' }
  const layout = pageSettings.layout || { containerWidth: 'containerWidth', spacing: 'md', alignment: 'left' }
  const customCSS = pageSettings.customCSS || ''
  const customJS = pageSettings.customJS || ''

  // Typography options discovered from theme config
  const typographyOptions = useMemo(() => {
    const typo = (themeConfig?.tokens?.typography || {}) as Record<string, any>
    const knownKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3']
    const keys = Array.from(new Set([...knownKeys, ...Object.keys(typo).filter((k) => typeof typo[k] === 'object')]))

    return keys.map((k) => ({
      value: k,
      label: k.toUpperCase().startsWith('H') ? `${k.toUpperCase()} (Heading ${k.slice(1)})` : `${k.toUpperCase()} (Body ${k.slice(1)})`,
    }))
  }, [themeConfig])

  // Helper to commit updated page settings to root props
  const updateSettings = (partial: Partial<PageSettings>) => {
    const updated: PageSettings = {
      ...pageSettings,
      ...partial,
    }

    dispatch({
      type: 'setData',
      data: (prev) => ({
        ...prev,
        root: {
          ...prev.root,
          props: {
            ...prev.root?.props,
            pageSettings: updated,
          },
        },
      }),
    })
  }

  // Resolved colors for display swatches
  const currentBgColor = background.type === 'palette' && background.token
    ? resolveColorToken(background.token, '#ffffff')
    : resolveColorToken('background', '#ffffff')

  const currentTextColor = text.colorToken
    ? resolveColorToken(text.colorToken, '#17201f')
    : resolveColorToken('text', '#17201f')

  return (
    <Box p="md" style={{ maxHeight: '100%', overflowY: 'auto' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Settings size={18} color="var(--mantine-color-teal-7, #0e6b66)" />
            <Text fw={700} size="sm" c="var(--zyvavu-text, #17201f)">
              Page Settings
            </Text>
          </Group>
          {templateName && (
            <Badge variant="light" color="teal" size="xs">
              {templateName.toUpperCase()}
            </Badge>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          System-level template defaults. Consumes published theme tokens.
        </Text>

        <Divider />

        {/* SECTION A: BACKGROUND */}
        <Stack gap="xs">
          <Group gap="xs">
            <Palette size={15} color="var(--mantine-color-teal-7, #0e6b66)" />
            <Text fw={600} size="xs">
              Background
            </Text>
          </Group>

          <SegmentedControl
            size="xs"
            value={background.type || 'theme'}
            onChange={(val) =>
              updateSettings({
                background: {
                  ...background,
                  type: val as 'theme' | 'palette' | 'image',
                  token: val === 'palette' ? background.token || 'background' : background.token,
                },
              })
            }
            data={[
              { label: 'Inherit Theme', value: 'theme' },
              { label: 'Color Token', value: 'palette' },
              { label: 'Image', value: 'image' },
            ]}
          />

          {background.type === 'theme' && (
            <Paper p="xs" withBorder radius="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0, #f8f9fa)' }}>
              <Text size="xs" c="dimmed">
                Inherits active theme default background (<code style={{ fontSize: 10 }}>--zyvavu-theme-background</code>).
              </Text>
            </Paper>
          )}

          {background.type === 'palette' && (
            <Paper p="xs" withBorder radius="xs">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Box
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      backgroundColor: currentBgColor,
                      border: '1px solid rgba(0,0,0,0.2)',
                    }}
                  />
                  <Box>
                    <Text size="xs" fw={600}>
                      Token: {background.token || 'background'}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                      Theme Palette Reference
                    </Text>
                  </Box>
                </Group>
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  onClick={(e) => {
                    setColorModalAnchor(e.currentTarget)
                    setColorModalTarget('background')
                  }}
                >
                  Change
                </Button>
              </Group>
            </Paper>
          )}

          {background.type === 'image' && (
            <Stack gap="xs">
              <TextInput
                label="Background Image URL"
                placeholder="https://... or /media/..."
                size="xs"
                value={background.imageUrl || ''}
                onChange={(e) =>
                  updateSettings({
                    background: {
                      ...background,
                      imageUrl: e.currentTarget.value,
                    },
                  })
                }
              />
              <Group grow gap="xs">
                <Select
                  label="Position"
                  size="xs"
                  value={background.imagePosition || 'center'}
                  onChange={(val) =>
                    updateSettings({
                      background: {
                        ...background,
                        imagePosition: (val as any) || 'center',
                      },
                    })
                  }
                  data={[
                    { value: 'center', label: 'Center' },
                    { value: 'top', label: 'Top' },
                    { value: 'bottom', label: 'Bottom' },
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                  ]}
                />
                <Select
                  label="Size"
                  size="xs"
                  value={background.imageSize || 'cover'}
                  onChange={(val) =>
                    updateSettings({
                      background: {
                        ...background,
                        imageSize: (val as any) || 'cover',
                      },
                    })
                  }
                  data={[
                    { value: 'cover', label: 'Cover' },
                    { value: 'contain', label: 'Contain' },
                    { value: 'auto', label: 'Auto' },
                  ]}
                />
              </Group>
              <Select
                label="Repeat"
                size="xs"
                value={background.imageRepeat || 'no-repeat'}
                onChange={(val) =>
                  updateSettings({
                    background: {
                      ...background,
                      imageRepeat: (val as any) || 'no-repeat',
                    },
                  })
                }
                data={[
                  { value: 'no-repeat', label: 'No Repeat' },
                  { value: 'repeat', label: 'Repeat' },
                  { value: 'repeat-x', label: 'Repeat X' },
                  { value: 'repeat-y', label: 'Repeat Y' },
                ]}
              />
            </Stack>
          )}
        </Stack>

        <Divider />

        {/* SECTION B: DEFAULT TEXT */}
        <Stack gap="xs">
          <Group gap="xs">
            <Type size={15} color="var(--mantine-color-teal-7, #0e6b66)" />
            <Text fw={600} size="xs">
              Default Typography & Color
            </Text>
          </Group>

          <Select
            label="Default Typography Preset"
            size="xs"
            value={text.typography || 'p1'}
            onChange={(val) =>
              updateSettings({
                text: {
                  ...text,
                  typography: val || 'p1',
                },
              })
            }
            data={typographyOptions}
          />

          <Paper p="xs" withBorder radius="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Box
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    backgroundColor: currentTextColor,
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Box>
                  <Text size="xs" fw={600}>
                    Token: {text.colorToken || 'text'}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    Theme Palette Reference
                  </Text>
                </Box>
              </Group>
              <Button
                size="xs"
                variant="light"
                color="teal"
                onClick={(e) => {
                  setColorModalAnchor(e.currentTarget)
                  setColorModalTarget('text')
                }}
              >
                Change
              </Button>
            </Group>
          </Paper>
        </Stack>

        <Divider />

        {/* SECTION C: LAYOUT */}
        <Stack gap="xs">
          <Group gap="xs">
            <Layout size={15} color="var(--mantine-color-teal-7, #0e6b66)" />
            <Text fw={600} size="xs">
              Layout & Spacing
            </Text>
          </Group>

          <Select
            label="Container Width"
            size="xs"
            value={layout.containerWidth || 'containerWidth'}
            onChange={(val) =>
              updateSettings({
                layout: {
                  ...layout,
                  containerWidth: val || 'containerWidth',
                },
              })
            }
            data={[
              { value: 'containerWidth', label: 'Default Container (1200px)' },
              { value: 'narrowWidth', label: 'Narrow Container (800px)' },
              { value: 'wideWidth', label: 'Wide Container (1400px)' },
              { value: 'full', label: 'Full Width (100%)' },
            ]}
          />

          <Select
            label="Spacing Preset"
            size="xs"
            value={layout.spacing || 'md'}
            onChange={(val) =>
              updateSettings({
                layout: {
                  ...layout,
                  spacing: val || 'md',
                },
              })
            }
            data={[
              { value: 'none', label: 'None (0px)' },
              { value: 'xs', label: 'Extra Small (xs)' },
              { value: 'sm', label: 'Small (sm)' },
              { value: 'md', label: 'Medium (md)' },
              { value: 'lg', label: 'Large (lg)' },
              { value: 'xl', label: 'Extra Large (xl)' },
            ]}
          />

          <Box>
            <Text size="xs" fw={500} mb={4}>
              Alignment
            </Text>
            <SegmentedControl
              size="xs"
              fullWidth
              value={layout.alignment || 'left'}
              onChange={(val) =>
                updateSettings({
                  layout: {
                    ...layout,
                    alignment: val as 'left' | 'center' | 'right',
                  },
                })
              }
              data={[
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
              ]}
            />
          </Box>
        </Stack>

        <Divider />

        {/* SECTION D: ADVANCED CUSTOM CSS & JS */}
        <Stack gap="xs">
          <Group gap="xs">
            <Code size={15} color="var(--mantine-color-orange-7, #d9480f)" />
            <Text fw={600} size="xs">
              Advanced: Custom CSS & JS
            </Text>
          </Group>

          <Alert
            icon={<AlertTriangle size={15} />}
            color="orange"
            variant="light"
            p="xs"
            style={{ fontSize: 11 }}
          >
            Exceptions to Atomic Design System. Scoped only to this template root. JavaScript execution is disabled inside editor/admin.
          </Alert>

          <Textarea
            label="Template Custom CSS"
            description="Scoped automatically to .zyvavu-theme-root"
            placeholder=".hero-heading { letter-spacing: 0.05em; }"
            size="xs"
            autosize
            minRows={3}
            maxRows={6}
            styles={{ input: { fontFamily: 'var(--font-mono, monospace)', fontSize: 11 } }}
            value={customCSS}
            onChange={(e) => updateSettings({ customCSS: e.currentTarget.value })}
          />

          <Textarea
            label="Template Custom JS"
            description="Non-eval policy; retained non-executable in editor"
            placeholder="// Template-specific analytics or hooks"
            size="xs"
            autosize
            minRows={2}
            maxRows={5}
            styles={{ input: { fontFamily: 'var(--font-mono, monospace)', fontSize: 11 } }}
            value={customJS}
            onChange={(e) => updateSettings({ customJS: e.currentTarget.value })}
          />
        </Stack>
      </Stack>

      {/* Shared Palette Modal */}
      {colorModalTarget && (
        <ThemeColorPaletteModal
          opened={Boolean(colorModalTarget)}
          anchorEl={colorModalAnchor}
          title={colorModalTarget === 'background' ? 'Background Color Token' : 'Text Color Token'}
          subtitle="Select semantic theme color token"
          value={colorModalTarget === 'background' ? background.token || 'background' : text.colorToken || 'text'}
          tokens={themeConfig?.tokens}
          includeBackgroundTokens={colorModalTarget === 'background'}
          onClose={() => {
            setColorModalTarget(null)
            setColorModalAnchor(null)
          }}
          onApplyToken={(tokenId) => {
            if (colorModalTarget === 'background') {
              updateSettings({
                background: {
                  ...background,
                  type: 'palette',
                  token: tokenId,
                },
              })
            } else if (colorModalTarget === 'text') {
              updateSettings({
                text: {
                  ...text,
                  colorToken: tokenId,
                },
              })
            }
          }}
        />
      )}
    </Box>
  )
}
