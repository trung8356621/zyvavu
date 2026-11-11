'use client'
import { withRoleContract, homeHeadingWarning } from '@/lib/theme-engine/widget-contracts'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Menu,
  Paper,
  Select,
  Text,
  Tooltip,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, Check, ChevronDown, Redo2, Save, Undo2 } from 'lucide-react'

import { PuckHost } from '@/components/builder/core/PuckHost'
import type { EditorHistoryCoordinator } from '@/lib/style-engine/editor-history'
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
  const [history, setHistory] = useState<EditorHistoryCoordinator | null>(null)
  const [historyTick, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), [])

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
    [selectedTemplate, templates, themeId],
  )

  const themeLabel = installedThemes.find((t) => t.id === themeId)?.label || themeId
  const modeLabel =
    currentPolicy?.mode === 'structured-header'
      ? 'Structured Header'
      : currentPolicy?.mode === 'document'
        ? 'Document Builder'
        : 'Free Builder'

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

      {/* PO UX V5 — one primary header row */}
      <Paper
        px="sm"
        py={4}
        withBorder
        data-testid="theme-builder-header"
        style={{
          borderBottom: '1px solid var(--zyvavu-border, #dfe5e2)',
          borderRadius: 0,
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs" style={{ minWidth: 0 }}>
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Button
              component={Link}
              href="/admin/themes"
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<ArrowLeft size={14} />}
              onClick={(e) => {
                if (isDirty) {
                  const leave = window.confirm('You have unsaved changes. Leave Theme Builder?')
                  if (!leave) e.preventDefault()
                }
              }}
            >
              Themes
            </Button>

            <Menu withinPortal position="bottom-start">
              <Menu.Target>
                <Button
                  size="compact-sm"
                  variant="light"
                  color="gray"
                  rightSection={<ChevronDown size={14} />}
                  aria-label="Template menu"
                  style={{ maxWidth: 180 }}
                >
                  <Text size="sm" fw={600} truncate>
                    {themeLabel}
                  </Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Theme</Menu.Label>
                <Menu.Item disabled>
                  {themeLabel}
                  {themeId === activeThemeId ? ' · Active' : ''}
                </Menu.Item>
                {installedThemes.length > 1 && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Switch theme</Menu.Label>
                    {installedThemes.map((t) => (
                      <Menu.Item
                        key={t.id}
                        disabled={t.id === themeId}
                        onClick={() => {
                          if (isDirty && !confirm('You have unsaved changes. Switch themes anyway?')) return
                          window.location.href = `/admin/theme-builder?theme=${t.id}&template=${selectedTemplate}`
                        }}
                      >
                        {t.label}
                        {t.id === activeThemeId ? ' (Active)' : ''}
                      </Menu.Item>
                    ))}
                  </>
                )}
                <Menu.Divider />
                <Menu.Label>Builder</Menu.Label>
                <Menu.Item disabled>{modeLabel}</Menu.Item>
                <Menu.Item disabled>Context: {selectedTemplate}</Menu.Item>
                {homeHeadingWarning(activeDoc) && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Notice</Menu.Label>
                    <Menu.Item disabled>{homeHeadingWarning(activeDoc)}</Menu.Item>
                  </>
                )}
                {['single', 'page', 'category'].includes(selectedTemplate) &&
                  activeDoc?.metadata?.roleContract !== 1 && (
                    <>
                      <Menu.Divider />
                      <Menu.Item
                        onClick={() => {
                          const upgraded = withRoleContract(latestDocRef.current)
                          const result = validateThemeTemplateDocument(
                            upgraded,
                            selectedTemplate,
                            templates[selectedTemplate],
                          )
                          if (!result.valid) {
                            setSaveError(`Upgrade requires: ${result.errors.join('; ')}`)
                            return
                          }
                          setTemplates((previous) => ({ ...previous, [selectedTemplate]: upgraded }))
                          latestDocRef.current = upgraded
                          setIsDirty(true)
                        }}
                      >
                        Enable required title/content roles
                      </Menu.Item>
                    </>
                  )}
              </Menu.Dropdown>
            </Menu>

            <Select
              size="xs"
              w={140}
              aria-label="Page context"
              data={TEMPLATE_OPTIONS.map((opt) => ({
                label: opt.badge ? `${opt.label} (${opt.badge})` : opt.label,
                value: opt.value,
                disabled: opt.value === 'product',
              }))}
              value={selectedTemplate}
              onChange={(val) => {
                if (val) handleTemplateChange(val as TemplateContext)
              }}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
          </Group>

          <Group gap={4} wrap="nowrap">
            <Tooltip label="Undo">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label="Undo"
                disabled={!history?.canUndo()}
                onClick={() => {
                  history?.undo()
                  bumpHistory()
                }}
              >
                <Undo2 size={15} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Redo">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label="Redo"
                disabled={!history?.canRedo()}
                onClick={() => {
                  history?.redo()
                  bumpHistory()
                }}
              >
                <Redo2 size={15} />
              </ActionIcon>
            </Tooltip>
            {/* historyTick forces canUndo/canRedo re-read after undo/redo */}
            <span style={{ display: 'none' }} aria-hidden>
              {historyTick}
            </span>

            <Tooltip label={isDirty ? 'Unsaved changes' : saveSuccess ? 'Saved' : 'All changes saved'}>
              <Box
                component="span"
                aria-label={isDirty ? 'Unsaved changes' : 'Saved'}
                data-testid="unsaved-indicator"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: isDirty
                    ? 'var(--mantine-color-orange-6)'
                    : saveSuccess
                      ? 'var(--mantine-color-teal-6)'
                      : 'var(--mantine-color-gray-4)',
                  flexShrink: 0,
                }}
              />
            </Tooltip>
            {saveSuccess && (
              <Text size="xs" c="teal" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <Check size={12} /> Saved
              </Text>
            )}
            <Button
              onClick={() => handleSave()}
              loading={isSaving}
              leftSection={<Save size={14} />}
              color="teal"
              size="compact-sm"
              disabled={isSaving}
            >
              Save
            </Button>
          </Group>
        </Group>

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
          onHistoryReady={setHistory}
        />
      </Box>
    </Box>
  )
}
