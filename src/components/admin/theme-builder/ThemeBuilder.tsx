'use client'
import { withRoleContract, homeHeadingWarning } from '@/lib/theme-engine/widget-contracts'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  FileButton,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, ChevronDown, Download, Plus, Redo2, Save, Undo2, Upload } from 'lucide-react'

import { PuckHost } from '@/components/builder/core/PuckHost'
import type { EditorHistoryCoordinator } from '@/lib/style-engine/editor-history'
import type { BuilderDocument } from '@/components/builder/core/types'
import type { TemplateContext, ThemeConfig, ThemeTemplateDocument } from '@/lib/theme-engine/types'
import { THEME_BUILDER_TEMPLATE_OPTIONS } from '@/lib/theme-engine/builder-navigation'
import { getTemplatePolicy } from '@/lib/theme-engine/policy'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import { normalizeThemeTemplateDocument } from '@/lib/theme-engine/normalization'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { canonicalizeZonesToSlots } from '@/lib/theme-engine/document-slots'
import type { LoopItemTemplateMeta } from '@/lib/theme-engine/loop-item-templates-types'
import { LoopItemTemplatesProvider } from '@/lib/theme-engine/loop-item-templates-context'
import {
  buildLoopItemEditorUrl,
  createEmptyLoopItemDocument,
} from '@/lib/theme-engine/loop-item-document'
import {
  LEGACY_TEMPLATE_VERSION_ID,
  VERSIONABLE_TEMPLATE_CONTEXTS,
  isVersionableTemplateContext,
  setActiveVersionLabel,
  templateVersionLabel,
  type TemplateVersionMeta,
  type VersionableTemplateContext,
} from '@/lib/theme-engine/template-versions'
import { MAX_TEMPLATE_IMPORT_BYTES } from '@/lib/theme-engine/theme-import-limit'

export type ThemeBuilderProps = {
  themeId?: string
  activeThemeId?: string
  installedThemes?: any[]
  initialTemplates: Record<TemplateContext, ThemeTemplateDocument>
  initialContext?: TemplateContext
  initialLoopItemId?: string
  initialLoopItems?: LoopItemTemplateMeta[]
  initialLoopDocuments?: Record<string, ThemeTemplateDocument>
  initialVersionItems?: Partial<Record<VersionableTemplateContext, TemplateVersionMeta[]>>
  initialVersionPrimary?: Partial<Record<VersionableTemplateContext, string>>
  initialSelectedVersions?: Partial<Record<VersionableTemplateContext, string>>
  initialVersionDocuments?: Partial<Record<VersionableTemplateContext, Record<string, ThemeTemplateDocument>>>
  /** Wizard deep-link: open "Tạo phiên bản mới" so Nhập JSON is one click away. */
  initialOpenVersionImport?: boolean
  themeConfig?: ThemeConfig
  contactEntries?: import('@/lib/site/contact').ContactEntry[]
  libraryLanguage?: string
}

