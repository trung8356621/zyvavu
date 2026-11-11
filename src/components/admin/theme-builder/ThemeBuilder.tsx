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
  Modal,
  Paper,
  Select,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, ChevronDown, Plus, Redo2, Save, Undo2 } from 'lucide-react'

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
import { canonicalizeZonesToSlots } from '@/lib/theme-engine/document-slots'
import type { LoopItemTemplateMeta } from '@/lib/theme-engine/loop-item-templates-types'
import { LoopItemTemplatesProvider } from '@/lib/theme-engine/loop-item-templates-context'
import {
  buildLoopItemEditorUrl,
  createEmptyLoopItemDocument,
} from '@/lib/theme-engine/loop-item-document'

export type ThemeBuilderProps = {
  themeId?: string
  activeThemeId?: string
  installedThemes?: any[]
  initialTemplates: Record<TemplateContext, ThemeTemplateDocument>
  initialContext?: TemplateContext
  initialLoopItemId?: string
  initialLoopItems?: LoopItemTemplateMeta[]
  initialLoopDocuments?: Record<string, ThemeTemplateDocument>
  themeConfig?: ThemeConfig
  contactEntries?: import('@/lib/site/contact').ContactEntry[]
  libraryLanguage?: string
}

const TEMPLATE_OPTIONS: { label: string; value: TemplateContext; badge?: string }[] = [
  { label: 'Header', value: 'header' },
  { label: 'Home', value: 'home' },
  { label: 'Single Post', value: 'single' },
  { label: 'Page', value: 'page' },
  { label: 'Category', value: 'category' },
  { label: 'Footer', value: 'footer' },
  { label: 'Loop Item', value: 'loopItem' },
  { label: 'Product (Contract)', value: 'product', badge: 'Pending' },
]

