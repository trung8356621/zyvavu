'use client'

import React from 'react'
import { Button, Checkbox, Stack, TextInput } from '@mantine/core'
import { SharedDraggableModal } from '@/components/admin/shared/SharedDraggableModal'
import { sanitizeHref } from './content-model'

export type InlineLinkDraft = {
  href: string
  newTab: boolean
  from: number
  to: number
}

export function InlineLinkModal({
  opened,
  draft,
  onChange,
  onApply,
  onClose,
}: {
  opened: boolean
  draft: InlineLinkDraft | null
  onChange: (next: InlineLinkDraft) => void
  onApply: (draft: InlineLinkDraft) => void
  onClose: () => void
}) {
  if (!draft) return null
  const safe = sanitizeHref(draft.href)
  const invalid = Boolean(draft.href.trim()) && !safe

  return (
    <SharedDraggableModal
      opened={opened}
      onClose={onClose}
      title="Link"
      width={360}
      closeOnClickOutside={false}
      closeOnEscape
      footer={
        <Button
          size="sm"
          disabled={invalid || !draft.href.trim()}
          onClick={() => {
            if (!safe) return
            onApply({ ...draft, href: safe })
          }}
        >
          Apply
        </Button>
      }
    >
      <Stack gap="sm" data-inline-link-modal="true">
        <TextInput
          label="URL"
          size="sm"
          placeholder="https://… or /path"
          value={draft.href}
          error={invalid ? 'Unsupported or unsafe URL' : undefined}
          onChange={(event) => onChange({ ...draft, href: event.currentTarget.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (safe) onApply({ ...draft, href: safe })
            }
          }}
        />
        <Checkbox
          label="Open in new tab"
          size="sm"
          checked={draft.newTab}
          onChange={(event) => onChange({ ...draft, newTab: event.currentTarget.checked })}
        />
      </Stack>
    </SharedDraggableModal>
  )
}
