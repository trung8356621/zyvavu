'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, Check, Layers, Lock, Save } from 'lucide-react'

import { PuckHost } from '@/components/builder/core/PuckHost'
import type { BuilderDocument } from '@/components/builder/core/types'
import type { TemplateContext, ThemeConfig, ThemeTemplateDocument } from '@/lib/theme-engine/types'
import { getTemplatePolicy } from '@/lib/theme-engine/policy'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import { normalizeThemeTemplateDocument } from '@/lib/theme-engine/normalization'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { generateThemeCss } from '@/lib/theme-engine/styles'
import { getGoogleFontUrl } from '@/lib/theme-engine/fonts'

export type ThemeBuilderProps = {
  themeId?: string
  activeThemeId?: string
  installedThemes?: any[]
  initialTemplates: Record<TemplateContext, ThemeTemplateDocument>
  initialContext?: TemplateContext
  themeConfig?: ThemeConfig
}

const TEMPLATE_OPTIONS: { label: string; value: TemplateContext; badge?: string }[] = [
  { label: 'Header', value: 'header' },
  { label: 'Home', value: 'home' },
  { label: 'Single Post', value: 'single' },
  { label: 'Page', value: 'page' },
  { label: 'Category', value: 'category' },
  { label: 'Footer', value: 'footer' },
  { label: 'Product (Contract)', value: 'product', badge: 'Pending' },
]

