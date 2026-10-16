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
  ChevronRight,
  Code,
  ExternalLink,
  Layout,
  Lock,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Type,
  Unlock,
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
  calculateShadowColor,
} from '@/lib/theme-engine/presets'
import { CURATED_FONTS, SYSTEM_FONTS, getGoogleFontUrl } from '@/lib/theme-engine/fonts'
import {
  generateThemeCss,
  normalizeCustomColorPreset,
  normalizeCustomPresetsStore,
  normalizeCustomTypographyPreset,
} from '@/lib/theme-engine/styles'
import { WixColorPicker } from './WixColorPicker'
import { ThemeColorPalettePicker } from './ThemeColorPalettePicker'
import { CoolorsImportModal } from './CoolorsImportModal'
import { WixFontPicker } from './WixFontPicker'
import { WixTypographyPanel } from './WixTypographyPanel'
import { TypographyStyleModal, type TypographyStyleValue } from './TypographyStyleModal'

export type ThemeCustomizerProps = {
  themeId?: string
  activeThemeId?: string
  installedThemes?: any[]
  bundledConfig: ThemeConfig
  publishedConfig: ThemeConfig
  draftConfig: ThemeConfig
  customPresets: CustomPresetsStore
  previewRoutes?: { label: string; value: string }[]
}

type PanelView = 'root' | 'colors' | 'typography' | 'background' | 'css-rules'

const WIDGET_FRIENDLY_LABELS: Record<string, { title: string; description: string }> = {
  Header: {
    title: 'Header & Navigation',
    description: 'Top announcement bar and main navigation bar styling',
  },
  Footer: {
    title: 'Footer Area',
    description: 'Bottom site footer background, spacing and border rules',
  },
  PostTitle: {
    title: 'Article Title',
    description: 'Headline spacing and appearance on blog posts and pages',
  },
  PostContent: {
    title: 'Article Content',
    description: 'Reading area spacing and body paragraph layout rules',
  },
}

const SLOT_FRIENDLY_LABELS: Record<string, string> = {
  root: 'Main Container',
  title: 'Title Text',
  body: 'Content Body',
  topBar: 'Top Announcement Bar',
  mainHeader: 'Main Header Bar',
}

function formatFriendlyName(raw: string): string {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const HEADING_FRIENDLY_LABELS: Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', string> = {
  h1: 'Page Title (H1)',
  h2: 'Section Title (H2)',
  h3: 'Subsection Heading (H3)',
  h4: 'Card Title (H4)',
  h5: 'Small Heading (H5)',
  h6: 'Label Heading (H6)',
}

const PARAGRAPH_FRIENDLY_LABELS: Record<'p1' | 'p2' | 'p3', string> = {
  p1: 'Primary Body Text (Large)',
  p2: 'Standard Body Text (Medium)',
  p3: 'Caption & Helper Text (Small)',
}

const WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi-Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
]