export function ThemeBuilder({
  themeId = 'corporate',
  activeThemeId = 'corporate',
  installedThemes = [],
  initialTemplates,
  initialContext = 'single',
  initialLoopItemId,
  initialLoopItems = [],
  initialLoopDocuments = {},
  themeConfig,
  contactEntries,
  libraryLanguage,
}: ThemeBuilderProps) {
  const normalizedInitialTemplates = useMemo(() => {
    const result: Record<TemplateContext, ThemeTemplateDocument> = {} as any
    if (initialTemplates) {
      for (const [ctx, doc] of Object.entries(initialTemplates)) {
        if (ctx === 'loopItem') continue
        result[ctx as TemplateContext] = normalizeThemeTemplateDocument(doc)
      }
    }
    return result
  }, [initialTemplates])

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateContext>(initialContext)
  const [templates, setTemplates] = useState<Record<TemplateContext, ThemeTemplateDocument>>(normalizedInitialTemplates)
  const [loopItems, setLoopItems] = useState<LoopItemTemplateMeta[]>(initialLoopItems)
  const [loopDocuments, setLoopDocuments] = useState<Record<string, ThemeTemplateDocument>>(() => {
    const next: Record<string, ThemeTemplateDocument> = {}
    for (const [id, doc] of Object.entries(initialLoopDocuments || {})) {
      next[id] = normalizeThemeTemplateDocument(doc)
    }
    return next
  })
  const [selectedLoopItemId, setSelectedLoopItemId] = useState<string | null>(
    initialLoopItemId || initialLoopItems[0]?.id || null,
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [history, setHistory] = useState<EditorHistoryCoordinator | null>(null)
  const [historyTick, setHistoryTick] = useState(0)
  const [previewControlTarget, setPreviewControlTarget] = useState<HTMLDivElement | null>(null)
  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), [])

  const activeDoc =
    selectedTemplate === 'loopItem'
      ? selectedLoopItemId
        ? loopDocuments[selectedLoopItemId] ||
          createEmptyLoopItemDocument(
            loopItems.find((item) => item.id === selectedLoopItemId)?.name || 'Loop Item',
            selectedLoopItemId,
          )
        : createEmptyLoopItemDocument('Loop Item', 'draft')
      : templates[selectedTemplate]
  const latestDocRef = useRef<ThemeTemplateDocument>(activeDoc)

  useEffect(() => {
    latestDocRef.current = activeDoc
  }, [activeDoc])

  const currentPolicy = useMemo(() => {
    try {
      return getTemplatePolicy(selectedTemplate)
    } catch {
      return null
    }
  }, [selectedTemplate])

  const puckConfig = useMemo(() => {
    return getEditorConfigForContext(selectedTemplate, themeConfig, contactEntries)
  }, [selectedTemplate, themeConfig, contactEntries])

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

    if (nextContext === 'loopItem' && !selectedLoopItemId && loopItems[0]?.id) {
      setSelectedLoopItemId(loopItems[0].id)
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
      metadata:
        selectedTemplate === 'loopItem'
          ? {
              ...(updated as any).metadata,
              loopItemId: selectedLoopItemId,
              name: loopItems.find((item) => item.id === selectedLoopItemId)?.name,
            }
          : (updated as any).metadata,
    }
    latestDocRef.current = asThemeDoc
  }, [selectedTemplate, selectedLoopItemId, loopItems])

  const handleSave = useCallback(
    async (customDoc?: BuilderDocument) => {
      const raw = (customDoc || latestDocRef.current) as ThemeTemplateDocument
      const docToValidate = canonicalizeZonesToSlots({
        ...raw,
        template: selectedTemplate,
        version: raw.version || 1,
        metadata:
          selectedTemplate === 'loopItem'
            ? {
                ...(raw.metadata || {}),
                loopItemId: selectedLoopItemId,
                name: loopItems.find((item) => item.id === selectedLoopItemId)?.name,
              }
            : raw.metadata,
      }) as ThemeTemplateDocument
      latestDocRef.current = docToValidate

      const previous =
        selectedTemplate === 'loopItem'
          ? selectedLoopItemId
            ? loopDocuments[selectedLoopItemId]
            : null
          : templates[selectedTemplate]

      const validation = validateThemeTemplateDocument(
        docToValidate,
        selectedTemplate,
        previous,
      )

      if (!validation.valid) {
        setSaveError(`Policy validation failed: ${validation.errors.join('; ')}`)
        return
      }

      if (selectedTemplate === 'loopItem' && !selectedLoopItemId) {
        setSaveError('Create or select a Loop Item Template before saving.')
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
            loopItemId: selectedLoopItemId,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.errors?.join('; ') || data.message || 'Failed to save template override')
        }

        if (selectedTemplate === 'loopItem' && selectedLoopItemId) {
          setLoopDocuments((prev) => ({ ...prev, [selectedLoopItemId]: docToValidate }))
          setLoopItems((prev) =>
            prev.map((item) =>
              item.id === selectedLoopItemId
                ? { ...item, updatedAt: docToValidate.updatedAt || new Date().toISOString() }
                : item,
            ),
          )
        } else {
          setTemplates((prev) => ({
            ...prev,
            [selectedTemplate]: docToValidate,
          }))
        }
        setIsDirty(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err: any) {
        setSaveError(err.message || 'An error occurred while saving the template.')
      } finally {
        setIsSaving(false)
      }
    },
    [selectedTemplate, templates, themeId, selectedLoopItemId, loopDocuments, loopItems],
  )

  const handleCreateLoopItem = useCallback(async () => {
    const name = createName.trim()
    if (!name) {
      setSaveError('Template name is required')
      return
    }
    if (createBusy) return

    // Open synchronously from the click gesture to avoid popup blockers.
    const editorTab = window.open('about:blank', '_blank')
    if (!editorTab) {
      setSaveError('Could not open a new tab. Allow popups for Theme Builder, then try again.')
      return
    }

    setCreateBusy(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/theme-builder/loop-item/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, themeId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.errors?.join('; ') || data.message || 'Failed to create Loop Item')
      }
      const meta = data.meta as LoopItemTemplateMeta
      const document = normalizeThemeTemplateDocument(data.document as ThemeTemplateDocument)

      // Keep this tab on its current template; open the new editor by stable ID.
      editorTab.location.href = buildLoopItemEditorUrl(themeId, meta.id)

      setLoopItems((prev) => [...prev, meta])
      setLoopDocuments((prev) => ({ ...prev, [meta.id]: document }))
      setCreateOpen(false)
      setCreateName('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      try {
        editorTab.close()
      } catch {
        // Ignore if the browser already closed the placeholder tab.
      }
      setSaveError(err.message || 'Failed to create Loop Item Template')
    } finally {
      setCreateBusy(false)
    }
  }, [createBusy, createName, themeId])

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

            <Menu withinPortal position="bottom-start">
              <Menu.Target>
                <Tooltip label="Create template">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    aria-label="Create template"
                    data-testid="theme-builder-create-template"
                  >
                    <Plus size={14} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Create</Menu.Label>
                <Menu.Item
                  leftSection={<Plus size={14} />}
                  onClick={() => {
                    setCreateName('')
                    setCreateOpen(true)
                  }}
                  data-testid="theme-builder-create-loop-item"
                >
                  Loop Item
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {selectedTemplate === 'loopItem' && (
              <Select
                size="xs"
                w={180}
                aria-label="Loop Item Template"
                placeholder={loopItems.length ? 'Select Loop Item' : 'No Loop Items yet'}
                data={loopItems.map((item) => ({ value: item.id, label: item.name }))}
                value={selectedLoopItemId}
                onChange={(val) => {
                  if (!val || val === selectedLoopItemId) return
                  if (isDirty) {
                    const ok = window.confirm(
                      'You have unsaved changes. Switch Loop Item Template without saving?',
                    )
                    if (!ok) return
                  }
                  setSelectedLoopItemId(val)
                  setIsDirty(false)
                  setSaveError(null)
                }}
                disabled={loopItems.length === 0}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
              />
            )}
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
            <div ref={setPreviewControlTarget} />
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
        <LoopItemTemplatesProvider
          value={{
            themeId,
            items: loopItems,
            documents: loopDocuments,
          }}
        >
          <PuckHost
            libraryLanguage={libraryLanguage}
            key={`${selectedTemplate}:${selectedLoopItemId || ''}`}
            config={puckConfig}
            document={
              (activeDoc || { content: [], root: { props: {} } }) as unknown as BuilderDocument
            }
            onSave={handleSave}
            onChange={handleDocChange}
            isSaving={isSaving}
            hideTopBar={true}
            height="100%"
            themeConfig={themeConfig}
            templateContext={selectedTemplate}
            previewControlTarget={previewControlTarget}
            onHistoryReady={setHistory}
          />
        </LoopItemTemplatesProvider>
      </Box>

      <Modal
        opened={createOpen}
        onClose={() => (!createBusy ? setCreateOpen(false) : undefined)}
        title="Create Loop Item Template"
        centered
        size="sm"
      >
        <Text size="sm" c="dimmed" mb="sm">
          Creates a standalone Loop Item Template. Collection Loops reference it by identity.
        </Text>
        <TextInput
          label="Template Name"
          placeholder="Article Card"
          value={createName}
          onChange={(event) => setCreateName(event.currentTarget.value)}
          data-testid="loop-item-create-name"
          required
          mb="md"
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setCreateOpen(false)} disabled={createBusy}>
            Cancel
          </Button>
          <Button
            color="teal"
            loading={createBusy}
            disabled={!createName.trim()}
            onClick={() => void handleCreateLoopItem()}
            data-testid="loop-item-create-submit"
          >
            Create
          </Button>
        </Group>
      </Modal>
    </Box>
  )
}
