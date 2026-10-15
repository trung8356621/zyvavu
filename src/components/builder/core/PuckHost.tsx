'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { Puck, type Config, type Data } from '@puckeditor/core'
import '@puckeditor/core/dist/index.css'
import { Alert, Box, Button, Group, LoadingOverlay, Text } from '@mantine/core'
import { Check, AlertCircle, Save } from 'lucide-react'

import { CURRENT_BUILDER_VERSION, validateBuilderDocument } from './document'
import type { BuilderDocument } from './types'

export type PuckHostProps = {
  config: Config
  document: BuilderDocument
  onSave: (doc: BuilderDocument) => Promise<void> | void
  onChange?: (doc: BuilderDocument) => void
  isSaving?: boolean
  isLoading?: boolean
  error?: string | null
  headerActions?: React.ReactNode
}

export function PuckHost({
  config,
  document,
  onSave,
  onChange,
  isSaving = false,
  isLoading = false,
  error = null,
  headerActions,
}: PuckHostProps) {
  const [localDoc, setLocalDoc] = useState<BuilderDocument>(document)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  // Sync when initial document changes externally
  React.useEffect(() => {
    setLocalDoc(document)
  }, [document])

  const puckData: Data = useMemo(() => {
    return {
      root: localDoc.root || { props: {} },
      content: localDoc.content || [],
      zones: localDoc.zones || {},
    }
  }, [localDoc])

  const handlePuckChange = useCallback(
    (data: Data) => {
      const updated: BuilderDocument = {
        version: localDoc.version || CURRENT_BUILDER_VERSION,
        root: data.root,
        content: data.content,
        zones: data.zones || {},
        metadata: localDoc.metadata,
      }
      setLocalDoc(updated)
      setSaveSuccess(false)
      if (onChange) {
        onChange(updated)
      }
    },
    [localDoc, onChange],
  )

  const handlePublish = useCallback(
    async (data: Data) => {
      const updated: BuilderDocument = {
        version: localDoc.version || CURRENT_BUILDER_VERSION,
        root: data.root,
        content: data.content,
        zones: data.zones || {},
        metadata: localDoc.metadata,
      }

      const validation = validateBuilderDocument(updated)
      if (!validation.valid) {
        setValidationError(`Schema validation failed: ${validation.errors.join('; ')}`)
        return
      }

      setValidationError(null)
      try {
        await onSave(updated)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err: any) {
        setValidationError(err?.message || 'Failed to save builder document')
      }
    },
    [localDoc, onSave],
  )

  return (
    <Box
      className="zyvavu-puck-host-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
        minHeight: '650px',
        width: '100%',
        position: 'relative',
        backgroundColor: 'var(--zyvavu-surface, #ffffff)',
        border: '1px solid var(--zyvavu-border, #dfe5e2)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <LoadingOverlay visible={isLoading || isSaving} overlayProps={{ blur: 1 }} />

      {/* Builder Top Bar */}
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--zyvavu-border, #dfe5e2)',
          backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
        }}
      >
        <Group gap="sm">
          <Text size="sm" fw={600} c="var(--zyvavu-text, #17201f)">
            Visual Layout Builder
          </Text>
          <Text size="xs" c="dimmed">
            (Puck Engine v{CURRENT_BUILDER_VERSION})
          </Text>
        </Group>

        <Group gap="sm">
          {headerActions}
          {saveSuccess && (
            <Group gap={4} style={{ color: '#0e6b66' }}>
              <Check size={14} />
              <Text size="xs" fw={500}>
                Saved
              </Text>
            </Group>
          )}
          <Button
            size="xs"
            color="#0e6b66"
            leftSection={<Save size={14} />}
            loading={isSaving}
            onClick={() => handlePublish(puckData)}
          >
            Save Layout
          </Button>
        </Group>
      </Box>

      {(error || validationError) && (
        <Alert
          icon={<AlertCircle size={16} />}
          title="Error"
          color="red"
          withCloseButton
          onClose={() => setValidationError(null)}
          m="xs"
        >
          {error || validationError}
        </Alert>
      )}

      {/* Visual Canvas Area */}
      <Box
        className="zyvavu-puck-viewport"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Puck
          config={config}
          data={puckData}
          onPublish={handlePublish}
          onChange={handlePuckChange}
        />
      </Box>
    </Box>
  )
}