export function ThemeCustomizer({
  themeId = 'corporate',
  activeThemeId = 'corporate',
  installedThemes = [],
  bundledConfig: _bundledConfig,
  publishedConfig,
  draftConfig,
  customPresets: initialCustomPresets,
  previewRoutes = [
    { label: 'Home Page', value: '/' },
    { label: 'Posts Archive', value: '/posts' },
  ],
}: ThemeCustomizerProps) {
  // Layer 1 / Layer 2 / Layer 3 Navigation state
  const [activePanel, setActivePanel] = useState<PanelView>('root')
  const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null)

  // Theme tokens state
  const [tokens, setTokens] = useState<ThemeTokens>(draftConfig.tokens)
  const [slots, setSlots] = useState<Record<string, Record<string, string>>>(draftConfig.slots || {})
  const [customPresets, setCustomPresets] = useState<CustomPresetsStore>(() =>
    normalizeCustomPresetsStore(initialCustomPresets),
  )

  const validCustomColorPresets = useMemo(
    () =>
      (Array.isArray(customPresets?.colors) ? customPresets.colors : [])
        .map((preset) => normalizeCustomColorPreset(preset))
        .filter((preset): preset is ColorPreset => preset !== null),
    [customPresets?.colors],
  )

  const validCustomTypographyPresets = useMemo(
    () =>
      (Array.isArray(customPresets?.typography) ? customPresets.typography : [])
        .map((preset) => normalizeCustomTypographyPreset(preset))
        .filter((preset): preset is TypographyPreset => preset !== null),
    [customPresets?.typography],
  )

  // Status & action state
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Custom preset & import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [newTypoPresetName, setNewTypoPresetName] = useState('')

  // Shadow color lock states (independent lock/unlock controls)
  const [shadowLocks, setShadowLocks] = useState<{
    shadowSoft: boolean
    shadowMedium: boolean
    shadowStrong: boolean
  }>({
    shadowSoft: false,
    shadowMedium: false,
    shadowStrong: false,
  })
  const shadowLocksRef = useRef(shadowLocks)
  shadowLocksRef.current = shadowLocks

  // Floating typography editor state
  const [editingTypographyTag, setEditingTypographyTag] = useState<
    'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p1' | 'p2' | 'p3' | null
  >(null)
  const initialTypographySnapshotRef = useRef<ThemeTokens['typography'] | null>(null)

  // Preview iframe state
  const [previewRoute, setPreviewRoute] = useState<string>(previewRoutes[0]?.value || '/')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Determine if draft differs from published
  const isDirty = useMemo(() => {
    return (
      JSON.stringify(tokens) !== JSON.stringify(publishedConfig.tokens) ||
      JSON.stringify(slots) !== JSON.stringify(publishedConfig.slots || {})
    )
  }, [tokens, slots, publishedConfig.tokens, publishedConfig.slots])

  // Contrast check
  const contrastCheck = useMemo(() => {
    const text = tokens.colors.text || '#17201f'
    const bg = tokens.colors.background || '#ffffff'
    return calculateContrastRatio(text, bg)
  }, [tokens.colors.text, tokens.colors.background])

  // Predictable Back navigation handler: Layer 3 -> Layer 2 -> Layer 1
  const handleBackNavigation = useCallback(() => {
    if (activeSubPanel !== null) {
      setActiveSubPanel(null)
    } else {
      setActivePanel('root')
    }
  }, [activeSubPanel])

  const openPanel = useCallback((panel: PanelView) => {
    setActivePanel(panel)
    setActiveSubPanel(null)
  }, [])

  // Dynamic header title for Layer 2 & Layer 3
  const currentHeaderTitle = useMemo(() => {
    if (activePanel === 'colors') {
      if (activeSubPanel === 'presets') return 'Change Color Theme'
      if (activeSubPanel === 'advanced') return 'Advanced Settings'
      return 'Color Theme'
    }
    if (activePanel === 'typography') {
      if (activeSubPanel === 'presets') return 'Change Text Theme'
      if (activeSubPanel === 'headings') return 'Headings'
      if (activeSubPanel === 'body') return 'Body Text'
      if (activeSubPanel === 'advanced') return 'Advanced Typography'
      return 'Text Theme'
    }
    if (activePanel === 'background') {
      if (activeSubPanel === 'page-bg') return 'Page Background'
      if (activeSubPanel === 'content-width') return 'Content Width'
      if (activeSubPanel === 'layout-options') return 'Layout Options'
      return 'Background & Layout'
    }
    if (activePanel === 'css-rules') {
      if (activeSubPanel) {
        return WIDGET_FRIENDLY_LABELS[activeSubPanel]?.title || formatFriendlyName(activeSubPanel)
      }
      return 'Theme CSS Rules'
    }
    return 'Theme Customizer'
  }, [activePanel, activeSubPanel])

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

  // Color modification handler with shadow sync & auto-lock
  const handleColorChange = (key: keyof ThemeTokens['colors'], value: string) => {
    setTokens((prev) => {
      const nextColors = {
        ...prev.colors,
        [key]: value,
      }

      // If page background changes, auto-recalculate any unlocked shadow colors
      if (key === 'background') {
        const shadowConfigs: Array<{
          key: 'shadowSoft' | 'shadowMedium' | 'shadowStrong'
          level: 'soft' | 'medium' | 'strong'
        }> = [
          { key: 'shadowSoft', level: 'soft' },
          { key: 'shadowMedium', level: 'medium' },
          { key: 'shadowStrong', level: 'strong' },
        ]

        for (const { key: shadowKey, level } of shadowConfigs) {
          if (!shadowLocksRef.current[shadowKey]) {
            nextColors[shadowKey] = calculateShadowColor(value, level)
          }
        }
      }

      return {
        ...prev,
        colors: nextColors,
      }
    })

    // If a shadow color is manually edited, automatically lock it
    if (key === 'shadowSoft' || key === 'shadowMedium' || key === 'shadowStrong') {
      shadowLocksRef.current = {
        ...shadowLocksRef.current,
        [key]: true,
      }
      setShadowLocks((prev) => ({
        ...prev,
        [key]: true,
      }))
    }
  }

  // Toggle shadow lock/unlock
  const handleToggleShadowLock = (
    key: 'shadowSoft' | 'shadowMedium' | 'shadowStrong',
    level: 'soft' | 'medium' | 'strong',
  ) => {
    const isCurrentlyLocked = shadowLocksRef.current[key]
    if (isCurrentlyLocked) {
      // Unlocking: set lock to false and immediately regenerate from tokens.colors.background
      shadowLocksRef.current = {
        ...shadowLocksRef.current,
        [key]: false,
      }
      setShadowLocks((prev) => ({ ...prev, [key]: false }))
      const recalculated = calculateShadowColor(tokens.colors.background || '#ffffff', level)
      setTokens((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [key]: recalculated,
        },
      }))
    } else {
      // Locking: keep current color value, lock it
      shadowLocksRef.current = {
        ...shadowLocksRef.current,
        [key]: true,
      }
      setShadowLocks((prev) => ({ ...prev, [key]: true }))
    }
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

  // Focused floating typography editor handlers
  const handleOpenTypographyEditor = (tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p1' | 'p2' | 'p3') => {
    initialTypographySnapshotRef.current = JSON.parse(JSON.stringify(tokens.typography))
    setEditingTypographyTag(tag)
  }

  const handleTypographyLiveChange = (
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p1' | 'p2' | 'p3',
    style: TypographyStyleValue,
  ) => {
    setTokens((prev) => {
      const isHead = tag.startsWith('h')
      return {
        ...prev,
        typography: {
          ...prev.typography,
          ...(style.fontFamily && isHead ? { fontFamilyHeading: style.fontFamily } : {}),
          ...(style.fontFamily && !isHead ? { fontFamily: style.fontFamily } : {}),
          [tag]: {
            ...(prev.typography[tag] || {}),
            size: style.size,
            weight: style.weight,
            color: style.color,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
          },
        },
      }
    })
  }

  const handleTypographyCancel = () => {
    if (initialTypographySnapshotRef.current) {
      setTokens((prev) => ({
        ...prev,
        typography: initialTypographySnapshotRef.current!,
      }))
    }
    setEditingTypographyTag(null)
  }

  const handleTypographyApply = (
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p1' | 'p2' | 'p3',
    style: TypographyStyleValue,
  ) => {
    handleTypographyLiveChange(tag, style)
    setEditingTypographyTag(null)
  }

  // Preset Selection Handlers
  const handleSelectColorPreset = (preset: ColorPreset) => {
    const normalized = normalizeCustomColorPreset(preset)
    if (!normalized) return
    setTokens((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...normalized.colors,
      },
    }))
    setFeedback({ type: 'success', message: `Color theme "${normalized.name}" applied to draft.` })
  }

  const handleSelectTypographyPreset = (preset: TypographyPreset) => {
    const normalized = normalizeCustomTypographyPreset(preset)
    if (!normalized) return
    setTokens((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        ...normalized.typography,
      },
    }))
    setFeedback({ type: 'success', message: `Text theme "${normalized.name}" applied to draft.` })
  }

  // Handle Imported Color Preset from Coolors
  const handleImportColorPreset = (newPreset: ColorPreset) => {
    setCustomPresets((prev) => ({
      ...prev,
      colors: [newPreset, ...prev.colors],
    }))
    handleSelectColorPreset(newPreset)
    setFeedback({ type: 'success', message: `Color theme "${newPreset.name}" imported and applied to draft.` })
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
        body: JSON.stringify({ tokens, slots, themeId }),
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
        body: JSON.stringify({ tokens, slots, themeId }),
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

  // Font options for select (clean display names without raw CSS stacks)
  const fontOptions = useMemo(() => {
    const list = [...SYSTEM_FONTS, ...CURATED_FONTS]
    return list.map((f) => ({
      value: f.family,
      label: f.family,
    }))
  }, [])

  // Viewport width for preview
  const previewWidth = useMemo(() => {
    if (previewDevice === 'mobile') return '390px'
    if (previewDevice === 'tablet') return '768px'
    return '100%'
  }, [previewDevice])

  // Helper for keyboard accessible card activation
  const handleCardKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <Box
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
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
          flexShrink: 0,
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
                <Group gap={6} align="center">
                  <Text size="xs" fw={700} c="var(--mantine-color-teal-7, #0e6b66)">
                    {installedThemes.find((t) => t.id === themeId)?.label || themeId}
                  </Text>
                  {themeId === activeThemeId ? (
                    <Badge size="xs" color="teal" variant="filled">
                      Active
                    </Badge>
                  ) : (
                    <Badge size="xs" color="gray" variant="light">
                      Inactive
                    </Badge>
                  )}
                </Group>
                {installedThemes.length > 1 && (
                  <Select
                    size="xs"
                    data={installedThemes.map((t) => ({
                      value: t.id,
                      label: `${t.label}${t.id === activeThemeId ? ' (Active)' : ''}`,
                    }))}
                    value={themeId}
                    onChange={(val) => {
                      if (val && val !== themeId) {
                        if (isDirty && !confirm('You have unsaved changes. Switch themes anyway?')) return
                        window.location.href = `/admin/theme-customizer?theme=${val}`
                      }
                    }}
                    mt={4}
                  />
                )}
              </Stack>
              <Group gap={6} align="flex-start">
                <Badge size="sm" variant={isDirty ? 'filled' : 'light'} color={isDirty ? 'orange' : 'teal'}>
                  {isDirty ? 'Draft' : 'Synced'}
                </Badge>
                <Tooltip label="Exit to Admin">
                  <ActionIcon component={Link} href="/admin/themes" variant="subtle" color="gray" size="sm">
                    <X size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Flex>
          ) : (
            <Flex align="center" justify="space-between" gap="xs">
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<ArrowLeft size={14} />}
                onClick={handleBackNavigation}
              >
                Back
              </Button>
              <Text
                size="xs"
                fw={700}
                truncate
                style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {currentHeaderTitle}
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
        <ScrollArea style={{ flex: 1, minHeight: 0 }} p="sm">
          {/* ======================================================== */}
          {/* LAYER 1: ROOT MENU PANEL                                 */}
          {/* ======================================================== */}
          {activePanel === 'root' && (
            <Stack gap="xs">
              <Text size="xs" c="dimmed" mb={4}>
                Customize your website appearance. Changes preview in real-time on the right.
              </Text>

              {/* Color Theme Entry */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => openPanel('colors')}
                onKeyDown={(e) => handleCardKeyDown(e, () => openPanel('colors'))}
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
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                    <Box
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: tokens.colors.accent || tokens.colors.primary,
                        border: '1px solid rgba(0,0,0,0.1)',
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
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => openPanel('typography')}
                onKeyDown={(e) => handleCardKeyDown(e, () => openPanel('typography'))}
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

              {/* Page Background Entry (Temporarily hidden from root navigation; preserved for future Editor Page Settings) */}
              {false && (
                <Card
                  withBorder
                  padding="sm"
                  radius="sm"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                  onClick={() => openPanel('background')}
                  onKeyDown={(e) => handleCardKeyDown(e, () => openPanel('background'))}
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
              )}

              {/* Theme CSS Rules Entry */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                onClick={() => openPanel('css-rules')}
                onKeyDown={(e) => handleCardKeyDown(e, () => openPanel('css-rules'))}
              >
                <Flex align="center" justify="space-between">
                  <Group gap="xs">
                    <Code size={16} />
                    <div>
                      <Text size="sm" fw={600}>
                        Theme CSS Rules
                      </Text>
                      <Text size="xs" c="dimmed">
                        Section & component style adjustments
                      </Text>
                    </div>
                  </Group>
                  <ChevronRight size={14} color="var(--mantine-color-dimmed)" />
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

          {/* ======================================================== */}
          {/* 2. COLOR THEME: WIX-STYLE SIDEBAR & SUBPANELS            */}
          {/* ======================================================== */}
          {activePanel === 'colors' && activeSubPanel === null && (
            <Stack gap="md">
              {/* Short explanation of the color theme */}
              <Text size="xs" c="dimmed">
                Customize your site&apos;s core color palette. Select any swatch below to adjust it in real time.
              </Text>

              {/* Basic Colors: 1st = Main Text, 2nd = Primary Brand */}
              <Box>
                <Group justify="space-between" align="center" mb={6}>
                  <Text size="xs" fw={700}>
                    Basic Colors
                  </Text>
                  <Badge
                    size="xs"
                    color={contrastCheck.isReadable ? 'teal' : 'orange'}
                    variant={contrastCheck.isReadable ? 'light' : 'filled'}
                  >
                    {contrastCheck.ratio}:1 {contrastCheck.isReadable ? 'AA Pass' : 'Low Contrast'}
                  </Badge>
                </Group>
                <Group grow gap="xs" align="stretch">
                  <WixColorPicker
                    variant="basic-swatch"
                    label="Main Text"
                    description="Headings & body"
                    value={tokens.colors.text}
                    onChange={(val) => handleColorChange('text', val)}
                  />
                  <WixColorPicker
                    variant="basic-swatch"
                    label="Primary Brand"
                    description="Buttons & links"
                    value={tokens.colors.primary}
                    onChange={(val) => handleColorChange('primary', val)}
                  />
                  <WixColorPicker
                    variant="basic-swatch"
                    label="Page Background"
                    description="Site background"
                    value={tokens.colors.background}
                    onChange={(val) => handleColorChange('background', val)}
                  />
                </Group>
                {!contrastCheck.isReadable && contrastCheck.warning && (
                  <Alert color="orange" variant="light" p="xs" mt="xs" icon={<AlertTriangle size={14} />}>
                    <Text size="xs">{contrastCheck.warning}</Text>
                  </Alert>
                )}
              </Box>

              {/* Shadow Colors: Horizontal three-color strip with independent lock/unlock controls */}
              <Box>
                <Text size="xs" fw={700} mb={6}>
                  Shadow Colors
                </Text>
                <Paper withBorder p="xs" radius="sm">
                  <Flex gap={0} align="stretch">
                    <WixColorPicker
                      variant="strip-segment"
                      stripPosition="first"
                      label="Shadow Soft"
                      description="Soft"
                      value={tokens.colors.shadowSoft || '#e6eceb'}
                      onChange={(val) => handleColorChange('shadowSoft', val)}
                    />
                    <WixColorPicker
                      variant="strip-segment"
                      stripPosition="middle"
                      label="Shadow Medium"
                      description="Medium"
                      value={tokens.colors.shadowMedium || '#bfd0cd'}
                      onChange={(val) => handleColorChange('shadowMedium', val)}
                    />
                    <WixColorPicker
                      variant="strip-segment"
                      stripPosition="last"
                      label="Shadow Strong"
                      description="Strong"
                      value={tokens.colors.shadowStrong || '#7a9692'}
                      onChange={(val) => handleColorChange('shadowStrong', val)}
                    />
                  </Flex>

                  {/* Independent Lock/Unlock Controls */}
                  <Flex gap="xs" mt={6} pt={6} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    {(
                      [
                        { key: 'shadowSoft', level: 'soft', label: 'Soft' },
                        { key: 'shadowMedium', level: 'medium', label: 'Medium' },
                        { key: 'shadowStrong', level: 'strong', label: 'Strong' },
                      ] as const
                    ).map(({ key, level, label }) => {
                      const isLocked = shadowLocks[key]
                      return (
                        <Flex key={key} align="center" justify="center" gap={4} style={{ flex: 1 }}>
                          <Tooltip
                            label={
                              isLocked
                                ? `${label}: Locked (keeps manual color). Click to unlock & auto-generate from Page Background.`
                                : `${label}: Auto (synced to Page Background). Click to lock.`
                            }
                            withArrow
                            position="bottom"
                          >
                            <ActionIcon
                              size="xs"
                              variant={isLocked ? 'light' : 'subtle'}
                              color={isLocked ? 'gray' : 'teal'}
                              onClick={() => handleToggleShadowLock(key, level)}
                              aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${label} shadow`}
                            >
                              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            </ActionIcon>
                          </Tooltip>
                          <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                            {isLocked ? 'Locked' : 'Auto'}
                          </Text>
                        </Flex>
                      )
                    })}
                  </Flex>
                </Paper>
              </Box>

              {/* Accent Colors */}
              <Box>
                <Text size="xs" fw={700} mb={6}>
                  Accent Colors
                </Text>
                <Stack gap="xs">
                  <WixColorPicker
                    variant="accent-swatch"
                    label="Accent Highlight"
                    description="Highlights, badges & callouts"
                    value={tokens.colors.accent || tokens.colors.primary}
                    onChange={(val) => handleColorChange('accent', val)}
                  />
                  <WixColorPicker
                    variant="accent-swatch"
                    label="Primary Hover"
                    description="Interactive button hover state"
                    value={tokens.colors.primaryHover || tokens.colors.primary}
                    onChange={(val) => handleColorChange('primaryHover', val)}
                  />
                </Stack>
              </Box>

              <Divider />

              {/* Advanced Settings entry */}
              <Card
                withBorder
                padding="xs"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('advanced')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('advanced'))}
              >
                <Flex align="center" justify="space-between">
                  <Group gap="xs">
                    <Sliders size={14} color="var(--mantine-color-dimmed)" />
                    <Box>
                      <Text size="xs" fw={600}>
                        Advanced Settings
                      </Text>
                      <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                        Background, surface, muted text & borders
                      </Text>
                    </Box>
                  </Group>
                  <ChevronRight size={14} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>

              {/* Change Color Theme button */}
              <Button
                variant="light"
                color="teal"
                size="sm"
                fullWidth
                leftSection={<Sparkles size={15} />}
                onClick={() => setActiveSubPanel('presets')}
              >
                Change Color Theme
              </Button>
            </Stack>
          )}

          {/* SUBPANEL: COLOR THEME -> CHANGE COLOR THEME (PRESETS) */}
          {activePanel === 'colors' && activeSubPanel === 'presets' && (
            <Stack gap="md">
              <Box>
                <Text size="xs" c="dimmed" mb="xs">
                  Select a ready-made palette or import from Coolors to update your theme colors.
                </Text>

                {/* Import Palette Action Button */}
                <Button
                  variant="light"
                  color="teal"
                  size="sm"
                  fullWidth
                  leftSection={<Sparkles size={15} />}
                  onClick={() => setIsImportModalOpen(true)}
                  mb="md"
                >
                  Import Palette from Coolors
                </Button>

                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Built-in Palettes
                </Text>
                <Stack gap="xs">
                  {BUILTIN_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      (tokens.colors.primary || '').toLowerCase() === (preset.colors?.primary || '').toLowerCase() &&
                      (tokens.colors.background || '').toLowerCase() ===
                        (preset.colors?.background || '').toLowerCase() &&
                      (tokens.colors.accent || '').toLowerCase() === (preset.colors?.accent || '').toLowerCase()

                    const primary = preset.colors?.primary || '#0e6b66'
                    const accent = preset.colors?.accent || preset.colors?.primary || '#2ec4b6'
                    const surface = preset.colors?.surface || preset.colors?.background || '#f8fafc'
                    const background = preset.colors?.background || '#ffffff'
                    const text = preset.colors?.text || '#17201f'

                    return (
                      <Card
                        key={preset.id}
                        withBorder
                        padding={0}
                        radius="sm"
                        role="button"
                        tabIndex={0}
                        style={{
                          cursor: 'pointer',
                          overflow: 'hidden',
                          borderColor: isSelected ? 'var(--mantine-color-primary, #0e6b66)' : undefined,
                          borderWidth: isSelected ? 2 : 1,
                          boxShadow: isSelected ? '0 0 0 1px var(--mantine-color-primary, #0e6b66)' : undefined,
                          transition: 'transform 0.1s ease, border-color 0.15s ease',
                        }}
                        onClick={() => handleSelectColorPreset(preset)}
                        onKeyDown={(e) => handleCardKeyDown(e, () => handleSelectColorPreset(preset))}
                      >
                        {/* Color Hunt style stacked color strips */}
                        <Box style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                          <Box style={{ height: 38, backgroundColor: primary }} />
                          <Box style={{ height: 26, backgroundColor: accent }} />
                          <Box style={{ height: 20, backgroundColor: surface }} />
                          <Box style={{ height: 18, backgroundColor: background }} />
                        </Box>

                        {/* Subtle Card Footer */}
                        <Flex
                          align="center"
                          justify="space-between"
                          px="xs"
                          py={6}
                          style={{ background: 'var(--mantine-color-body, #ffffff)' }}
                        >
                          <Group gap={6} style={{ minWidth: 0, flex: 1 }}>
                            <Box
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: text,
                                border: '1px solid rgba(0,0,0,0.15)',
                                flexShrink: 0,
                              }}
                            />
                            <Text
                              size="xs"
                              fw={500}
                              truncate
                              c={isSelected ? 'teal' : 'dimmed'}
                              style={{ fontSize: 11 }}
                            >
                              {preset.name}
                            </Text>
                          </Group>
                          {isSelected && <Check size={14} color="var(--mantine-color-primary, #0e6b66)" strokeWidth={2.5} />}
                        </Flex>
                      </Card>
                    )
                  })}
                </Stack>
              </Box>

              <Divider />

              {/* Custom / Imported Palettes */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Imported Palettes
                </Text>

                {validCustomColorPresets.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    No custom palettes imported yet. Click &quot;Import Palette from Coolors&quot; above to import your first CSV palette.
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {validCustomColorPresets.map((preset) => {
                      const isSelected =
                        (tokens.colors.primary || '').toLowerCase() ===
                          (preset.colors?.primary || '').toLowerCase() &&
                        (tokens.colors.background || '').toLowerCase() ===
                          (preset.colors?.background || '').toLowerCase()

                      const primary = preset.colors?.primary || '#0e6b66'
                      const accent = preset.colors?.accent || preset.colors?.primary || '#2ec4b6'
                      const surface = preset.colors?.surface || preset.colors?.background || '#f8fafc'
                      const background = preset.colors?.background || '#ffffff'
                      const text = preset.colors?.text || '#17201f'

                      return (
                        <Card
                          key={preset.id}
                          withBorder
                          padding={0}
                          radius="sm"
                          role="button"
                          tabIndex={0}
                          style={{
                            cursor: 'pointer',
                            overflow: 'hidden',
                            borderColor: isSelected ? 'var(--mantine-color-primary, #0e6b66)' : undefined,
                            borderWidth: isSelected ? 2 : 1,
                            boxShadow: isSelected ? '0 0 0 1px var(--mantine-color-primary, #0e6b66)' : undefined,
                            transition: 'transform 0.1s ease, border-color 0.15s ease',
                          }}
                          onClick={() => handleSelectColorPreset(preset)}
                          onKeyDown={(e) => handleCardKeyDown(e, () => handleSelectColorPreset(preset))}
                        >
                          {/* Color Hunt style stacked color strips */}
                          <Box style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box style={{ height: 38, backgroundColor: primary }} />
                            <Box style={{ height: 26, backgroundColor: accent }} />
                            <Box style={{ height: 20, backgroundColor: surface }} />
                            <Box style={{ height: 18, backgroundColor: background }} />
                          </Box>

                          {/* Subtle Card Footer */}
                          <Flex
                            align="center"
                            justify="space-between"
                            px="xs"
                            py={6}
                            style={{ background: 'var(--mantine-color-body, #ffffff)' }}
                          >
                            <Group gap={6} style={{ minWidth: 0, flex: 1 }}>
                              <Box
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  backgroundColor: text,
                                  border: '1px solid rgba(0,0,0,0.15)',
                                  flexShrink: 0,
                                }}
                              />
                              <Text
                                size="xs"
                                fw={500}
                                truncate
                                c={isSelected ? 'teal' : 'dimmed'}
                                style={{ fontSize: 11 }}
                              >
                                {preset.name}
                              </Text>
                            </Group>
                            <Group gap={4} wrap="nowrap">
                              {isSelected && <Check size={14} color="var(--mantine-color-primary, #0e6b66)" strokeWidth={2.5} />}
                              <ActionIcon
                                size="xs"
                                color="red"
                                variant="subtle"
                                aria-label={`Delete ${preset.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCustomColorPreset(preset.id)
                                }}
                              >
                                <Trash2 size={12} />
                              </ActionIcon>
                            </Group>
                          </Flex>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}

          {/* SUBPANEL: COLOR THEME -> ADVANCED SETTINGS */}
          {activePanel === 'colors' && activeSubPanel === 'advanced' && (
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Fine-tune backgrounds, card surfaces, secondary text and border tokens.
              </Text>
              <WixColorPicker
                label="Page Background"
                description="Main backdrop across your website pages"
                value={tokens.colors.background}
                onChange={(val) => handleColorChange('background', val)}
              />
              <WixColorPicker
                label="Surface & Card Background"
                description="Cards, panels and elevated content sections"
                value={tokens.colors.surface}
                onChange={(val) => handleColorChange('surface', val)}
              />
              <WixColorPicker
                label="Muted Text Color"
                description="Captions, dates and secondary descriptions"
                value={tokens.colors.textMuted || '#5f7370'}
                onChange={(val) => handleColorChange('textMuted', val)}
              />
              <WixColorPicker
                label="Border & Divider Color"
                description="Lines between sections, cards and inputs"
                value={tokens.colors.border}
                onChange={(val) => handleColorChange('border', val)}
              />

              {!contrastCheck.isReadable && contrastCheck.warning && (
                <Alert color="orange" p="xs" icon={<AlertTriangle size={14} />}>
                  <Text size="xs">{contrastCheck.warning}</Text>
                </Alert>
              )}
            </Stack>
          )}

          {/* ======================================================== */}
          {/* 3. TEXT THEME: LAYER 2 & LAYER 3                         */}
          {/* ======================================================== */}
          {activePanel === 'typography' && activeSubPanel === null && (
            <Stack gap="xs">
              <Text size="xs" c="dimmed" mb={4}>
                Choose a complete font pairing or customize headings and body text.
              </Text>

              {/* Option 1: Change Text Theme */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('presets')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('presets'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Group gap={6} mb={2}>
                      <Sparkles size={14} color="var(--mantine-color-teal-7, #0e6b66)" />
                      <Text size="sm" fw={600}>
                        Change Text Theme
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Choose curated font combinations for your brand
                    </Text>
                  </Box>
                  <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>

              {/* Option 2: Headings */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('headings')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('headings'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Text size="sm" fw={600}>
                      Headings
                    </Text>
                    <Text size="xs" c="dimmed">
                      Edit heading font and title sizes
                    </Text>
                  </Box>
                  <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>

              {/* Option 3: Body Text */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('body')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('body'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Text size="sm" fw={600}>
                      Body Text
                    </Text>
                    <Text size="xs" c="dimmed">
                      Edit paragraph font and reading comfort
                    </Text>
                  </Box>
                  <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>

              {/* Option 4: Advanced Typography */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('advanced')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('advanced'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Group gap={6} mb={2}>
                      <Sliders size={14} color="var(--mantine-color-dimmed)" />
                      <Text size="sm" fw={600}>
                        Advanced Typography
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Detailed hierarchy, line height and letter spacing
                    </Text>
                  </Box>
                  <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>
            </Stack>
          )}

          {/* LAYER 3: TEXT THEME -> CHANGE TEXT THEME (PRESETS) */}
          {activePanel === 'typography' && activeSubPanel === 'presets' && (
            <Stack gap="md">
              <Box>
                <Text size="xs" c="dimmed" mb="xs">
                  Select a typography preset to update headings and body text together.
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
                        role="button"
                        tabIndex={0}
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--mantine-color-primary, #0e6b66)' : undefined,
                          borderWidth: isSelected ? 2 : 1,
                        }}
                        onClick={() => handleSelectTypographyPreset(preset)}
                        onKeyDown={(e) => handleCardKeyDown(e, () => handleSelectTypographyPreset(preset))}
                      >
                        <Flex align="center" justify="space-between" mb={2}>
                          <Text size="xs" fw={600}>
                            {preset.name}
                          </Text>
                          {isSelected && <Check size={14} color="var(--mantine-color-primary, #0e6b66)" />}
                        </Flex>
                        <Text size="xs" c="dimmed" mb={6}>
                          {preset.description}
                        </Text>
                        <Box
                          p={8}
                          style={{
                            background: 'var(--mantine-color-gray-0, #f8f9fa)',
                            borderRadius: 4,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: preset.typography.fontFamilyHeading,
                              fontSize: 16,
                              fontWeight: 700,
                              lineHeight: 1.25,
                              marginBottom: 4,
                            }}
                          >
                            Sample Headline
                          </div>
                          <div
                            style={{
                              fontFamily: preset.typography.fontFamily,
                              fontSize: 12,
                              color: '#555',
                              lineHeight: 1.45,
                            }}
                          >
                            Clear, comfortable reading for your visitors across every device.
                          </div>
                        </Box>
                      </Card>
                    )
                  })}
                </Stack>
              </Box>

              <Divider />

              {/* Custom User Typography Presets */}
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  My Saved Text Themes
                </Text>
                <Group gap="xs" mb="xs">
                  <TextInput
                    size="xs"
                    placeholder="New text theme name..."
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

                {validCustomTypographyPresets.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    No custom text themes saved yet.
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {validCustomTypographyPresets.map((preset) => {
                      const isSelected =
                        tokens.typography?.fontFamily === preset.typography?.fontFamily &&
                        tokens.typography?.fontFamilyHeading === preset.typography?.fontFamilyHeading

                      return (
                        <Card
                          key={preset.id}
                          withBorder
                          padding="xs"
                          radius="sm"
                          style={{
                            borderColor: isSelected ? 'var(--mantine-color-primary, #0e6b66)' : undefined,
                            borderWidth: isSelected ? 2 : 1,
                          }}
                        >
                          <Flex align="center" justify="space-between" mb={6}>
                            <Group gap={6}>
                              <Text size="xs" fw={600}>
                                {preset.name}
                              </Text>
                              {isSelected && <Check size={14} color="var(--mantine-color-primary, #0e6b66)" />}
                            </Group>
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
                                aria-label={`Delete ${preset.name}`}
                                onClick={() => handleDeleteCustomTypoPreset(preset.id)}
                              >
                                <Trash2 size={12} />
                              </ActionIcon>
                            </Group>
                          </Flex>
                          <Box
                            p={6}
                            style={{
                              background: 'var(--mantine-color-gray-0, #f8f9fa)',
                              borderRadius: 4,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: preset.typography?.fontFamilyHeading || preset.typography?.fontFamily,
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: 1.25,
                              }}
                            >
                              Sample Headline
                            </div>
                            <div
                              style={{
                                fontFamily: preset.typography?.fontFamily,
                                fontSize: 11,
                                color: '#555',
                              }}
                            >
                              Body text sample preview
                            </div>
                          </Box>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}

          {/* LAYER 3: TEXT THEME -> HEADINGS */}
          {activePanel === 'typography' && activeSubPanel === 'headings' && (
            <Stack gap="md">
              <WixFontPicker
                label="Heading Font"
                description="Default font family for all page titles and headlines"
                value={tokens.typography.fontFamilyHeading || 'Inter'}
                onChange={(val) => handleFontChange('fontFamilyHeading', val)}
                size="sm"
              />

              <Divider />

              <Stack gap="xs">
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }}>
                  Heading Styles
                </Text>
                <Text size="xs" c="dimmed" style={{ fontSize: 11 }} mb={2}>
                  Select any heading to customize font size, weight and spacing.
                </Text>

                {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag, idx) => {
                  const conf = tokens.typography[tag] || { size: '24px', lineHeight: '1.3', weight: '600' }
                  const headingFont = tokens.typography.fontFamilyHeading || tokens.typography.fontFamily || 'Inter'
                  const titleLabel = `Heading ${idx + 1}`
                  const descLabel = HEADING_FRIENDLY_LABELS[tag]

                  return (
                    <Card
                      key={tag}
                      withBorder
                      padding="xs"
                      radius="sm"
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                      onClick={() => handleOpenTypographyEditor(tag)}
                      onKeyDown={(e) => handleCardKeyDown(e, () => handleOpenTypographyEditor(tag))}
                    >
                      <Flex align="center" justify="space-between">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={6} align="center" mb={2}>
                            <Text size="xs" fw={700}>
                              {titleLabel}
                            </Text>
                            <Badge size="xs" variant="light" color="gray" radius="xs" style={{ fontSize: 10 }}>
                              {conf.size || '24px'}
                            </Badge>
                            <Badge size="xs" variant="subtle" color="teal" radius="xs" style={{ fontSize: 10 }}>
                              {conf.weight || '600'}
                            </Badge>
                          </Group>
                          <Text
                            size="sm"
                            truncate
                            style={{
                              fontFamily: headingFont,
                              fontWeight: conf.weight || '600',
                              color: 'var(--mantine-color-text)',
                            }}
                          >
                            {descLabel}
                          </Text>
                        </Box>
                        <ChevronRight size={14} color="var(--mantine-color-dimmed)" />
                      </Flex>
                    </Card>
                  )
                })}
              </Stack>
            </Stack>
          )}

          {/* LAYER 3: TEXT THEME -> BODY TEXT */}
          {activePanel === 'typography' && activeSubPanel === 'body' && (
            <Stack gap="md">
              <WixFontPicker
                label="Body Font"
                description="Default font family for paragraphs, articles and descriptions"
                value={tokens.typography.fontFamily || 'Inter'}
                onChange={(val) => handleFontChange('fontFamily', val)}
                size="sm"
              />

              <Group grow gap="xs">
                <TextInput
                  size="xs"
                  label="Base Text Size"
                  value={tokens.typography.baseFontSize || '18px'}
                  onChange={(e) =>
                    setTokens((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, baseFontSize: e.currentTarget.value },
                    }))
                  }
                />
                <TextInput
                  size="xs"
                  label="Line Spacing"
                  value={tokens.typography.baseLineHeight || '1.75'}
                  onChange={(e) =>
                    setTokens((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, baseLineHeight: e.currentTarget.value },
                    }))
                  }
                />
              </Group>

              <Divider />

              <Stack gap="xs">
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }}>
                  Paragraph Styles
                </Text>
                <Text size="xs" c="dimmed" style={{ fontSize: 11 }} mb={2}>
                  Select a paragraph style to adjust font size and comfort.
                </Text>

                {(['p1', 'p2', 'p3'] as const).map((tag, idx) => {
                  const conf = tokens.typography[tag] || { size: '16px', lineHeight: '1.6', weight: '400' }
                  const bodyFont = tokens.typography.fontFamily || 'Inter'
                  const titleLabel = `Paragraph ${idx + 1}`
                  const descLabel = PARAGRAPH_FRIENDLY_LABELS[tag]

                  return (
                    <Card
                      key={tag}
                      withBorder
                      padding="xs"
                      radius="sm"
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                      onClick={() => handleOpenTypographyEditor(tag)}
                      onKeyDown={(e) => handleCardKeyDown(e, () => handleOpenTypographyEditor(tag))}
                    >
                      <Flex align="center" justify="space-between">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={6} align="center" mb={2}>
                            <Text size="xs" fw={700}>
                              {titleLabel}
                            </Text>
                            <Badge size="xs" variant="light" color="gray" radius="xs" style={{ fontSize: 10 }}>
                              {conf.size || '16px'}
                            </Badge>
                            <Badge size="xs" variant="subtle" color="teal" radius="xs" style={{ fontSize: 10 }}>
                              {conf.weight || '400'}
                            </Badge>
                          </Group>
                          <Text
                            size="xs"
                            truncate
                            style={{
                              fontFamily: bodyFont,
                              fontWeight: conf.weight || '400',
                              color: 'var(--mantine-color-dimmed)',
                            }}
                          >
                            {descLabel}
                          </Text>
                        </Box>
                        <ChevronRight size={14} color="var(--mantine-color-dimmed)" />
                      </Flex>
                    </Card>
                  )
                })}
              </Stack>
            </Stack>
          )}

          {/* LAYER 3: TEXT THEME -> ADVANCED TYPOGRAPHY */}
          {activePanel === 'typography' && activeSubPanel === 'advanced' && (
            <Stack gap="md">
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={8}>
                  Font Pairing & Base Metrics
                </Text>
                <Stack gap="xs">
                  <Select
                    size="sm"
                    label="Heading Font (H1–H6)"
                    data={fontOptions}
                    value={tokens.typography.fontFamilyHeading || 'Inter'}
                    onChange={(val) => val && handleFontChange('fontFamilyHeading', val)}
                    searchable
                  />
                  <Select
                    size="sm"
                    label="Body Font"
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

              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  Detailed Hierarchy Controls
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
                                {tag.startsWith('h')
                                  ? `${tag.toUpperCase()} Preview Title`
                                  : 'Paragraph body sample text preview'}
                              </div>
                            </Box>
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    )
                  })}
                </Accordion>
              </Box>
            </Stack>
          )}

          {/* ======================================================== */}
          {/* 4. PAGE BACKGROUND & LAYOUT: LAYER 2 & LAYER 3           */}
          {/* ======================================================== */}
          {activePanel === 'background' && activeSubPanel === null && (
            <Stack gap="xs">
              <Text size="xs" c="dimmed" mb={4}>
                Adjust page backdrops, container widths and layout spacing.
              </Text>

              {/* Option 1: Page Background */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('page-bg')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('page-bg'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Text size="sm" fw={600}>
                      Page Background
                    </Text>
                    <Text size="xs" c="dimmed">
                      Main page canvas and section surface colors
                    </Text>
                  </Box>
                  <Group gap={6} wrap="nowrap">
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: tokens.colors.background,
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                    <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                  </Group>
                </Flex>
              </Card>

              {/* Option 2: Content Width */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('content-width')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('content-width'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Text size="sm" fw={600}>
                      Content Width
                    </Text>
                    <Text size="xs" c="dimmed">
                      Standard and reading container widths
                    </Text>
                  </Box>
                  <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>

              {/* Option 3: Layout Options */}
              <Card
                withBorder
                padding="sm"
                radius="sm"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSubPanel('layout-options')}
                onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel('layout-options'))}
              >
                <Flex align="center" justify="space-between">
                  <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                    <Text size="sm" fw={600}>
                      Layout Options
                    </Text>
                    <Text size="xs" c="dimmed">
                      Corner rounding and section spacing rhythm
                    </Text>
                  </Box>
                  <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Flex>
              </Card>
            </Stack>
          )}

          {/* LAYER 3: PAGE BACKGROUND & LAYOUT -> PAGE BACKGROUND */}
          {activePanel === 'background' && activeSubPanel === 'page-bg' && (
            <Stack gap="md">
              <Text size="xs" c="dimmed">
                Choose background colors for your website pages and content blocks.
              </Text>

              {/* Page Background */}
              <Paper withBorder p="xs" radius="sm">
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="xs" fw={700}>
                        Page Background
                      </Text>
                      <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                        Main backdrop across all website pages
                      </Text>
                    </div>
                    <Box
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        backgroundColor: tokens.colors.background,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                  </Group>

                  {/* Theme Color Palette Quick-Select */}
                  <Box mt={2}>
                    <Text size="xs" fw={600} mb={4} style={{ fontSize: 11 }}>
                      Theme Colors:
                    </Text>
                    <ThemeColorPalettePicker
                      tokens={tokens}
                      value={tokens.colors.background}
                      onChange={(val) => handleColorChange('background', val)}
                    />
                  </Box>

                  {/* Advanced custom picker */}
                  <WixColorPicker
                    label="Custom Page Color"
                    description="Adjust hue, saturation and brightness"
                    value={tokens.colors.background}
                    onChange={(val) => handleColorChange('background', val)}
                  />
                </Stack>
              </Paper>

              {/* Surface Background */}
              <Paper withBorder p="xs" radius="sm">
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="xs" fw={700}>
                        Surface Background
                      </Text>
                      <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                        Cards, header blocks and elevated content sections
                      </Text>
                    </div>
                    <Box
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        backgroundColor: tokens.colors.surface,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                  </Group>

                  {/* Theme Color Palette Quick-Select */}
                  <Box mt={2}>
                    <Text size="xs" fw={600} mb={4} style={{ fontSize: 11 }}>
                      Theme Colors:
                    </Text>
                    <ThemeColorPalettePicker
                      tokens={tokens}
                      value={tokens.colors.surface}
                      onChange={(val) => handleColorChange('surface', val)}
                    />
                  </Box>

                  {/* Advanced custom picker */}
                  <WixColorPicker
                    label="Custom Surface Color"
                    description="Adjust hue, saturation and brightness"
                    value={tokens.colors.surface}
                    onChange={(val) => handleColorChange('surface', val)}
                  />
                </Stack>
              </Paper>

              {/* Live Contrast Verification for Text vs Background */}
              <Paper withBorder p="xs" radius="sm">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={600}>
                    Text vs Background Contrast:
                  </Text>
                  <Badge
                    size="xs"
                    color={contrastCheck.isReadable ? 'teal' : 'orange'}
                    variant={contrastCheck.isReadable ? 'light' : 'filled'}
                  >
                    {contrastCheck.ratio}:1 {contrastCheck.isReadable ? 'AA Pass' : 'Low Contrast'}
                  </Badge>
                </Group>
                {!contrastCheck.isReadable && contrastCheck.warning && (
                  <Alert color="orange" variant="light" p="xs" mt="xs" icon={<AlertTriangle size={14} />}>
                    <Text size="xs">{contrastCheck.warning}</Text>
                  </Alert>
                )}
              </Paper>
            </Stack>
          )}

          {/* LAYER 3: PAGE BACKGROUND & LAYOUT -> CONTENT WIDTH */}
          {activePanel === 'background' && activeSubPanel === 'content-width' && (
            <Stack gap="md">
              <Text size="xs" c="dimmed">
                Control how wide your website content stretches on desktop screens.
              </Text>
              <TextInput
                size="sm"
                label="Standard Page Width"
                description="Default container width (e.g. 1200px)"
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
                label="Article Reading Width"
                description="Narrower width for comfortable reading (e.g. 800px)"
                value={tokens.layout.narrowWidth || '800px'}
                onChange={(e) =>
                  setTokens((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, narrowWidth: e.currentTarget.value },
                  }))
                }
              />
            </Stack>
          )}

          {/* LAYER 3: PAGE BACKGROUND & LAYOUT -> LAYOUT OPTIONS */}
          {activePanel === 'background' && activeSubPanel === 'layout-options' && (
            <Stack gap="md">
              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  Corner Rounding
                </Text>
                <Stack gap="xs">
                  <TextInput
                    size="xs"
                    label="Small Elements (Buttons & Inputs)"
                    value={tokens.radius?.sm || '4px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        radius: { ...(prev.radius || {}), sm: e.currentTarget.value },
                      }))
                    }
                  />
                  <TextInput
                    size="xs"
                    label="Medium Elements (Cards & Panels)"
                    value={tokens.radius?.md || '8px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        radius: { ...(prev.radius || {}), md: e.currentTarget.value },
                      }))
                    }
                  />
                  <TextInput
                    size="xs"
                    label="Large Sections & Banners"
                    value={tokens.radius?.lg || '12px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        radius: { ...(prev.radius || {}), lg: e.currentTarget.value },
                      }))
                    }
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }} mb={6}>
                  Section Spacing Scale
                </Text>
                <Stack gap="xs">
                  <TextInput
                    size="xs"
                    label="Compact Spacing"
                    value={tokens.spacing?.sm || '8px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        spacing: { ...(prev.spacing || {}), sm: e.currentTarget.value },
                      }))
                    }
                  />
                  <TextInput
                    size="xs"
                    label="Standard Spacing"
                    value={tokens.spacing?.md || '16px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        spacing: { ...(prev.spacing || {}), md: e.currentTarget.value },
                      }))
                    }
                  />
                  <TextInput
                    size="xs"
                    label="Large Section Spacing"
                    value={tokens.spacing?.xl || '40px'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        spacing: { ...(prev.spacing || {}), xl: e.currentTarget.value },
                      }))
                    }
                  />
                </Stack>
              </Box>
            </Stack>
          )}

          {/* ======================================================== */}
          {/* 5. THEME CSS RULES: LAYER 2 & LAYER 3                    */}
          {/* ======================================================== */}
          {activePanel === 'css-rules' && activeSubPanel === null && (
            <Stack gap="xs">
              <Text size="xs" c="dimmed" mb={4}>
                Select a website area below to fine-tune its styling rules.
              </Text>
              {Object.keys(slots).length === 0 ? (
                <Paper withBorder p="sm" radius="sm">
                  <Text size="xs" c="dimmed">
                    No section style rules are defined for this theme.
                  </Text>
                </Paper>
              ) : (
                Object.entries(slots).map(([widgetName, widgetSlots]) => {
                  const info = WIDGET_FRIENDLY_LABELS[widgetName] || {
                    title: formatFriendlyName(widgetName),
                    description: `${Object.keys(widgetSlots).length} customizable style area(s)`,
                  }
                  return (
                    <Card
                      key={widgetName}
                      withBorder
                      padding="sm"
                      radius="sm"
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActiveSubPanel(widgetName)}
                      onKeyDown={(e) => handleCardKeyDown(e, () => setActiveSubPanel(widgetName))}
                    >
                      <Flex align="center" justify="space-between">
                        <Box style={{ flex: 1, minWidth: 0 }} pr="xs">
                          <Text size="sm" fw={600}>
                            {info.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {info.description}
                          </Text>
                        </Box>
                        <ChevronRight size={16} color="var(--mantine-color-dimmed)" />
                      </Flex>
                    </Card>
                  )
                })
              )}
            </Stack>
          )}

          {/* LAYER 3: THEME CSS RULES -> SELECTED WIDGET GROUP */}
          {activePanel === 'css-rules' && activeSubPanel !== null && (
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Customize styling rules for{' '}
                {WIDGET_FRIENDLY_LABELS[activeSubPanel]?.title || formatFriendlyName(activeSubPanel)}.
              </Text>
              {Object.entries(slots[activeSubPanel] || {}).map(([slotName, cssRule]) => (
                <Paper key={slotName} withBorder p="xs" radius="sm">
                  <TextInput
                    size="xs"
                    label={SLOT_FRIENDLY_LABELS[slotName] || formatFriendlyName(slotName)}
                    value={cssRule}
                    onChange={(e) => {
                      const val = e.currentTarget.value
                      setSlots((prev) => ({
                        ...prev,
                        [activeSubPanel]: {
                          ...(prev[activeSubPanel] || {}),
                          [slotName]: val,
                        },
                      }))
                    }}
                  />
                </Paper>
              ))}
            </Stack>
          )}
        </ScrollArea>

        {/* Sidebar Sticky Footer Controls */}
        <Box
          p="sm"
          style={{
            borderTop: '1px solid var(--mantine-color-default-border, #e5e7eb)',
            flexShrink: 0,
          }}
        >
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
          minWidth: 0,
          minHeight: 0,
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
            flexShrink: 0,
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
            minWidth: 0,
            minHeight: 0,
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
              minHeight: 0,
              overflow: 'hidden',
              background: '#ffffff',
              transition: 'width 0.2s ease',
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewRoute}
              title="Zyvavu Theme Live Preview"
              onLoad={() => pushStylesToPreview(tokens, slots)}
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

      {/* Coolors CSV Import Modal */}
      <CoolorsImportModal
        opened={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentTokens={tokens}
        onImportSuccess={handleImportColorPreset}
      />

      {/* Focused Floating Typography Style Modal */}
      {editingTypographyTag && (
        <TypographyStyleModal
          opened={editingTypographyTag !== null}
          onClose={() => setEditingTypographyTag(null)}
          title={
            editingTypographyTag.startsWith('h')
              ? `Heading ${editingTypographyTag.replace('h', '')}`
              : `Paragraph ${editingTypographyTag.replace('p', '')}`
          }
          subtitle={
            HEADING_FRIENDLY_LABELS[editingTypographyTag as keyof typeof HEADING_FRIENDLY_LABELS] ||
            PARAGRAPH_FRIENDLY_LABELS[editingTypographyTag as keyof typeof PARAGRAPH_FRIENDLY_LABELS]
          }
          isHeading={editingTypographyTag.startsWith('h')}
          paletteTokens={tokens}
          defaultFontFamily={
            editingTypographyTag.startsWith('h')
              ? tokens.typography.fontFamilyHeading || tokens.typography.fontFamily || 'Inter'
              : tokens.typography.fontFamily || 'Inter'
          }
          value={{
            fontFamily: editingTypographyTag.startsWith('h')
              ? tokens.typography.fontFamilyHeading || tokens.typography.fontFamily
              : tokens.typography.fontFamily,
            size: tokens.typography[editingTypographyTag]?.size,
            weight: tokens.typography[editingTypographyTag]?.weight,
            color: tokens.typography[editingTypographyTag]?.color || tokens.colors.text,
            lineHeight: tokens.typography[editingTypographyTag]?.lineHeight,
            letterSpacing: tokens.typography[editingTypographyTag]?.letterSpacing,
          }}
          onChange={(style) => handleTypographyLiveChange(editingTypographyTag, style)}
          onApply={(style) => handleTypographyApply(editingTypographyTag, style)}
          onCancel={handleTypographyCancel}
        />
      )}
    </Box>
  )
}