export function ThemeBuilder({
  themeId = 'corporate',
  activeThemeId = 'corporate',
  installedThemes = [],
  initialTemplates,
  initialContext = 'single',
  themeConfig,
}: ThemeBuilderProps) {
  const normalizedInitialTemplates = useMemo(() => {
    const result: Record<TemplateContext, ThemeTemplateDocument> = {} as any
    if (initialTemplates) {
      for (const [ctx, doc] of Object.entries(initialTemplates)) {
        result[ctx as TemplateContext] = normalizeThemeTemplateDocument(doc)
      }
    }
    return result
  }, [initialTemplates])

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateContext>(initialContext)
  const [templates, setTemplates] = useState<Record<TemplateContext, ThemeTemplateDocument>>(normalizedInitialTemplates)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const activeDoc = templates[selectedTemplate]
  const latestDocRef = useRef<ThemeTemplateDocument>(activeDoc)

  useEffect(() => {
    latestDocRef.current = templates[selectedTemplate]
  }, [selectedTemplate, templates])

  const currentPolicy = useMemo(() => {
    try {
      return getTemplatePolicy(selectedTemplate)
    } catch {
      return null
    }
  }, [selectedTemplate])

  const puckConfig = useMemo(() => {
    return getEditorConfigForContext(selectedTemplate, themeConfig)
  }, [selectedTemplate, themeConfig])

  const themeCss = useMemo(() => {
    return generateThemeCss(themeConfig)
  }, [themeConfig])

  const fontFamilies = useMemo(() => {
    return [
      themeConfig?.tokens?.typography?.fontFamily,
      themeConfig?.tokens?.typography?.fontFamilyHeading,
    ]
  }, [themeConfig])

  const fontUrl = useMemo(() => getGoogleFontUrl(fontFamilies), [fontFamilies])

  // Warn about unsaved changes before page unload
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

  const handleTemplateChange = (nextContext: TemplateContext) => {
    if (nextContext === selectedTemplate) return

    if (isDirty) {
      const confirmLeave = window.confirm(
        `You have unsaved changes in template "${selectedTemplate}". Switching to "${nextContext}" without saving will lose your changes. Do you want to continue?`,
      )
      if (!confirmLeave) return
    }

    setSelectedTemplate(nextContext)
    setIsDirty(false)
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleDocChange = useCallback((updated: BuilderDocument) => {
    setIsDirty(true)
    setSaveSuccess(false)
    const asThemeDoc: ThemeTemplateDocument = {
      ...updated,
      template: selectedTemplate,
      version: updated.version || 1,
      content: updated.content as any,
    }
    latestDocRef.current = asThemeDoc
  }, [selectedTemplate])

  const handleSave = useCallback(
    async (customDoc?: BuilderDocument) => {
      const docToValidate = (customDoc || latestDocRef.current) as ThemeTemplateDocument

      // Authoritative save validation
      const validation = validateThemeTemplateDocument(
        docToValidate,
        selectedTemplate,
        templates[selectedTemplate],
      )

      if (!validation.valid) {
        setSaveError(`Policy validation failed: ${validation.errors.join('; ')}`)
        return
      }

      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      try {
        const res = await fetch('/api/theme-builder/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: selectedTemplate,
            document: docToValidate,
            themeId,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.errors?.join('; ') || data.message || 'Failed to save template override')
        }

        // Update state
        setTemplates((prev) => ({
          ...prev,
          [selectedTemplate]: docToValidate,
        }))
        setIsDirty(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err: any) {
        setSaveError(err.message || 'An error occurred while saving the template.')
      } finally {
        setIsSaving(false)
      }
    },
    [selectedTemplate, templates],
  )

  const modeBadge =
    currentPolicy?.mode === 'structured-header'
      ? { label: 'Structured Header (Flatsome-like)', color: 'blue' }
      : currentPolicy?.mode === 'document'
        ? { label: 'Document Builder', color: 'teal' }
        : { label: 'Free Builder', color: 'violet' }

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        backgroundColor: 'var(--zyvavu-surface, #ffffff)',
        overflow: 'hidden',
      }}
    >
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />

      {/* TOP WORKSPACE TOOLBAR */}
      <Paper
        p="sm"
        withBorder
        style={{
          borderBottom: '1px solid var(--zyvavu-border, #dfe5e2)',
          borderRadius: 0,
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" wrap="wrap" gap="md">
          {/* Left: Navigation and Title */}
          <Group gap="sm">
            <Button
              component={Link}
              href="/admin/themes"
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<ArrowLeft size={16} />}
              onClick={(e) => {
                if (isDirty) {
                  const leave = window.confirm('You have unsaved changes. Leave Theme Builder?')
                  if (!leave) e.preventDefault()
                }
              }}
            >
              Themes
            </Button>
            <Box>
              <Group gap="xs">
                <Title order={3} size="h4" style={{ margin: 0, fontWeight: 700, color: 'var(--zyvavu-primary, #0e6b66)' }}>
                  Theme Builder
                </Title>
                <Badge
                  color={themeId === activeThemeId ? 'teal' : 'gray'}
                  variant="filled"
                  size="sm"
                >
                  {installedThemes.find((t) => t.id === themeId)?.label || themeId}
                  {themeId === activeThemeId ? ' (Active)' : ''}
                </Badge>
                <Badge color={modeBadge.color} variant="light" size="sm">
                  {modeBadge.label}
                </Badge>
                {isDirty && (
                  <Badge color="orange" variant="filled" size="sm">
                    Unsaved Changes
                  </Badge>
                )}
              </Group>
            </Box>
            {installedThemes.length > 1 && (
              <Select
                size="xs"
                style={{ width: 170 }}
                data={installedThemes.map((t) => ({
                  value: t.id,
                  label: `${t.label}${t.id === activeThemeId ? ' (Active)' : ''}`,
                }))}
                value={themeId}
                onChange={(val) => {
                  if (val && val !== themeId) {
                    if (isDirty && !confirm('You have unsaved changes. Switch themes anyway?')) return
                    window.location.href = `/admin/theme-builder?theme=${val}&template=${selectedTemplate}`
                  }
                }}
              />
            )}
          </Group>

          {/* Center: Template Selector */}
          <SegmentedControl
            value={selectedTemplate}
            onChange={(val) => handleTemplateChange(val as TemplateContext)}
            data={TEMPLATE_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value,
              disabled: opt.value === 'product',
            }))}
            size="sm"
            color="teal"
          />

          {/* Right: Actions */}
          <Group gap="xs">
            {saveSuccess && (
              <Badge color="green" variant="light" leftSection={<Check size={12} />} size="md">
                Template Saved
              </Badge>
            )}
            <Button
              onClick={() => handleSave()}
              loading={isSaving}
              leftSection={<Save size={16} />}
              color="teal"
              size="sm"
              disabled={isSaving}
            >
              Save Template
            </Button>
          </Group>
        </Group>

        {/* Validation or Error Alert */}
        {saveError && (
          <Alert
            icon={<AlertCircle size={16} />}
            title="Validation Failure"
            color="red"
            variant="light"
            mt="xs"
            withCloseButton
            onClose={() => setSaveError(null)}
          >
            {saveError}
          </Alert>
        )}
      </Paper>

      {/* PUCK EDITOR WORKSPACE */}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <PuckHost
          key={selectedTemplate}
          config={puckConfig}
          document={(activeDoc || { content: [], root: { props: {} } }) as unknown as BuilderDocument}
          onSave={handleSave}
          onChange={handleDocChange}
          isSaving={isSaving}
          hideTopBar={true}
          height="100%"
          themeConfig={themeConfig}
          templateContext={selectedTemplate}
        />
      </Box>
    </Box>
  )
}
