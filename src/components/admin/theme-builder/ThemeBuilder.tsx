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
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, Check, Layers, Lock, Save } from 'lucide-react'

import { PuckHost } from '@/components/builder/core/PuckHost'
import type { BuilderDocument } from '@/components/builder/core/types'
import type { TemplateContext, ThemeTemplateDocument } from '@/lib/theme-engine/types'
import { getTemplatePolicy } from '@/lib/theme-engine/policy'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import { getEditorConfigForContext } from '@/lib/theme-engine/widget-registry-editor'
import { generateThemeCss } from '@/lib/theme-engine/styles'

export type ThemeBuilderProps = {
  initialTemplates: Record<TemplateContext, ThemeTemplateDocument>
  initialContext?: TemplateContext
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
  initialTemplates,
  initialContext = 'single',
}: ThemeBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateContext>(initialContext)
  const [templates, setTemplates] = useState<Record<TemplateContext, ThemeTemplateDocument>>(initialTemplates)
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
    return getEditorConfigForContext(selectedTemplate)
  }, [selectedTemplate])

  const themeCss = useMemo(() => {
    return generateThemeCss()
  }, [])

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
              href="/admin"
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
              Admin
            </Button>
            <Box>
              <Group gap="xs">
                <Title order={3} size="h4" style={{ margin: 0, fontWeight: 700, color: 'var(--zyvavu-primary, #0e6b66)' }}>
                  Theme Builder
                </Title>
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
          document={activeDoc as unknown as BuilderDocument}
          onSave={handleSave}
          onChange={handleDocChange}
          isSaving={isSaving}
          hideTopBar={true}
          height="100%"
        />
      </Box>
    </Box>
  )
}
