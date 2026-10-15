'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  ColorInput,
  Divider,
  Flex,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Code,
  ExternalLink,
  Layout,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  UploadCloud,
  X,
} from 'lucide-react'

import type {
  ColorPreset,
  CustomPresetsStore,
  ThemeConfig,
  ThemeTokens,
  TypographyPreset,
} from '@/lib/theme-engine/types'
import {
  BUILTIN_COLOR_PRESETS,
  BUILTIN_TYPOGRAPHY_PRESETS,
  calculateContrastRatio,
} from '@/lib/theme-engine/presets'
import { CURATED_FONTS, SYSTEM_FONTS, getGoogleFontUrl } from '@/lib/theme-engine/fonts'
import { generateThemeCss } from '@/lib/theme-engine/styles'

export type ThemeCustomizerProps = {
  bundledConfig: ThemeConfig
  publishedConfig: ThemeConfig
  draftConfig: ThemeConfig
  customPresets: CustomPresetsStore
  previewRoutes?: { label: string; value: string }[]
}

type PanelView = 'root' | 'colors' | 'typography' | 'background' | 'css-rules'

export function ThemeCustomizer({
  bundledConfig,
  publishedConfig,
  draftConfig,
  customPresets: initialCustomPresets,
  previewRoutes = [
    { label: 'Home Page', value: '/' },
    { label: 'Posts Archive', value: '/posts' },
  ],
}: ThemeCustomizerProps) {
  // Navigation panel state
  const [activePanel, setActivePanel] = useState<PanelView>('root')

  // Theme tokens state
  const [tokens, setTokens] = useState<ThemeTokens>(draftConfig.tokens)
  const [slots, setSlots] = useState<Record<string, Record<string, string>>>(draftConfig.slots || {})
  const [customPresets, setCustomPresets] = useState<CustomPresetsStore>(initialCustomPresets)

  // Status & action state
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Custom preset creation inputs
  const [newColorPresetName, setNewColorPresetName] = useState('')
  const [newTypoPresetName, setNewTypoPresetName] = useState('')

  // Preview iframe state
  const [previewRoute, setPreviewRoute] = useState<string>(previewRoutes[0]?.value || '/')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Determine if draft differs from published
  const isDirty = useMemo(() => {
    return JSON.stringify(tokens) !== JSON.stringify(publishedConfig.tokens)
  }, [tokens, publishedConfig.tokens])

  // Contrast check
  const contrastCheck = useMemo(() => {
    const text = tokens.colors.text || '#17201f'
    const bg = tokens.colors.background || '#ffffff'
    return calculateContrastRatio(text, bg)
  }, [tokens.colors.text, tokens.colors.background])

  // Helper to send draft CSS to iframe
  const pushStylesToPreview = useCallback(
    (currentTokens: ThemeTokens, currentSlots: Record<string, Record<string, string>>) => {
      if (!iframeRef.current?.contentWindow) return
      try {
        const css = generateThemeCss({
          name: 'draft',
          version: 1,
          tokens: currentTokens,
          slots: currentSlots,
        })
        const fontUrl = getGoogleFontUrl([
          currentTokens.typography?.fontFamily,
          currentTokens.typography?.fontFamilyHeading,
        ])

        iframeRef.current.contentWindow.postMessage(
          {
            type: 'ZYVAVU_THEME_STYLE_PREVIEW',
            css,
            fontUrl,
            tokens: currentTokens,
          },
          window.location.origin,
        )
      } catch {
        // Safe ignore
      }
    },
    [],
  )

  // Send styles whenever tokens or slots change
  useEffect(() => {
    pushStylesToPreview(tokens, slots)
  }, [tokens, slots, pushStylesToPreview])

  // Listen for iframe readiness
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'ZYVAVU_PREVIEW_READY') {
        pushStylesToPreview(tokens, slots)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [tokens, slots, pushStylesToPreview])

  // Warn about unsaved changes on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Color modification handler
  const handleColorChange = (key: keyof ThemeTokens['colors'], value: string) => {
    setTokens((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }))
  }

  // Typography font family handler
  const handleFontChange = (type: 'fontFamily' | 'fontFamilyHeading', value: string) => {
    setTokens((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        [type]: value,
      },
    }))
  }

  // Typography heading / paragraph style handler
  const handleHeadingPropChange = (
    headingKey: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p1' | 'p2' | 'p3',
    prop: 'size' | 'lineHeight' | 'weight' | 'letterSpacing',
    val: string,
  ) => {
    setTokens((prev) => {
      const currentHeading = prev.typography[headingKey] || { size: '16px' }
      return {
        ...prev,
        typography: {
          ...prev.typography,
          [headingKey]: {
            ...currentHeading,
            [prop]: val,
          },
        },
      }
    })
  }

  // Preset Selection Handlers
  const handleSelectColorPreset = (preset: ColorPreset) => {
    setTokens((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...preset.colors,
      },
    }))
    setFeedback({ type: 'success', message: `Color theme preset "${preset.name}" applied to draft.` })
  }

  const handleSelectTypographyPreset = (preset: TypographyPreset) => {
    setTokens((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        ...preset.typography,
      },
    }))
    setFeedback({ type: 'success', message: `Text theme preset "${preset.name}" applied to draft.` })
  }

  // Save Custom Color Preset
  const handleSaveCustomColorPreset = async () => {
    if (!newColorPresetName.trim()) return
    const newPreset: ColorPreset = {
      id: `color-${Date.now()}`,
      name: newColorPresetName.trim(),
      isCustom: true,
      colors: { ...tokens.colors },
    }

    try {
      const res = await fetch('/api/theme-customizer/custom-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'colors', preset: newPreset }),
      })
      if (res.ok) {
        setCustomPresets((prev) => ({
          ...prev,
          colors: [...prev.colors, newPreset],
        }))
        setNewColorPresetName('')
        setFeedback({ type: 'success', message: `Saved custom color preset "${newPreset.name}".` })
      } else {
        setFeedback({ type: 'error', message: 'Failed to save custom color preset.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save custom color preset.' })
    }
  }

  // Delete Custom Color Preset
  const handleDeleteCustomColorPreset = async (id: string) => {
    try {
      const res = await fetch(`/api/theme-customizer/custom-preset?type=colors&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setCustomPresets((prev) => ({
          ...prev,
          colors: prev.colors.filter((p) => p.id !== id),
        }))
        setFeedback({ type: 'success', message: 'Custom preset deleted.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to delete preset.' })
    }
  }

  // Save Custom Typography Preset
  const handleSaveCustomTypoPreset = async () => {
    if (!newTypoPresetName.trim()) return
    const newPreset: TypographyPreset = {
      id: `typo-${Date.now()}`,
      name: newTypoPresetName.trim(),
      isCustom: true,
      typography: { ...tokens.typography },
    }

    try {
      const res = await fetch('/api/theme-customizer/custom-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'typography', preset: newPreset }),
      })
      if (res.ok) {
        setCustomPresets((prev) => ({
          ...prev,
          typography: [...prev.typography, newPreset],
        }))
        setNewTypoPresetName('')
        setFeedback({ type: 'success', message: `Saved custom typography preset "${newPreset.name}".` })
      } else {
        setFeedback({ type: 'error', message: 'Failed to save custom typography preset.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save custom typography preset.' })
    }
  }

  // Delete Custom Typography Preset
  const handleDeleteCustomTypoPreset = async (id: string) => {
    try {
      const res = await fetch(`/api/theme-customizer/custom-preset?type=typography&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setCustomPresets((prev) => ({
          ...prev,
          typography: prev.typography.filter((p) => p.id !== id),
        }))
        setFeedback({ type: 'success', message: 'Custom preset deleted.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to delete preset.' })
    }
  }

  // Revert unsaved draft changes
  const handleRevert = () => {
    if (!confirm('Revert all unsaved styling adjustments back to current published styles?')) return
    setTokens(publishedConfig.tokens)
    setSlots(publishedConfig.slots || {})
    setFeedback({ type: 'success', message: 'Reverted draft to published styling.' })
  }

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/theme-customizer/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, slots }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: 'Draft styling saved successfully.' })
      } else {
        setFeedback({ type: 'error', message: data.errors?.join('; ') || 'Failed to save draft.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving draft styling.' })
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Publish Active Styles
  const handlePublish = async () => {
    setIsPublishing(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/theme-customizer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, slots }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: 'Active styles published to frontend!' })
        // Reload iframe to ensure server-rendered CSS verification
        if (iframeRef.current) {
          iframeRef.current.src = iframeRef.current.src
        }
      } else {
        setFeedback({ type: 'error', message: data.errors?.join('; ') || 'Failed to publish styles.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error publishing styling.' })
    } finally {
      setIsPublishing(false)
    }
  }

  // Font options for select
  const fontOptions = useMemo(() => {
    const list = [...SYSTEM_FONTS, ...CURATED_FONTS]
    return list.map((f) => ({
      value: f.family,
      label: `${f.family} (${f.category})`,
    }))
  }, [])

  // Viewport width for preview
  const previewWidth = useMemo(() => {
    if (previewDevice === 'mobile') return '390px'
    if (previewDevice === 'tablet') return '768px'
    return '100%'
  }, [previewDevice])

  return (
    <Box
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--mantine-color-body, #ffffff)',
      }}
    >
      {/* ============================================================== */}
      {/* LEFT: FIXED-WIDTH SIDEBAR (320px)                              */}
      {/* ============================================================== */}
      <Paper
        withBorder
        style={{
          width: 320,
          minWidth: 320,
          maxWidth: 320,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
          borderRadius: 0,
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
        }}
      >
        {/* Top Header of Sidebar */}
        <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border, #e5e7eb)' }}>
          {activePanel === 'root' ? (
            <Flex align="center" justify="space-between">
              <Stack gap={2}>
                <Group gap={6} align="center">
                  <Palette size={18} color="var(--mantine-color-primary, #0e6b66)" />
                  <Title order={5} style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                    Theme Customizer
                  </Title>
                </Group>
                <Text size="xs" c="dimmed">
                  Single Theme Engine
                </Text>
              </Stack>
              <Group gap={6}>
                <Badge size="sm" variant={isDirty ? 'filled' : 'light'} color={isDirty ? 'orange' : 'teal'}>
                  {isDirty ? 'Draft Changes' : 'Published'}
                </Badge>
                <Tooltip label="Exit to Admin">
                  <ActionIcon component={Link} href="/admin" variant="subtle" color="gray" size="sm">
                    <X size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Flex>
          ) : (
            <Flex align="center" justify="space-between">
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<ArrowLeft size={14} />}
                onClick={() => setActivePanel('root')}
              >
                Back
              </Button>
              <Text size="xs" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activePanel === 'colors' && 'Color Theme'}
                {activePanel === 'typography' && 'Text Theme'}
                {activePanel === 'background' && 'Page Background'}
                {activePanel === 'css-rules' && 'Theme CSS Rules'}
              </Text>
              <Badge size="xs" variant={isDirty ? 'filled' : 'outline'} color={isDirty ? 'orange' : 'teal'}>
                {isDirty ? 'Draft' : 'Synced'}
              </Badge>
            </Flex>
          )}
        </Box>

        {/* Feedback message banner if any */}
        {feedback && (
          <Box p="xs">
            <Alert
              icon={feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              color={feedback.type === 'success' ? 'teal' : 'red'}
              withCloseButton
              onClose={() => setFeedback(null)}
              p="xs"
            >
              {feedback.message}
            </Alert>
          </Box>
        )}

        {/* Scrollable Settings Area */}
        <ScrollArea style={{ flex: 1 }} p="sm">
          {/* -------------------------------------------------------- */}
          {/* 1. ROOT MENU PANEL                                       */}
          {/* -------------------------------------------------------- */}
          {activePanel === 'root' && (
            <Stack gap="xs">
              <Text size="xs" c="dimmed" mb={4}>
                Customize global visual design tokens. Changes preview in real-time on the right.
              </Text>

              {/* Color Theme Entry */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => setActivePanel('colors')}
              >
                <Flex align="center" justify="space-between">
                  <Group gap="xs">
                    <Palette size={16} />
                    <div>
                      <Text size="sm" fw={600}>
                        Color Theme
                      </Text>
                      <Text size="xs" c="dimmed">
                        Presets, primary brand, surfaces, text
                      </Text>
                    </div>
                  </Group>
                  <Group gap={4}>
                    <Box
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: tokens.colors.primary,
                      }}
                    />
                    <Box
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: tokens.colors.accent || tokens.colors.primary,
                      }}
                    />
                  </Group>
                </Flex>
              </Card>

              {/* Text Theme Entry */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => setActivePanel('typography')}
              >
                <Flex align="center" justify="space-between">
                  <Group gap="xs">
                    <Type size={16} />
                    <div>
                      <Text size="sm" fw={600}>
                        Text Theme
                      </Text>
                      <Text size="xs" c="dimmed">
                        Font pairing, H1–H6, body copy sizes
                      </Text>
                    </div>
                  </Group>
                  <Text size="xs" fw={700} c="dimmed">
                    Aa
                  </Text>
                </Flex>
              </Card>

              {/* Page Background Entry */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => setActivePanel('background')}
              >
                <Flex align="center" justify="space-between">
                  <Group gap="xs">
                    <Layout size={16} />
                    <div>
                      <Text size="sm" fw={600}>
                        Page Background & Layout
                      </Text>
                      <Text size="xs" c="dimmed">
                        Base background, container widths
                      </Text>
                    </div>
                  </Group>
                  <Box
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      border: '1px solid #ccc',
                      background: tokens.colors.background,
                    }}
                  />
                </Flex>
              </Card>

              {/* Theme CSS Rules Entry */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => setActivePanel('css-rules')}
              >
                <Flex align="center" justify="space-between">
                  <Group gap="xs">
                    <Code size={16} />
                    <div>
                      <Text size="sm" fw={600}>
                        Theme CSS Rules
                      </Text>
                      <Text size="xs" c="dimmed">
                        Widget slot style rules & overrides
                      </Text>
                    </div>
                  </Group>
                </Flex>
              </Card>

              {/* Contrast Quick Check Indicator */}
              <Paper withBorder p="xs" radius="sm" mt="xs" bg="var(--mantine-color-gray-0, #f9fafb)">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={600}>
                    Contrast Audit:
                  </Text>
                  <Badge
                    size="xs"
                    color={contrastCheck.isReadable ? 'teal' : 'red'}
                    variant="light"
                  >
                    {contrastCheck.ratio}:1 {contrastCheck.isReadable ? 'AA Pass' : 'Low'}
                  </Badge>
                </Group>
                {contrastCheck.warning && (
                  <Text size="xs" c="red" mt={4}>
                    {contrastCheck.warning}
                  </Text>
                )}
              </Paper>
            </Stack>
          )}

          {/* -------------------------------------------------------- */}
          {/* 2. COLOR THEME PANEL (Wix-inspired UX)                   */}
          {/* -------------------------------------------------------- */}
          {activePanel === 'colors' && (
            <Stack gap="md">
              {/* Wix-style Preset Theme Cards */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  Color Presets
                </Text>
                <Stack gap="xs">
                  {BUILTIN_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      tokens.colors.primary.toLowerCase() === preset.colors.primary.toLowerCase() &&
                      tokens.colors.background.toLowerCase() === preset.colors.background.toLowerCase()

                    return (
                      <Card
                        key={preset.id}
                        withBorder
                        padding="xs"
                        radius="sm"
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--mantine-color-primary, #0e6b66)' : undefined,
                          borderWidth: isSelected ? 2 : 1,
                        }}
                        onClick={() => handleSelectColorPreset(preset)}
                      >
                        <Flex align="center" justify="space-between" mb={4}>
                          <Text size="xs" fw={600}>
                            {preset.name}
                          </Text>
                          {isSelected && <Check size={14} color="var(--mantine-color-primary, #0e6b66)" />}
                        </Flex>
                        {/* Swatches strip */}
                        <Group gap={4}>
                          {[
                            preset.colors.primary,
                            preset.colors.accent || preset.colors.primary,
                            preset.colors.background,
                            preset.colors.surface,
                            preset.colors.text,
                          ].map((c, i) => (
                            <Box
                              key={i}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                background: c,
                                border: '1px solid rgba(0,0,0,0.1)',
                              }}
                            />
                          ))}
                        </Group>
                      </Card>
                    )
                  })}
                </Stack>
              </Box>

              <Divider />

              {/* Individual Color Pickers */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Color Palette Controls
                </Text>
                <Stack gap="xs">
                  <ColorInput
                    size="sm"
                    label="Primary Brand Color"
                    value={tokens.colors.primary}
                    onChange={(val) => handleColorChange('primary', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Primary Hover"
                    value={tokens.colors.primaryHover || tokens.colors.primary}
                    onChange={(val) => handleColorChange('primaryHover', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Accent Color"
                    value={tokens.colors.accent || tokens.colors.primary}
                    onChange={(val) => handleColorChange('accent', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Page Background"
                    value={tokens.colors.background}
                    onChange={(val) => handleColorChange('background', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Surface / Card Background"
                    value={tokens.colors.surface}
                    onChange={(val) => handleColorChange('surface', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Primary Text Color"
                    value={tokens.colors.text}
                    onChange={(val) => handleColorChange('text', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Muted Text Color"
                    value={tokens.colors.textMuted || '#5f7370'}
                    onChange={(val) => handleColorChange('textMuted', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Border Color"
                    value={tokens.colors.border}
                    onChange={(val) => handleColorChange('border', val)}
                  />
                </Stack>
              </Box>

              {/* Contrast Warning Banner */}
              {contrastCheck.warning && (
                <Alert
                  color="orange"
                  icon={<AlertTriangle size={16} />}
                  title="Contrast Warning"
                >
                  {contrastCheck.warning}
                </Alert>
              )}

              <Divider />

              {/* Custom User Color Presets */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  My Color Presets
                </Text>
                <Group gap="xs" mb="xs">
                  <TextInput
                    size="xs"
                    placeholder="New preset name..."
                    value={newColorPresetName}
                    onChange={(e) => setNewColorPresetName(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<Plus size={12} />}
                    onClick={handleSaveCustomColorPreset}
                    disabled={!newColorPresetName.trim()}
                  >
                    Save
                  </Button>
                </Group>

                {customPresets.colors.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    No custom presets saved yet.
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {customPresets.colors.map((preset) => (
                      <Paper key={preset.id} withBorder p="xs" radius="sm">
                        <Flex align="center" justify="space-between">
                          <Text size="xs" fw={600}>
                            {preset.name}
                          </Text>
                          <Group gap={4}>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              onClick={() => handleSelectColorPreset(preset)}
                            >
                              Apply
                            </Button>
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={() => handleDeleteCustomColorPreset(preset.id)}
                            >
                              <Trash2 size={12} />
                            </ActionIcon>
                          </Group>
                        </Flex>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}

          {/* -------------------------------------------------------- */}
          {/* 3. TYPOGRAPHY THEME PANEL (Wix-inspired UX)              */}
          {/* -------------------------------------------------------- */}
          {activePanel === 'typography' && (
            <Stack gap="md">
              {/* Wix-style Typography Preset Cards */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  Typography Presets
                </Text>
                <Stack gap="xs">
                  {BUILTIN_TYPOGRAPHY_PRESETS.map((preset) => {
                    const isSelected =
                      tokens.typography.fontFamily === preset.typography.fontFamily &&
                      tokens.typography.fontFamilyHeading === preset.typography.fontFamilyHeading

                    return (
                      <Card
                        key={preset.id}
                        withBorder
                        padding="xs"
                        radius="sm"
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--mantine-color-primary, #0e6b66)' : undefined,
                          borderWidth: isSelected ? 2 : 1,
                        }}
                        onClick={() => handleSelectTypographyPreset(preset)}
                      >
                        <Flex align="center" justify="space-between" mb={2}>
                          <Text size="xs" fw={600}>
                            {preset.name}
                          </Text>
                          {isSelected && <Check size={14} color="var(--mantine-color-primary, #0e6b66)" />}
                        </Flex>
                        <Text size="xs" c="dimmed" mb={4}>
                          {preset.description}
                        </Text>
                        <Box
                          p={6}
                          style={{
                            background: 'var(--mantine-color-gray-0, #f8f9fa)',
                            borderRadius: 4,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: preset.typography.fontFamilyHeading,
                              fontSize: 15,
                              fontWeight: 700,
                              lineHeight: 1.2,
                              marginBottom: 2,
                            }}
                          >
                            Sample Headline
                          </div>
                          <div
                            style={{
                              fontFamily: preset.typography.fontFamily,
                              fontSize: 12,
                              color: '#555',
                              lineHeight: 1.4,
                            }}
                          >
                            The quick brown fox jumps over the lazy dog.
                          </div>
                        </Box>
                      </Card>
                    )
                  })}
                </Stack>
              </Box>

              <Divider />

              {/* Font Family Selectors */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Font Pairing
                </Text>
                <Stack gap="xs">
                  <Select
                    size="sm"
                    label="Heading Font (H1–H6)"
                    description="Google Fonts or system fonts"
                    data={fontOptions}
                    value={tokens.typography.fontFamilyHeading || 'Inter'}
                    onChange={(val) => val && handleFontChange('fontFamilyHeading', val)}
                    searchable
                  />
                  <Select
                    size="sm"
                    label="Body Font"
                    description="Paragraphs, lists, and general content"
                    data={fontOptions}
                    value={tokens.typography.fontFamily || 'Inter'}
                    onChange={(val) => val && handleFontChange('fontFamily', val)}
                    searchable
                  />
                  <TextInput
                    size="sm"
                    label="Base Font Size"
                    value={tokens.typography.baseFontSize || '18px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, baseFontSize: e.currentTarget.value },
                      }))
                    }
                  />
                  <TextInput
                    size="sm"
                    label="Base Line Height"
                    value={tokens.typography.baseLineHeight || '1.75'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, baseLineHeight: e.currentTarget.value },
                      }))
                    }
                  />
                </Stack>
              </Box>

              <Divider />

              {/* Heading & Text Styles Accordion */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  Headings & Styles Hierarchy
                </Text>
                <Accordion variant="separated">
                  {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3'] as const).map((tag) => {
                    const conf = tokens.typography[tag] || { size: '16px', lineHeight: '1.4', weight: '600' }
                    return (
                      <Accordion.Item key={tag} value={tag}>
                        <Accordion.Control>
                          <Group justify="space-between" pr="xs">
                            <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }}>
                              {tag}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {conf.size} / {conf.weight}
                            </Text>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            <TextInput
                              size="xs"
                              label="Font Size"
                              value={conf.size || ''}
                              onChange={(e) => handleHeadingPropChange(tag, 'size', e.currentTarget.value)}
                            />
                            <TextInput
                              size="xs"
                              label="Line Height"
                              value={conf.lineHeight || ''}
                              onChange={(e) =>
                                handleHeadingPropChange(tag, 'lineHeight', e.currentTarget.value)
                              }
                            />
                            <Select
                              size="xs"
                              label="Font Weight"
                              data={['400', '500', '600', '700', '800']}
                              value={String(conf.weight || '600')}
                              onChange={(val) => val && handleHeadingPropChange(tag, 'weight', val)}
                            />
                            <TextInput
                              size="xs"
                              label="Letter Spacing"
                              placeholder="e.g. -0.02em"
                              value={conf.letterSpacing || ''}
                              onChange={(e) =>
                                handleHeadingPropChange(tag, 'letterSpacing', e.currentTarget.value)
                              }
                            />
                            <Box
                              p="xs"
                              mt={4}
                              style={{
                                background: '#f5f5f5',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: conf.size,
                                  lineHeight: conf.lineHeight,
                                  fontWeight: conf.weight,
                                  letterSpacing: conf.letterSpacing,
                                }}
                              >
                                {tag.startsWith('h') ? `${tag.toUpperCase()} Preview Title` : 'Paragraph body sample text preview'}
                              </div>
                            </Box>
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    )
                  })}
                </Accordion>
              </Box>

              <Divider />

              {/* Custom User Typography Presets */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  My Typography Presets
                </Text>
                <Group gap="xs" mb="xs">
                  <TextInput
                    size="xs"
                    placeholder="New preset name..."
                    value={newTypoPresetName}
                    onChange={(e) => setNewTypoPresetName(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<Plus size={12} />}
                    onClick={handleSaveCustomTypoPreset}
                    disabled={!newTypoPresetName.trim()}
                  >
                    Save
                  </Button>
                </Group>

                {customPresets.typography.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    No custom presets saved yet.
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {customPresets.typography.map((preset) => (
                      <Paper key={preset.id} withBorder p="xs" radius="sm">
                        <Flex align="center" justify="space-between">
                          <Text size="xs" fw={600}>
                            {preset.name}
                          </Text>
                          <Group gap={4}>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              onClick={() => handleSelectTypographyPreset(preset)}
                            >
                              Apply
                            </Button>
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={() => handleDeleteCustomTypoPreset(preset.id)}
                            >
                              <Trash2 size={12} />
                            </ActionIcon>
                          </Group>
                        </Flex>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}

          {/* -------------------------------------------------------- */}
          {/* 4. PAGE BACKGROUND & LAYOUT PANEL                        */}
          {/* -------------------------------------------------------- */}
          {activePanel === 'background' && (
            <Stack gap="md">
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Background Colors
                </Text>
                <Stack gap="xs">
                  <ColorInput
                    size="sm"
                    label="Page Background"
                    value={tokens.colors.background}
                    onChange={(val) => handleColorChange('background', val)}
                  />
                  <ColorInput
                    size="sm"
                    label="Surface Background"
                    value={tokens.colors.surface}
                    onChange={(val) => handleColorChange('surface', val)}
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Container Layout
                </Text>
                <Stack gap="xs">
                  <TextInput
                    size="sm"
                    label="Standard Container Width"
                    value={tokens.layout.containerWidth}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, containerWidth: e.currentTarget.value },
                      }))
                    }
                  />
                  <TextInput
                    size="sm"
                    label="Narrow Container Width"
                    value={tokens.layout.narrowWidth || '800px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, narrowWidth: e.currentTarget.value },
                      }))
                    }
                  />
                </Stack>
              </Box>
            </Stack>
          )}

          {/* -------------------------------------------------------- */}
          {/* 5. THEME CSS RULES PANEL                                 */}
          {/* -------------------------------------------------------- */}
          {activePanel === 'css-rules' && (
            <Stack gap="md">
              <Text size="xs" c="dimmed">
                Controlled widget style slot CSS rules from theme.json.
              </Text>
              {Object.entries(slots).map(([widgetName, widgetSlots]) => (
                <Paper key={widgetName} withBorder p="xs" radius="sm">
                  <Text size="xs" fw={700} mb={4}>
                    {widgetName}
                  </Text>
                  {Object.entries(widgetSlots).map(([slotName, cssRule]) => (
                    <Box key={slotName} mb={4}>
                      <Text size="xs" c="dimmed">
                        slot: {slotName}
                      </Text>
                      <TextInput
                        size="xs"
                        value={cssRule}
                        onChange={(e) => {
                          const val = e.currentTarget.value
                          setSlots((prev) => ({
                            ...prev,
                            [widgetName]: {
                              ...(prev[widgetName] || {}),
                              [slotName]: val,
                            },
                          }))
                        }}
                      />
                    </Box>
                  ))}
                </Paper>
              ))}
            </Stack>
          )}
        </ScrollArea>

        {/* Sidebar Sticky Footer Controls */}
        <Box p="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border, #e5e7eb)' }}>
          <Stack gap="xs">
            <Group grow gap="xs">
              <Button
                variant="default"
                size="xs"
                leftSection={<RotateCcw size={12} />}
                onClick={handleRevert}
                disabled={!isDirty}
              >
                Revert
              </Button>
              <Button
                variant="light"
                color="teal"
                size="xs"
                loading={isSavingDraft}
                onClick={handleSaveDraft}
              >
                Save Draft
              </Button>
            </Group>
            <Button
              color="teal"
              size="sm"
              fullWidth
              leftSection={<UploadCloud size={16} />}
              loading={isPublishing}
              onClick={handlePublish}
            >
              Publish Active Styles
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ============================================================== */}
      {/* RIGHT: LIVE FULL-SIZE PREVIEW AREA                             */}
      {/* ============================================================== */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#f0f2f5',
          overflow: 'hidden',
        }}
      >
        {/* Preview Top Toolbar */}
        <Paper
          withBorder
          p="xs"
          radius={0}
          style={{
            borderLeft: 'none',
            borderTop: 'none',
            borderRight: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Group gap="sm">
            <Select
              size="xs"
              label=""
              placeholder="Select preview route"
              data={previewRoutes}
              value={previewRoute}
              onChange={(val) => val && setPreviewRoute(val)}
              style={{ width: 180 }}
            />
            <Tooltip label="Reload preview">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => {
                  if (iframeRef.current) iframeRef.current.src = iframeRef.current.src
                }}
              >
                <RefreshCw size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Viewport switch */}
          <Group gap="xs">
            <SegmentedControl
              size="xs"
              value={previewDevice}
              onChange={(val) => setPreviewDevice(val as any)}
              data={[
                { value: 'desktop', label: <Monitor size={14} /> },
                { value: 'tablet', label: <Tablet size={14} /> },
                { value: 'mobile', label: <Smartphone size={14} /> },
              ]}
            />
            <Tooltip label="Open route in new tab">
              <ActionIcon
                component="a"
                href={previewRoute}
                target="_blank"
                rel="noreferrer"
                variant="subtle"
                color="gray"
                size="sm"
              >
                <ExternalLink size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Paper>

        {/* Live Preview Iframe Container */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: previewDevice === 'desktop' ? 0 : 16,
            overflow: 'auto',
          }}
        >
          <Paper
            withBorder={previewDevice !== 'desktop'}
            shadow={previewDevice !== 'desktop' ? 'md' : 'none'}
            radius={previewDevice !== 'desktop' ? 'md' : 0}
            style={{
              width: previewWidth,
              height: '100%',
              overflow: 'hidden',
              background: '#ffffff',
              transition: 'width 0.2s ease',
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewRoute}
              title="Zyvavu Theme Live Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