export function ThemeBuilder({
  themeId = 'corporate',
  activeThemeId = 'corporate',
  installedThemes = [],
  initialTemplates,
  initialContext = 'single',
  initialLoopItemId,
  initialLoopItems = [],
  initialLoopDocuments = {},
  initialVersionItems = {},
  initialVersionPrimary = {},
  initialSelectedVersions = {},
  initialVersionDocuments = {},
  initialOpenVersionImport = false,
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
  const [versionItems, setVersionItems] = useState<Partial<Record<VersionableTemplateContext, TemplateVersionMeta[]>>>(() => {
    const next: Partial<Record<VersionableTemplateContext, TemplateVersionMeta[]>> = {}
    for (const context of VERSIONABLE_TEMPLATE_CONTEXTS) {
      next[context] = initialVersionItems[context] || [{
        id: LEGACY_TEMPLATE_VERSION_ID,
        name: `${templateVersionLabel(context)} v1`,
      }]
    }
    return next
  })
  const [versionPrimary, setVersionPrimary] = useState<Partial<Record<VersionableTemplateContext, string>>>(() => {
    const next: Partial<Record<VersionableTemplateContext, string>> = {}
    for (const context of VERSIONABLE_TEMPLATE_CONTEXTS) {
      next[context] = initialVersionPrimary[context] || LEGACY_TEMPLATE_VERSION_ID
    }
    return next
  })
  const [selectedVersions, setSelectedVersions] = useState<Partial<Record<VersionableTemplateContext, string>>>(() => {
    const next: Partial<Record<VersionableTemplateContext, string>> = {}
    for (const context of VERSIONABLE_TEMPLATE_CONTEXTS) {
      next[context] =
        initialSelectedVersions[context] ||
        initialVersionPrimary[context] ||
        LEGACY_TEMPLATE_VERSION_ID
    }
    return next
  })
  const [versionDocuments, setVersionDocuments] = useState<
    Partial<Record<VersionableTemplateContext, Record<string, ThemeTemplateDocument>>>
  >(() => {
    const next: Partial<Record<VersionableTemplateContext, Record<string, ThemeTemplateDocument>>> = {}
    for (const context of VERSIONABLE_TEMPLATE_CONTEXTS) {
      const docs: Record<string, ThemeTemplateDocument> = {}
      for (const [id, doc] of Object.entries(initialVersionDocuments[context] || {})) {
        docs[id] = normalizeThemeTemplateDocument(doc)
      }
      if (!docs[LEGACY_TEMPLATE_VERSION_ID] && normalizedInitialTemplates[context]) {
        docs[LEGACY_TEMPLATE_VERSION_ID] = normalizedInitialTemplates[context]
      }
      next[context] = docs
    }
    return next
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [versionCreateOpen, setVersionCreateOpen] = useState(
    () => Boolean(initialOpenVersionImport && isVersionableTemplateContext(initialContext)),
  )
  const [versionImportBusy, setVersionImportBusy] = useState(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [history, setHistory] = useState<EditorHistoryCoordinator | null>(null)
  const [historyTick, setHistoryTick] = useState(0)
  const [previewControlTarget, setPreviewControlTarget] = useState<HTMLDivElement | null>(null)
  const versionImportReset = useRef<() => void>(null)
  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), [])

  const versionable = isVersionableTemplateContext(selectedTemplate)
  const selectedVersionId = versionable
    ? (selectedVersions[selectedTemplate] || LEGACY_TEMPLATE_VERSION_ID)
    : null
  const activePrimaryId = versionable
    ? (versionPrimary[selectedTemplate] || LEGACY_TEMPLATE_VERSION_ID)
    : null
  const activeVersionItems = versionable ? (versionItems[selectedTemplate] || []) : []
  const activeVersionDocs = versionable ? (versionDocuments[selectedTemplate] || {}) : {}
  const activeDoc =
    selectedTemplate === 'loopItem'
      ? selectedLoopItemId
        ? loopDocuments[selectedLoopItemId] ||
          createEmptyLoopItemDocument(
            loopItems.find((item) => item.id === selectedLoopItemId)?.name || 'Loop Item',
            selectedLoopItemId,
          )
        : createEmptyLoopItemDocument('Loop Item', 'draft')
      : versionable && selectedVersionId
        ? activeVersionDocs[selectedVersionId] || templates[selectedTemplate]
        : templates[selectedTemplate]
  const latestDocRef = useRef<ThemeTemplateDocument>(activeDoc)
  const selectedVersionMeta = activeVersionItems.find((item) => item.id === selectedVersionId)

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
          : versionable && selectedVersionId
            ? {
                ...(updated as any).metadata,
                templateVersionId: selectedVersionId,
                ...(selectedTemplate === 'home' ? { homeVersionId: selectedVersionId } : {}),
                name: selectedVersionMeta?.name,
              }
            : (updated as any).metadata,
    }
    latestDocRef.current = asThemeDoc
  }, [selectedTemplate, selectedLoopItemId, loopItems, versionable, selectedVersionId, selectedVersionMeta])

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
            : versionable && selectedVersionId
              ? {
                  ...(raw.metadata || {}),
                  templateVersionId: selectedVersionId,
                  ...(selectedTemplate === 'home' ? { homeVersionId: selectedVersionId } : {}),
                  name: selectedVersionMeta?.name,
                }
              : raw.metadata,
      }) as ThemeTemplateDocument
      latestDocRef.current = docToValidate

      const previous =
        selectedTemplate === 'loopItem'
          ? selectedLoopItemId
            ? loopDocuments[selectedLoopItemId]
            : null
          : versionable && selectedVersionId
            ? activeVersionDocs[selectedVersionId]
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
            templateVersionId: versionable ? selectedVersionId : undefined,
            homeVersionId: selectedTemplate === 'home' ? selectedVersionId : undefined,
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
        } else if (versionable && selectedVersionId) {
          const context = selectedTemplate as VersionableTemplateContext
          setVersionDocuments((prev) => ({
            ...prev,
            [context]: { ...(prev[context] || {}), [selectedVersionId]: docToValidate },
          }))
          setVersionItems((prev) => ({
            ...prev,
            [context]: (prev[context] || []).map((item) =>
              item.id === selectedVersionId
                ? { ...item, updatedAt: docToValidate.updatedAt || new Date().toISOString() }
                : item,
            ),
          }))
          setTemplates((prev) =>
            selectedVersionId === activePrimaryId
              ? { ...prev, [context]: docToValidate }
              : prev,
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
    [
      selectedTemplate, templates, themeId, selectedLoopItemId, loopDocuments, loopItems,
      versionable, selectedVersionId, selectedVersionMeta, activeVersionDocs, activePrimaryId,
    ],
  )

  const exportTemplateJson = useCallback(() => {
    if (!versionable || !selectedVersionId) return
    const document = latestDocRef.current
    const envelope = {
      themeId,
      template: selectedTemplate,
      versionId: selectedVersionId,
      document,
    }
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = `${themeId}-${selectedTemplate}-${selectedVersionId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    if (isDirty) {
      window.alert('Exported the in-progress document (includes unsaved canvas changes).')
    }
  }, [themeId, selectedTemplate, selectedVersionId, versionable, isDirty])

  const cloneTemplateVersion = useCallback(async () => {
    if (!versionable || !selectedVersionId) return
    setCreateBusy(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/theme-builder/template-version/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId,
          template: selectedTemplate,
          document: latestDocRef.current,
          sourceVersionId: selectedVersionId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.errors?.join('; ') || data.message || 'Failed to create template version')
      }
      const meta = data.meta as TemplateVersionMeta
      const document = normalizeThemeTemplateDocument(data.document as ThemeTemplateDocument)
      const context = selectedTemplate as VersionableTemplateContext
      setVersionItems((prev) => ({ ...prev, [context]: [...(prev[context] || []), meta] }))
      setVersionDocuments((prev) => ({
        ...prev,
        [context]: { ...(prev[context] || {}), [meta.id]: document },
      }))
      setSelectedVersions((prev) => ({ ...prev, [context]: meta.id }))
      latestDocRef.current = document
      setIsDirty(false)
      setVersionCreateOpen(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create template version')
    } finally {
      setCreateBusy(false)
    }
  }, [themeId, selectedTemplate, selectedVersionId, versionable])

  const importTemplateJson = useCallback(async (file: File) => {
    if (!versionable) return
    versionImportReset.current?.()
    if (file.size > MAX_TEMPLATE_IMPORT_BYTES) {
      setSaveError('Template JSON must be 512 KB or smaller.')
      return
    }
    setVersionImportBusy(true)
    setSaveError(null)
    try {
      const previewQuery = new URLSearchParams({
        themeId, template: selectedTemplate, action: 'preview',
      })
      const previewRes = await fetch(`/api/theme-builder/import?${previewQuery}`, {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': 'application/json' },
      })
      const preview = await previewRes.json()
      if (!previewRes.ok || !preview.success) {
        throw new Error(preview.errors?.join('; ') || 'Import preview failed')
      }
      const label = preview.preview?.destination?.label || 'new version'
      const ok = window.confirm(
        `Import will create ${label} from this JSON (source versionId is reference only; active version stays unchanged). Continue?`,
      )
      if (!ok) return
      const saveQuery = new URLSearchParams({
        themeId, template: selectedTemplate, action: 'save', revision: preview.revision,
      })
      const saveRes = await fetch(`/api/theme-builder/import?${saveQuery}`, {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': 'application/json' },
      })
      const saved = await saveRes.json()
      if (!saveRes.ok || !saved.success) {
        throw new Error(saved.errors?.join('; ') || 'Import save failed')
      }
      const meta = (saved.templateVersion || saved.homeVersion) as TemplateVersionMeta
      const document = normalizeThemeTemplateDocument(saved.document as ThemeTemplateDocument)
      const context = selectedTemplate as VersionableTemplateContext
      setVersionItems((prev) => ({ ...prev, [context]: [...(prev[context] || []), meta] }))
      setVersionDocuments((prev) => ({
        ...prev,
        [context]: { ...(prev[context] || {}), [meta.id]: document },
      }))
      setSelectedVersions((prev) => ({ ...prev, [context]: meta.id }))
      latestDocRef.current = document
      setIsDirty(false)
      setVersionCreateOpen(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to import template JSON')
    } finally {
      setVersionImportBusy(false)
    }
  }, [themeId, selectedTemplate, versionable])

  const setTemplateAsPrimary = useCallback(async () => {
    if (!versionable || !selectedVersionId) return
    if (isDirty) {
      setSaveError('Save the version before setting it as the active template.')
      return
    }
    setCreateBusy(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/theme-builder/template-version/set-primary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId,
          template: selectedTemplate,
          versionId: selectedVersionId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.errors?.join('; ') || data.message || 'Failed to set active version')
      }
      const context = selectedTemplate as VersionableTemplateContext
      setVersionPrimary((prev) => ({
        ...prev,
        [context]: data.index?.primaryId || selectedVersionId,
      }))
      if (data.index?.items) {
        setVersionItems((prev) => ({ ...prev, [context]: data.index.items }))
      }
      const primaryDoc = activeVersionDocs[selectedVersionId]
      if (primaryDoc) setTemplates((prev) => ({ ...prev, [context]: primaryDoc }))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to set active version')
    } finally {
      setCreateBusy(false)
    }
  }, [themeId, selectedTemplate, selectedVersionId, versionable, isDirty, activeVersionDocs])

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
      {/* Content theme CSS/fonts are scoped to the Puck canvas iframe — not Admin chrome. */}

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
              data={THEME_BUILDER_TEMPLATE_OPTIONS.map((opt) => ({
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

            {versionable && selectedVersionId && (
              <Group gap={6} wrap="nowrap">
                <Select
                  size="xs"
                  w={180}
                  aria-label="Template version"
                  data={activeVersionItems.map((item) => ({
                    value: item.id,
                    label: item.id === activePrimaryId ? `${item.name} · Đang dùng` : item.name,
                  }))}
                  value={selectedVersionId}
                  onChange={(val) => {
                    if (!val || val === selectedVersionId) return
                    if (isDirty) {
                      const ok = window.confirm(
                        'You have unsaved changes. Switch version without saving?',
                      )
                      if (!ok) return
                    }
                    const context = selectedTemplate as VersionableTemplateContext
                    setSelectedVersions((prev) => ({ ...prev, [context]: val }))
                    const next = activeVersionDocs[val]
                    if (next) latestDocRef.current = next
                    setIsDirty(false)
                    setSaveError(null)
                  }}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: true }}
                  data-testid="template-version-select"
                />
                {selectedVersionId === activePrimaryId ? (
                  <Badge size="sm" color="teal" variant="light">Đang dùng</Badge>
                ) : (
                  <Badge size="sm" color="gray" variant="outline">Editing</Badge>
                )}
                <Menu withinPortal position="bottom-start">
                  <Menu.Target>
                    <ActionIcon size="sm" variant="default" aria-label="Template version actions" data-testid="template-version-menu">
                      <ChevronDown size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>
                      {selectedVersionMeta?.name || templateVersionLabel(selectedTemplate as VersionableTemplateContext)} ({selectedVersionId})
                      {selectedVersionId !== activePrimaryId ? ' · not active' : ''}
                    </Menu.Label>
                    <Menu.Item leftSection={<Download size={14} />} onClick={exportTemplateJson}>
                      Xuất JSON
                    </Menu.Item>
                    <Menu.Item leftSection={<Plus size={14} />} onClick={() => setVersionCreateOpen(true)}>
                      Tạo phiên bản mới
                    </Menu.Item>
                    <Menu.Item
                      disabled={selectedVersionId === activePrimaryId || createBusy}
                      onClick={() => void setTemplateAsPrimary()}
                    >
                      {setActiveVersionLabel(selectedTemplate as VersionableTemplateContext)}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
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
            key={`${selectedTemplate}:${selectedLoopItemId || ''}:${selectedVersionId || ''}`}
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
            themeId={themeId}
            homeVersionId={versionable ? selectedVersionId : null}
            previewControlTarget={previewControlTarget}
            onHistoryReady={setHistory}
          />
        </LoopItemTemplatesProvider>
      </Box>

      <Modal
        opened={versionCreateOpen}
        onClose={() => (!createBusy && !versionImportBusy ? setVersionCreateOpen(false) : undefined)}
        title="Tạo phiên bản mới"
        centered
        size="sm"
      >
        <Text size="sm" c="dimmed" mb="xs">
          Tạo phiên bản với ID mới rồi mở bản đó trong Builder. Bản đang dùng không đổi.
        </Text>
        <Text size="sm" c="dimmed" mb="sm">
          Cả hai cách đều tạo phiên bản mới.
        </Text>
        <Group grow mb="sm">
          <Button
            color="teal"
            loading={createBusy}
            onClick={() => void cloneTemplateVersion()}
            data-testid="template-clone-version"
          >
            Sao chép bản đang mở
          </Button>
        </Group>
        <FileButton
          accept=".json,application/json"
          resetRef={versionImportReset}
          onChange={(file) => { if (file) void importTemplateJson(file) }}
        >
          {(props) => (
            <Button
              {...props}
              fullWidth
              variant="light"
              leftSection={<Upload size={14} />}
              loading={versionImportBusy}
              data-testid="template-import-json"
            >
              Tạo bản mới từ file JSON
            </Button>
          )}
        </FileButton>
      </Modal>

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
