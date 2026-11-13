'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  ColorSwatch,
  Divider,
  FileButton,
  Group,
  Modal,
  Radio,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { Copy, ExternalLink, Layers, Palette, Plus, RefreshCw, Upload } from 'lucide-react'
import {
  buildThemeBuilderPrompt,
  buildThemeCustomizePrompt,
  themeBuilderHref,
  themeCustomizerHref,
} from '@/lib/theme-engine/create-theme-prompts'
import { loadGoogleFontStyles } from '@/lib/theme-engine/fonts'
import { themeIdFromName } from '@/lib/theme-engine/theme-identity'
import {
  DEFAULT_BUILDER_MODE,
  DEFAULT_BUILDER_TEMPLATE,
  THEME_BUILDER_TEMPLATE_OPTIONS,
} from '@/lib/theme-engine/builder-navigation'
import { isVersionableTemplateContext } from '@/lib/theme-engine/template-versions'
import type { TemplateContext } from '@/lib/theme-engine/types'
import {
  MAX_TEMPLATE_IMPORT_BYTES,
  MAX_THEME_IMPORT_BYTES,
} from '@/lib/theme-engine/theme-import-limit'
import {
  fetchCustomizeDraftComplete,
  type CustomizeDraftCheck,
  type CustomizeDraftPreview,
} from '@/lib/theme-engine/wizard-customize-completion'
import {
  DEFAULT_WEBSITE_TYPE,
  normalizeWebsiteType,
  WEBSITE_TYPE_OPTIONS,
  websiteTypeLabel,
  type WebsiteType,
} from '@/lib/theme-engine/website-type'

export type CreatedThemeSummary = {
  id: string
  label: string
  description?: string
  websiteType?: WebsiteType
}

type WizardState = {
  styleDescription: string
  websiteRequirements: string
  templateRequirements: Record<string, string>
  customizeConfirmed: boolean
}

const emptyWizard = (): WizardState => ({
  styleDescription: '',
  websiteRequirements: '',
  templateRequirements: {},
  customizeConfirmed: false,
})

function loadWizard(themeId: string): WizardState {
  if (typeof window === 'undefined') return emptyWizard()
  try {
    const raw = sessionStorage.getItem(`zyvavu-create-theme-wizard:${themeId}`)
    if (!raw) return emptyWizard()
    const parsed = JSON.parse(raw) as Partial<WizardState>
    return {
      ...emptyWizard(),
      ...parsed,
      // Completion must come from Payload check-draft / import save read-back — never sessionStorage.
      customizeConfirmed: false,
    }
  } catch {
    return emptyWizard()
  }
}

