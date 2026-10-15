'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Text,
  Title,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, Check, Save } from 'lucide-react'

import {
  type BuilderDocument,
  createDefaultMegaMenuDocument,
  deserializeBuilderDocument,
  extractNormalizedSourceLinks,
  megaMenuConfig,
  PuckHost,
  validateBuilderDocument,
} from '@/components/builder'

export type MegaMenuBuilderProps = {
  menuId: string | number
  menuName: string
  initialMegaLayout?: any
  existingMobileMenu?: any
}

export function MegaMenuBuilder({
  menuId,
  menuName,
  initialMegaLayout,
  existingMobileMenu,
}: MegaMenuBuilderProps) {
  const router = useRouter()

  const initialDoc = useMemo<BuilderDocument>(() => {
    if (initialMegaLayout) {
      try {
        return deserializeBuilderDocument(initialMegaLayout)
      } catch {
        return createDefaultMegaMenuDocument()
      }
    }
    return createDefaultMegaMenuDocument()
  }, [initialMegaLayout])

  const [megaLayout, setMegaLayout] = useState<BuilderDocument>(initialDoc)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const latestDocRef = useRef<BuilderDocument>(initialDoc)

  // Prevent accidental navigation when dirty
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

  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes in the Mega Menu Layout. Are you sure you want to leave without saving?',
      )
      if (!confirmLeave) return
    }
    router.push(`/admin/collections/menus/${menuId}`)
  }

  const handleSave = useCallback(
    async (customDoc?: BuilderDocument) => {
      const docToSave = customDoc || latestDocRef.current || megaLayout

      const validation = validateBuilderDocument(docToSave)
      if (!validation.valid) {
        setSaveError(`Layout validation failed: ${validation.errors.join('; ')}`)
        return
      }

      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      try {
        const extractedSourceLinks = extractNormalizedSourceLinks(docToSave)

        // CONTRACT: Update ONLY megaLayout and mobileMenu source snapshot.
        // Do NOT overwrite name, location, classic items, or page/post relationships.
        const patchBody: Record<string, any> = {
          megaLayout: docToSave,
          mobileMenu: {
            version: existingMobileMenu?.version || 1,
            items:
              existingMobileMenu?.items && existingMobileMenu.items.length > 0
                ? existingMobileMenu.items
                : extractedSourceLinks.map((sl) => ({
                    id: sl.id,
                    label: sl.label,
                    url: sl.url,
                    newTab: sl.newTab,
                    sourceLinkId: sl.id,
                  })),
            sourceSnapshot: extractedSourceLinks,
          },
        }

        const res = await fetch(`/api/menus/${menuId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(patchBody),
        })

        const json = await res.json().catch(() => ({}))

        if (!res.ok || (json.errors && json.errors.length > 0)) {
          const errorDetail =
            json.errors?.[0]?.message ||
            (Array.isArray(json.errors) && json.errors.map((e: any) => e.message).join('; ')) ||
            json.message ||
            `Failed to save Mega Layout (${res.status} ${res.statusText})`
          throw new Error(errorDetail)
        }

        setIsDirty(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err: any) {
        setSaveSuccess(false)
        setSaveError(err?.message || 'Error occurred while saving Mega Layout')
      } finally {
        setIsSaving(false)
      }
    },
    [existingMobileMenu, megaLayout, menuId],
  )

  return (
    <Box
      className="zyvavu-mega-builder-view-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '12px 16px',
        boxSizing: 'border-box',
        backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
        gap: '12px',
      }}
    >
      {/* Top Header with Single Primary Save Action */}
      <Paper
        p="sm"
        radius="md"
        withBorder
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          flexShrink: 0,
        }}
      >
        <Group gap="md">
          <Button
            variant="subtle"
            size="sm"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
            onClick={handleBack}
          >
            Back to Menu Edit
          </Button>

          <Group gap="xs">
            <Title order={3} size="h4" style={{ color: 'var(--zyvavu-text, #17201f)', margin: 0 }}>
              Mega Menu Builder: {menuName}
            </Title>
            <Text size="xs" c="dimmed">
              (ID: {menuId})
            </Text>
          </Group>

          {isDirty && (
            <Badge color="yellow" variant="light" size="sm">
              Unsaved changes
            </Badge>
          )}
        </Group>

        <Group gap="sm">
          {saveSuccess && (
            <Badge color="teal" variant="light" leftSection={<Check size={12} />}>
              Layout saved successfully
            </Badge>
          )}

          <Button
            size="sm"
            color="#0e6b66"
            leftSection={<Save size={16} />}
            loading={isSaving}
            onClick={() => handleSave()}
          >
            Save Mega Layout
          </Button>
        </Group>
      </Paper>

      {saveError && (
        <Alert
          icon={<AlertCircle size={16} />}
          title="Save Failed"
          color="red"
          withCloseButton
          onClose={() => setSaveError(null)}
          style={{ flexShrink: 0 }}
        >
          {saveError}
        </Alert>
      )}

      {/* Full-width Puck Visual Canvas */}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <PuckHost
          config={megaMenuConfig}
          document={megaLayout}
          hideTopBar={true}
          height="100%"
          isSaving={isSaving}
          onChange={(updated) => {
            latestDocRef.current = updated
            setMegaLayout(updated)
            setIsDirty(true)
          }}
          onSave={async (updated) => {
            latestDocRef.current = updated
            setMegaLayout(updated)
            await handleSave(updated)
          }}
        />
      </Box>
    </Box>
  )
}
