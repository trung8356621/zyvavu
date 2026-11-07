'use client'
import React, { useState } from 'react'
import { Alert, Button, Group, Modal, Stack, TextInput, Textarea } from '@mantine/core'
import { createUsePuck } from '@puckeditor/core'
import {
  canSaveWidgetType,
  serializeSelectedPattern,
  validatePatternJSON,
  type PatternJSON,
} from '@/lib/theme-engine/patterns/json'

function widgetLibraryCategory(type: string) {
  if (type === 'Section') return 'sections'
  if (type === 'Columns') return 'layout'
  if (['Heading', 'Text', 'TextBlock'].includes(type)) return 'text'
  if (type === 'Image') return 'images'
  if (type === 'Button') return 'buttons'
  return 'general'
}
import { useMyPatterns } from './useMyPatterns'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import type { TemplateContext } from '@/lib/theme-engine/types'

const usePuck = createUsePuck()

const CATEGORY_LABELS: Record<string, string> = {
  sections: 'Sections',
  layout: 'Layout',
  text: 'Text',
  images: 'Images',
  buttons: 'Buttons',
  general: 'Widgets',
  dynamic: 'Nội dung động',
}

export function canSaveSelectedAsPattern(type: string | undefined): boolean {
  return !!type && canSaveWidgetType(type)
}

export function SaveAsPatternDialog({
  opened,
  onClose,
  context,
  beforeOperation,
  onSaved,
}: {
  opened: boolean
  onClose: () => void
  context?: string
  beforeOperation: () => boolean
  onSaved?: () => void
}) {
  const config = usePuck((state) => state.config)
  const data = usePuck((state) => state.appState.data)
  const selected = usePuck((state) => state.selectedItem)
  const my = useMyPatterns('', opened)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [record, setRecord] = useState<PatternJSON | null>(null)

  React.useEffect(() => {
    if (!opened) {
      setRecord(null)
      setMessage(null)
      setBusy(false)
      return
    }
    try {
      if (!selected || !canSaveSelectedAsPattern(selected.type))
        throw new Error('The selected widget cannot be saved as a pattern.')
      if (!beforeOperation()) throw new Error('Apply or cancel the active style draft first.')
      setRecord(
        serializeSelectedPattern(data, selected.props.id, {
          id: `user-${crypto.randomUUID()}`,
          name: `${config.components[selected.type]?.label || 'Widget'} pattern`,
          description: '',
          category: CATEGORY_LABELS[widgetLibraryCategory(selected.type)] || 'Widgets',
          ...(context ? { context: context as TemplateContext } : {}),
        }),
      )
      setMessage(null)
    } catch (error) {
      setRecord(null)
      setMessage((error as Error).message)
    }
  }, [opened, selected, data, config, context, beforeOperation])

  const save = async () => {
    if (!record || busy) return
    setBusy(true)
    setMessage(null)
    try {
      validatePatternJSON(record)
      await my.save(record)
      onSaved?.()
      onClose()
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Save as Pattern"
      zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
    >
      <Stack>
        {message && (
          <Alert color="red" role="alert">
            {message}
          </Alert>
        )}
        {record && (
          <>
            <TextInput
              label="Pattern name"
              required
              maxLength={120}
              value={record.name}
              onChange={(event) =>
                setRecord({ ...record, name: event.currentTarget.value })
              }
            />
            <TextInput
              label="Category"
              maxLength={80}
              value={record.category}
              onChange={(event) =>
                setRecord({ ...record, category: event.currentTarget.value })
              }
            />
            <Textarea
              label="Description"
              maxLength={1000}
              value={record.description}
              onChange={(event) =>
                setRecord({ ...record, description: event.currentTarget.value })
              }
            />
          </>
        )}
        <Group justify="flex-end">
          <Button variant="default" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!record?.name.trim()}
            onClick={() => {
              void save()
            }}
          >
            Save pattern
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