function saveWizard(themeId: string, state: WizardState) {
  try {
    // Persist prompt text only. Do not store customizeConfirmed in sessionStorage.
    const { styleDescription, websiteRequirements, templateRequirements } = state
    sessionStorage.setItem(`zyvavu-create-theme-wizard:${themeId}`, JSON.stringify({
      styleDescription, websiteRequirements, templateRequirements,
    }))
  } catch {
    // ignore quota / private mode
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

export type CreateThemeWizardProps = {
  opened: boolean
  onClose: () => void
  onCreated: (theme: CreatedThemeSummary) => void
  existingTheme?: CreatedThemeSummary
}

type ImportPreview = {
  file: File
  revision: string
  changes: Array<{ field: string; before: string | null; after: string }>
}


const SUMMARY_COLORS = [
  ['primary', 'Primary'],
  ['accent', 'Accent'],
  ['background', 'Background'],
  ['surface', 'Surface'],
  ['text', 'Text'],
  ['border', 'Border'],
] as const

function summarizeSpacing(spacing: CustomizeDraftPreview['spacing']) {
  if (!spacing.length) return undefined
  const sizes = spacing.map(({ value }) => value.match(/^(\d+(?:\.\d+)?)(px|rem)$/))
  const unit = sizes[0]?.[2]
  if (!unit || !sizes.every((size) => size?.[2] === unit)) {
    return spacing.find(({ token }) => token === 'md')?.value ?? spacing[0].value
  }
  const values = sizes.map((size) => Number(size?.[1]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`
}

function SavedThemeTokens({ preview }: { preview: CustomizeDraftPreview }) {
  const { headingFont, bodyFont, baseFontSize } = preview.typography
  useEffect(() => {
    loadGoogleFontStyles([headingFont, bodyFont])
  }, [headingFont, bodyFont])

  const colors = SUMMARY_COLORS.flatMap(([token, label]) => {
    const color = preview.colors.find((entry) => entry.token === token)
    return color ? [{ label, value: color.value }] : []
  })
  const container = preview.layout.find(({ token }) => token === 'containerWidth')?.value
  const radius = preview.radius.find(({ token }) => token === 'md')?.value
  const metrics = [
    { label: 'Spacing', value: summarizeSpacing(preview.spacing) },
    { label: 'Layout', value: container && `${container} container` },
    { label: 'Radius', value: radius ? `${radius} default` : preview.radius[0]?.value },
  ]

  return (
    <>
      {colors.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={600}>Color palette</Text>
          <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="xs">
            {colors.map(({ label, value }) => (
              <Stack key={label} gap={4} align="center">
                <Tooltip label={value} withArrow>
                  <ColorSwatch color={value} radius="sm" role="img" aria-label={`${label} ${value}`} />
                </Tooltip>
                <Text size="xs" c="dimmed">{label}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {(headingFont || bodyFont || baseFontSize) && (
        <Stack gap={4}>
          <Group justify="space-between" gap="xs">
            <Text size="sm" fw={600}>Typography</Text>
            {baseFontSize && <Text size="xs" c="dimmed">Base size: {baseFontSize}</Text>}
          </Group>
          <Title order={4} style={{ fontFamily: headingFont ?? bodyFont, fontWeight: 600 }}>
            The quick brown fox
          </Title>
          <Text size="sm" style={{ fontFamily: bodyFont }}>
            Jumps over the lazy dog.
          </Text>
        </Stack>
      )}

      <SimpleGrid cols={3} spacing="xs">
        {metrics.map(({ label, value }) => value && (
          <Stack key={label} gap={2}>
            <Text size="xs" c="dimmed">{label}</Text>
            <Text size="sm" fw={600}>{value}</Text>
          </Stack>
        ))}
      </SimpleGrid>
    </>
  )
}

export function CreateThemeWizard({ opened, onClose, onCreated, existingTheme }: CreateThemeWizardProps) {
  const [name, setName] = useState('')
  const [websiteType, setWebsiteType] = useState<WebsiteType>(DEFAULT_WEBSITE_TYPE)
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedThemeSummary | null>(existingTheme ?? null)
  const [activeStep, setActiveStep] = useState(existingTheme ? 1 : 0)
  const [wizard, setWizard] = useState<WizardState>(() => existingTheme ? loadWizard(existingTheme.id) : emptyWizard())
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [builderMode, setBuilderMode] = useState<'full' | 'single'>(DEFAULT_BUILDER_MODE)
  const [builderTemplate, setBuilderTemplate] = useState<TemplateContext>(DEFAULT_BUILDER_TEMPLATE)
  const [loopItemId, setLoopItemId] = useState<string | null>(null)
  const [loopItemsResult, setLoopItemsResult] = useState<{
    themeId: string; items: { id: string; name: string }[]; error?: string
  }>()
  const [templateImportErrors, setTemplateImportErrors] = useState<string[]>([])
  const [templateImportBusy, setTemplateImportBusy] = useState(false)
  const templateImportReset = useRef<() => void>(null)
  const builderThemeId = created?.id
  const loopSelection = builderMode === 'single' && builderTemplate === 'loopItem'
  const loopItems = loopItemsResult?.themeId === builderThemeId ? loopItemsResult : undefined
  const selectedLoopItem = loopItems?.items.find((item) => item.id === loopItemId)
  const canOpenBuilder = !loopSelection || Boolean(selectedLoopItem)
  const canImportTemplateJson = Boolean(
    created
    && (
      builderMode === 'full'
      || isVersionableTemplateContext(builderTemplate)
    ),
  )
  const requirementsKey = selectedLoopItem ? `loopItem/${selectedLoopItem.id}` : builderTemplate

  useEffect(() => {
    if (!opened || activeStep !== 2 || !loopSelection || !builderThemeId) return
    const abort = new AbortController()
    void fetch(`/api/theme-builder/loop-item?theme=${encodeURIComponent(builderThemeId)}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load Loop Item templates.')
        const { items } = await response.json()
        if (!abort.signal.aborted) setLoopItemsResult({ themeId: builderThemeId, items })
      })
      .catch(() => {
        if (!abort.signal.aborted) setLoopItemsResult({ themeId: builderThemeId, items: [], error: 'Could not load Loop Item templates.' })
      })
    return () => abort.abort()
  }, [opened, activeStep, loopSelection, builderThemeId])
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importAction, setImportAction] = useState<'preview' | 'save' | 'check-draft' | 'hydrate' | null>(null)
  const [savedPreview, setSavedPreview] = useState<CustomizeDraftPreview | null>(null)
  const [draftProbe, setDraftProbe] = useState<'idle' | 'loading' | 'ready'>(
    existingTheme ? 'loading' : 'idle',
  )
  const importInFlight = useRef(false)
  const resetFile = useRef<() => void>(null)
  const hydratedThemeRef = useRef<string | null>(null)

  const applyDraftCheck = (check: CustomizeDraftCheck) => {
    if (check.complete && check.preview) {
      setWizard((prev) => ({ ...prev, customizeConfirmed: true }))
      setSavedPreview(check.preview)
      return
    }
    // No verified preview → do not show a false Saved state (cloned base tokens alone never count).
    setWizard((prev) => ({ ...prev, customizeConfirmed: false }))
    setSavedPreview(null)
  }

  const previewId = useMemo(() => {
    try {
      return name.trim() ? themeIdFromName(name) : ''
    } catch {
      return ''
    }
  }, [name])

  useEffect(() => {
    if (!created) return
    saveWizard(created.id, wizard)
  }, [created, wizard])

  // Derive Step 1 completion + saved preview from the persisted Theme Customize draft.
  // sessionStorage never stores customizeConfirmed or token values.
  useEffect(() => {
    if (!opened || !created) {
      if (!opened) hydratedThemeRef.current = null
      return
    }
    if (hydratedThemeRef.current === created.id || importInFlight.current) return
    const themeId = created.id
    const abort = new AbortController()
    importInFlight.current = true
    setDraftProbe('loading')
    setImportAction('hydrate')
    void fetchCustomizeDraftComplete(themeId, { signal: abort.signal })
      .then((check) => {
        if (abort.signal.aborted) return
        applyDraftCheck(check)
      })
      .finally(() => {
        if (abort.signal.aborted) return
        hydratedThemeRef.current = themeId
        importInFlight.current = false
        setImportAction(null)
        setDraftProbe('ready')
      })
    return () => {
      abort.abort()
      importInFlight.current = false
    }
  }, [opened, created])

  const reset = () => {
    setName('')
    setWebsiteType(DEFAULT_WEBSITE_TYPE)
    setDescription('')
    setCreating(false)
    setError(null)
    setCreated(null)
    setActiveStep(0)
    setWizard(emptyWizard())
    setCopyFeedback(null)
    setImportPreview(null)
    setImportErrors([])
    setImportAction(null)
    setTemplateImportErrors([])
    setTemplateImportBusy(false)
    setSavedPreview(null)
    setDraftProbe('idle')
    hydratedThemeRef.current = null
  }

  const handleClose = () => {
    if (importInFlight.current) return
    reset()
    onClose()
  }

  const handleImport = async (action: 'preview' | 'save' | 'check-draft', file?: File) => {
    if (!created || importInFlight.current) return
    resetFile.current?.()
    setImportErrors([])
    if (action !== 'save') setImportPreview(null)
    if (file && file.size > MAX_THEME_IMPORT_BYTES) {
      setImportErrors(['theme.json must be 64 KB or smaller.'])
      return
    }
    importInFlight.current = true
    setImportAction(action)
    const previousPreview = savedPreview
    const previousConfirmed = wizard.customizeConfirmed
    try {
      if (action === 'check-draft') {
        const check = await fetchCustomizeDraftComplete(created.id)
        if (check.complete && check.preview) {
          applyDraftCheck(check)
        } else {
          setImportErrors(check.errors ?? ['Save a draft in Theme Customizer first.'])
          // Network-only failures keep the last verified preview; missing/invalid drafts clear it.
          const networkOnly = check.errors?.some((message) =>
            message.includes('Unable to verify the theme draft'),
          )
          if (!networkOnly || !previousConfirmed || !previousPreview) {
            applyDraftCheck(check)
          }
        }
        return
      }
      const query = new URLSearchParams({ themeId: created.id, action })
      if (action === 'save' && importPreview) query.set('revision', importPreview.revision)
      const response = await fetch(`/api/theme-customizer/import?${query}`, {
        method: 'POST',
        ...(file ? { body: file, headers: { 'Content-Type': 'application/json' } } : {}),
      })
      const result = await response.json()
      if (!response.ok || result.success !== true) {
        // Failed preview/save must not clear a previously verified Saved draft (rollback keeps it).
        setImportErrors(result.errors ?? ['Theme draft could not be verified.'])
        if (previousConfirmed && previousPreview) {
          setWizard((prev) => ({ ...prev, customizeConfirmed: true }))
          setSavedPreview(previousPreview)
        }
      } else if (action === 'preview' && file) {
        setImportPreview({ file, revision: result.revision, changes: result.changes })
      } else if (action === 'save') {
        setImportPreview(null)
        // Refresh preview from read-back; stay on Step 1 (no auto-advance).
        const check = await fetchCustomizeDraftComplete(created.id)
        if (check.complete && check.preview) {
          applyDraftCheck(check)
        } else {
          setWizard((prev) => ({ ...prev, customizeConfirmed: true }))
        }
      }
    } catch {
      setImportErrors(['Unable to verify the theme draft.'])
      if (previousConfirmed && previousPreview) {
        setWizard((prev) => ({ ...prev, customizeConfirmed: true }))
        setSavedPreview(previousPreview)
      }
    } finally {
      importInFlight.current = false
      setImportAction(null)
    }
  }

  const handleTemplateJsonImport = async (file: File) => {
    if (!created || templateImportBusy || importInFlight.current) return
    // Lock destination theme to the wizard theme at the moment import starts.
    const destinationThemeId = created.id
    templateImportReset.current?.()
    setTemplateImportErrors([])

    if (file.size > MAX_TEMPLATE_IMPORT_BYTES) {
      setTemplateImportErrors(['Template JSON must be 512 KB or smaller.'])
      return
    }
    if (builderMode === 'single' && !isVersionableTemplateContext(builderTemplate)) {
      setTemplateImportErrors(['Chọn Header, Home, Single Post, Page, Category hoặc Footer để nhập phiên bản.'])
      return
    }

    setTemplateImportBusy(true)
    try {
      const previewQuery = new URLSearchParams({
        themeId: destinationThemeId,
        action: 'preview',
      })
      if (builderMode === 'single') {
        previewQuery.set('template', builderTemplate)
      }
      const previewRes = await fetch(`/api/theme-builder/import?${previewQuery}`, {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': 'application/json' },
      })
      const preview = await previewRes.json()
      if (!previewRes.ok || !preview.success) {
        setTemplateImportErrors(preview.errors ?? ['Import preview failed.'])
        return
      }

      const saveQuery = new URLSearchParams({
        themeId: destinationThemeId,
        action: 'save',
        revision: preview.revision,
      })
      const lockedTemplate = preview.preview?.destination?.template as string | undefined
      if (builderMode === 'single') {
        saveQuery.set('template', builderTemplate)
      } else if (lockedTemplate) {
        saveQuery.set('template', lockedTemplate)
      }
      const saveRes = await fetch(`/api/theme-builder/import?${saveQuery}`, {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': 'application/json' },
      })
      const saved = await saveRes.json()
      if (!saveRes.ok || !saved.success) {
        setTemplateImportErrors(saved.errors ?? ['Import save failed.'])
        return
      }

      const versionId = (saved.templateVersion || saved.homeVersion)?.id as string | undefined
      const template = (saved.preview?.destination?.template
        || lockedTemplate
        || (builderMode === 'single' ? builderTemplate : undefined)) as TemplateContext | undefined
      if (!versionId || !template) {
        setTemplateImportErrors(['Import saved but the new version id was missing from the response.'])
        return
      }
      window.open(
        themeBuilderHref(destinationThemeId, {
          template,
          templateVersion: versionId,
        }),
        '_blank',
        'noopener,noreferrer',
      )
    } catch {
      setTemplateImportErrors(['Unable to import Template JSON.'])
    } finally {
      setTemplateImportBusy(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/themes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, websiteType }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to create theme.')
        return
      }
      const theme = {
        ...(data.theme as CreatedThemeSummary),
        websiteType: normalizeWebsiteType(
          (data.theme as CreatedThemeSummary)?.websiteType ?? websiteType,
        ),
      }
      setCreated(theme)
      setWizard(loadWizard(theme.id))
      setSavedPreview(null)
      setDraftProbe('loading')
      hydratedThemeRef.current = null
      setActiveStep(1)
      onCreated(theme)
    } catch {
      setError('Network error creating theme.')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (kind: 'customize' | 'builder') => {
    if (!created) return
    const resolvedType = normalizeWebsiteType(created.websiteType)
    const text =
      kind === 'customize'
        ? buildThemeCustomizePrompt({
            themeId: created.id,
            themeName: created.label,
            websiteType: resolvedType,
            styleDescription: wizard.styleDescription,
          })
        : buildThemeBuilderPrompt({
            themeId: created.id,
            themeName: created.label,
            websiteType: resolvedType,
            websiteRequirements: builderMode === 'full'
              ? wizard.websiteRequirements
              : wizard.templateRequirements[requirementsKey],
          }, builderMode === 'full'
            ? { mode: 'full' }
            : { mode: 'single', template: builderTemplate, loopItemId: selectedLoopItem?.id })
    await copyText(text)
    setCopyFeedback(kind === 'customize' ? 'Step 1 prompt copied' : 'Step 2 prompt copied')
    // Copying must NOT mark the step complete.
  }

  const showSavedSummary = activeStep === 1
    && draftProbe !== 'loading'
    && importAction !== 'hydrate'
    && wizard.customizeConfirmed
    && Boolean(savedPreview)
  const savedStackStyle = showSavedSummary ? { flex: 1, minHeight: 0 } : undefined

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <Plus size={18} />
          <Text fw={700}>{existingTheme ? 'Configure Theme' : 'Create Theme'}</Text>
        </Group>
      }
      size="lg"
      centered
      styles={showSavedSummary ? {
        content: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        header: { flexShrink: 0 },
        body: { display: 'flex', flexDirection: 'column', minHeight: 0 },
      } : undefined}
    >
      <Stack gap="md" style={savedStackStyle}>
        {!created ? (
          <>
            <Text size="sm" c="dimmed">
              Create a new inactive theme identity, then configure Theme Customize and Theme Builder
              in two independent steps.
            </Text>
            <TextInput
              label="Theme Name"
              description={previewId ? `Theme ID: ${previewId}` : 'Required. Theme ID is generated from this name and stays immutable.'}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              data-testid="create-theme-name"
            />
            <Radio.Group
              label="Website Type"
              description="Guides Customize/Builder prompts only. Does not change Theme ID or Theme Engine."
              value={websiteType}
              onChange={(value) => setWebsiteType(normalizeWebsiteType(value))}
              data-testid="create-theme-website-type"
            >
              <Stack gap="xs" mt="xs">
                {WEBSITE_TYPE_OPTIONS.map((option) => (
                  <Radio
                    key={option.value}
                    value={option.value}
                    label={`${option.label} — ${option.purpose}`}
                  />
                ))}
              </Stack>
            </Radio.Group>
            <Textarea
              label="Description (optional)"
              minRows={2}
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
            {error && (
              <Alert color="red" data-testid="create-theme-error">
                {error}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="teal"
                loading={creating}
                disabled={!name.trim()}
                onClick={handleCreate}
                data-testid="create-theme-submit"
              >
                Create Theme
              </Button>
            </Group>
          </>
        ) : (
          <>
            {showSavedSummary ? (
              <Group justify="space-between" align="flex-start" gap="xs" style={{ flexShrink: 0 }}>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Title order={4} lineClamp={1}>{created.label}</Title>
                  <Text size="xs" c="dimmed" truncate>Theme ID: {created.id}</Text>
                </Stack>
                <Group gap="xs">
                  <Badge color="teal" variant="light" data-testid="customize-draft-saved-status">
                    Saved
                  </Badge>
                  {savedPreview?.revision != null && (
                    <Text size="xs" c="dimmed" data-testid="customize-draft-revision">
                      Draft r{savedPreview.revision}
                    </Text>
                  )}
                </Group>
              </Group>
            ) : (
              <Group gap="sm">
                <Title order={4}>{created.label}</Title>
                <Badge variant="light">ID: {created.id}</Badge>
                <Badge variant="outline">
                  {websiteTypeLabel(normalizeWebsiteType(created.websiteType))}
                </Badge>
                <Badge color="gray" variant="outline">
                  Inactive
                </Badge>
              </Group>
            )}
            <Stepper active={activeStep - 1} onStepClick={(step) => {
              if (!importInFlight.current && step === 0) setActiveStep(1)
            }} size="sm" style={showSavedSummary ? { flexShrink: 0 } : undefined}>
              <Stepper.Step label="Theme Customize" description="Design tokens" />
              <Stepper.Step label="Theme Builder" description="Page templates" allowStepSelect={false} />
            </Stepper>

            {activeStep === 1 && (
              <Stack gap="sm" style={savedStackStyle} data-testid="create-theme-step-customize">
                {draftProbe === 'loading' || importAction === 'hydrate' ? (
                  <Alert data-testid="customize-draft-loading">
                    Checking saved Theme Customize draft…
                  </Alert>
                ) : wizard.customizeConfirmed && savedPreview ? (
                  <Stack gap="sm" style={savedStackStyle} data-testid="customize-saved-preview">
                    <Stack gap="md" pb="xs" style={{ overflow: 'auto', minHeight: 0 }}>
                      <SavedThemeTokens preview={savedPreview} />
                      {importErrors.length > 0 && (
                        <Alert color="red" title="Theme draft could not be verified">
                          {importErrors.map((message, index) => <Text size="sm" key={index}>{message}</Text>)}
                        </Alert>
                      )}
                      {importPreview && (
                        <Stack gap="xs">
                          <Text fw={600}>Preview for {created.id}</Text>
                          {importPreview.changes.length ? (
                            <Table>
                              <Table.Thead>
                                <Table.Tr><Table.Th>Token</Table.Th><Table.Th>Current</Table.Th><Table.Th>Proposed</Table.Th></Table.Tr>
                                </Table.Thead>
                              <Table.Tbody>
                                {importPreview.changes.map(({ field, before, after }) => (
                                  <Table.Tr key={field}><Table.Td>{field}</Table.Td><Table.Td>{before ?? '—'}</Table.Td><Table.Td>{after}</Table.Td></Table.Tr>
                                ))}
                                </Table.Tbody>
                              </Table>
                          ) : <Text size="sm">The file matches the current token values.</Text>}
                          <Group justify="flex-end">
                            <Button variant="default" onClick={() => setImportPreview(null)}>Cancel import</Button>
                            <Button
                              loading={importAction === 'save'}
                              onClick={() => void handleImport('save', importPreview.file)}
                            >
                              Confirm and save draft
                            </Button>
                          </Group>
                        </Stack>
                      )}
                      {importAction === 'save' && <Alert>Saving and verifying draft…</Alert>}
                    </Stack>

                    <Stack gap="xs" style={{ flexShrink: 0 }}>
                      <Divider />
                      <Group gap="xs">
                        <Button
                          component="a"
                          href={themeCustomizerHref(created.id)}
                          target="_blank"
                          rel="noreferrer"
                          variant="subtle"
                          size="compact-sm"
                          leftSection={<Palette size={14} />}
                          rightSection={<ExternalLink size={14} />}
                          data-testid="open-theme-customizer"
                        >
                          Open Theme Customizer
                        </Button>
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          leftSection={<RefreshCw size={14} />}
                          loading={importAction === 'check-draft'}
                          disabled={importAction !== null || Boolean(importPreview)}
                          onClick={() => void handleImport('check-draft')}
                          data-testid="recheck-customize-draft"
                        >
                          Re-check saved draft
                        </Button>
                      </Group>
                      <Group justify="flex-end" gap="sm">
                        <FileButton
                          accept=".json,application/json"
                          resetRef={resetFile}
                          onChange={(file) => { if (file) void handleImport('preview', file) }}
                        >
                          {(props) => (
                            <Button
                              {...props}
                              variant="light"
                              leftSection={<Upload size={14} />}
                              loading={importAction === 'preview'}
                              disabled={importAction !== null}
                              data-testid="import-theme-json"
                            >
                              Import new theme.json
                            </Button>
                          )}
                        </FileButton>
                        <Button
                          onClick={() => setActiveStep(2)}
                          disabled={importAction !== null || Boolean(importPreview)}
                          data-testid="goto-builder-step"
                        >
                          Continue to Theme Builder
                        </Button>
                      </Group>
                    </Stack>
                  </Stack>
                ) : (
                  <>
                    <Text size="sm">
                      Configure the theme design system (colors, fonts, typography). Theme Customize is the
                      source of truth for tokens.
                    </Text>
                    <Textarea
                      label="Basic style description"
                      placeholder="Modern corporate technology website. Navy and white palette. Professional typography. Clean and spacious layout."
                      minRows={4}
                      value={wizard.styleDescription}
                      onChange={(event) => {
                        const value = event.currentTarget.value
                        setWizard((prev) => ({ ...prev, styleDescription: value }))
                      }}
                    />
                    <Group grow>
                      <Button
                        component="a"
                        href={themeCustomizerHref(created.id)}
                        target="_blank"
                        rel="noreferrer"
                        leftSection={<Palette size={14} />}
                        rightSection={<ExternalLink size={14} />}
                        data-testid="open-theme-customizer"
                      >
                        Open Theme Customizer
                      </Button>
                      <Button
                        variant="light"
                        leftSection={<Copy size={14} />}
                        onClick={() => handleCopy('customize')}
                        data-testid="copy-customize-prompt"
                      >
                        Copy AI Prompt
                      </Button>
                      <FileButton
                        accept=".json,application/json"
                        resetRef={resetFile}
                        onChange={(file) => { if (file) void handleImport('preview', file) }}
                      >
                        {(props) => (
                          <Button {...props} variant="light" leftSection={<Upload size={14} />}
                            loading={importAction === 'preview'} disabled={importAction !== null}
                            data-testid="import-theme-json">
                            Import theme.json
                          </Button>
                        )}
                      </FileButton>
                    </Group>
                    {importErrors.length > 0 && (
                      <Alert color="red" title="Theme draft could not be verified">
                        {importErrors.map((message, index) => <Text size="sm" key={index}>{message}</Text>)}
                      </Alert>
                    )}
                    {importPreview && (
                      <Stack gap="xs">
                        <Text fw={600}>Preview for {created.id}</Text>
                        {importPreview.changes.length ? (
                          <ScrollArea.Autosize mah="40vh">
                            <Table>
                              <Table.Thead>
                                <Table.Tr><Table.Th>Token</Table.Th><Table.Th>Current</Table.Th><Table.Th>Proposed</Table.Th></Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {importPreview.changes.map(({ field, before, after }) => (
                                  <Table.Tr key={field}><Table.Td>{field}</Table.Td><Table.Td>{before ?? '—'}</Table.Td><Table.Td>{after}</Table.Td></Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </ScrollArea.Autosize>
                        ) : <Text size="sm">The file matches the current token values.</Text>}
                        <Group justify="flex-end">
                          <Button variant="default" onClick={() => setImportPreview(null)}>Cancel import</Button>
                          <Button
                            loading={importAction === 'save'}
                            onClick={() => void handleImport('save', importPreview.file)}
                          >
                            Confirm and save draft
                          </Button>
                        </Group>
                      </Stack>
                    )}
                    {importAction === 'save' && <Alert>Saving and verifying draft…</Alert>}
                    <Box>
                      <Button variant="default" loading={importAction === 'check-draft'}
                        disabled={importAction !== null || Boolean(importPreview)}
                        onClick={() => void handleImport('check-draft')}
                        data-testid="confirm-customize-step">
                        Check manually saved draft
                      </Button>
                    </Box>
                    <Group justify="flex-end">
                      <Button
                        onClick={() => setActiveStep(2)}
                        disabled={!wizard.customizeConfirmed || importAction !== null || Boolean(importPreview)}
                        data-testid="goto-builder-step"
                      >
                        Continue to Theme Builder
                      </Button>
                    </Group>
                  </>
                )}
              </Stack>
            )}

            {activeStep === 2 && (
              <Stack gap="sm" data-testid="create-theme-step-builder">
                <Radio.Group label="Generation mode" value={builderMode}
                  onChange={(mode) => setBuilderMode(mode === 'full' ? 'full' : 'single')}>
                  <Group mt="xs">
                    <Radio value="single" label="Single Template" />
                    <Radio value="full" label="Full Theme" />
                  </Group>
                </Radio.Group>
                {builderMode === 'single' && (
                  <Select
                    label="Template type"
                    value={builderTemplate}
                    allowDeselect={false}
                    data={THEME_BUILDER_TEMPLATE_OPTIONS.filter(({ badge }) => !badge)}
                    onChange={(value) => {
                      const option = THEME_BUILDER_TEMPLATE_OPTIONS.find(({ value: key, badge }) => key === value && !badge)
                      if (option) setBuilderTemplate(option.value)
                    }}
                  />
                )}
                {loopSelection && (
                  <Select
                    label="Existing Loop Item template"
                    placeholder={loopItems ? 'Select a Loop Item' : 'Loading Loop Items…'}
                    data={(loopItems?.items ?? []).map(({ id, name }) => ({ value: id, label: name }))}
                    value={loopItemId}
                    onChange={setLoopItemId}
                    disabled={!loopItems?.items.length}
                    error={loopItems?.error}
                    description={loopItems && !loopItems.error && !loopItems.items.length ? 'No saved Loop Item templates.' : undefined}
                  />
                )}
                <Textarea
                  label={builderMode === 'full' ? 'Website requirements' : 'Template requirements'}
                  minRows={4}
                  value={builderMode === 'full' ? wizard.websiteRequirements : wizard.templateRequirements[requirementsKey] ?? ''}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    setWizard((prev) => builderMode === 'full'
                      ? { ...prev, websiteRequirements: value }
                      : { ...prev, templateRequirements: { ...prev.templateRequirements, [requirementsKey]: value } })
                  }}
                />
                <Group grow>
                  {canOpenBuilder && <Button
                    component="a"
                    href={themeBuilderHref(created.id, builderMode === 'single' ? builderTemplate : undefined, selectedLoopItem?.id)}
                    target="_blank"
                    rel="noreferrer"
                    leftSection={<Layers size={14} />}
                    rightSection={<ExternalLink size={14} />}
                    data-testid="open-theme-builder"
                  >
                    {builderMode === 'full' ? 'Open Theme Builder' : 'Open selected template'}
                  </Button>}
                  <Button
                    variant="light"
                    leftSection={<Copy size={14} />}
                    disabled={!canOpenBuilder}
                    onClick={() => handleCopy('builder')}
                    data-testid="copy-builder-prompt"
                  >
                    Copy AI Prompt
                  </Button>
                  <FileButton
                    accept=".json,application/json"
                    resetRef={templateImportReset}
                    onChange={(file) => { if (file) void handleTemplateJsonImport(file) }}
                  >
                    {(props) => (
                      <Button
                        {...props}
                        variant="light"
                        leftSection={<Upload size={14} />}
                        loading={templateImportBusy}
                        disabled={!canImportTemplateJson || templateImportBusy}
                        data-testid="import-template-json"
                      >
                        Nhập Template JSON
                      </Button>
                    )}
                  </FileButton>
                </Group>
                {builderMode === 'full' && (
                  <Text size="sm" c="dimmed">
                    Nhập từng template: mỗi file chứa đúng một loại. Loại template lấy từ file; theme đích
                    là theme của wizard này (không dùng Active theme). Sau khi lưu thành công sẽ mở đúng
                    phiên bản mới trong Builder.
                  </Text>
                )}
                {builderMode === 'single' && !isVersionableTemplateContext(builderTemplate) && (
                  <Text size="sm" c="dimmed">
                    Loop Item dùng ID riêng; mở template đã chọn để chỉnh trong Builder.
                  </Text>
                )}
                {templateImportErrors.length > 0 && (
                  <Alert color="red" title="Không nhập được Template JSON">
                    {templateImportErrors.map((message, index) => (
                      <Text size="sm" key={index}>{message}</Text>
                    ))}
                  </Alert>
                )}
                <Group justify="space-between">
                  <Button variant="default" onClick={() => setActiveStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleClose} data-testid="finish-create-theme">
                    Done
                  </Button>
                </Group>
              </Stack>
            )}

            {copyFeedback && (
              <Alert color="teal" onClose={() => setCopyFeedback(null)} withCloseButton
                style={showSavedSummary ? { flexShrink: 0 } : undefined}>
                {copyFeedback}.
              </Alert>
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}
