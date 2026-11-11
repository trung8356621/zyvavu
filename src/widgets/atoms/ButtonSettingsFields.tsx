'use client'

import React, { useEffect } from 'react'
import type { CustomField } from '@puckeditor/core'
import {
  ActionIcon,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import { IconPickerField } from '@/components/admin/icons/IconPicker'
import {
  buttonLabelEditorContent,
  serializeButtonLabelFromEditor,
} from '@/components/builder/inline-edit/content-model'
import { buttonLabelExtensions } from '@/components/builder/inline-edit/extensions'
import type { IconRef } from '@/lib/icons'

function FormatToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label}>
      <ActionIcon
        size="sm"
        variant={active ? 'filled' : 'default'}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}

function ButtonLabelEditor({
  value,
  onChange,
  readOnly,
}: {
  value?: string
  onChange: (next: string) => void
  readOnly?: boolean
}) {
  const editor = useEditor({
    extensions: buttonLabelExtensions(),
    content: buttonLabelEditorContent(value),
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap zyvavu-button-label-tiptap',
        'aria-label': 'Button label',
        style:
          'min-height: 2.5rem; padding: 6px 8px; border: 1px solid var(--mantine-color-default-border); border-radius: var(--mantine-radius-sm); outline: none;',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(serializeButtonLabelFromEditor(current.getHTML()))
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return
    const next = buttonLabelEditorContent(value)
    if (editor.getHTML() === next) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return <Text size="sm" c="dimmed">Loading editor…</Text>
  }

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Label
      </Text>
      {!readOnly ? (
        <Group gap={4}>
          <FormatToggle
            label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={14} />
          </FormatToggle>
          <FormatToggle
            label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={14} />
          </FormatToggle>
          <FormatToggle
            label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon size={14} />
          </FormatToggle>
        </Group>
      ) : null}
      <EditorContent editor={editor} />
      <Text size="xs" c="dimmed">
        Bold, italic and underline only. The button owns the destination URL.
      </Text>
    </Stack>
  )
}

export const buttonLabelField: CustomField<string> = {
  type: 'custom',
  label: 'Label',
  render: ({ value, onChange, readOnly }) => (
    <ButtonLabelEditor value={value} onChange={onChange} readOnly={readOnly} />
  ),
}

export type ButtonIconSettings = {
  icon?: IconRef | null
  iconPosition?: 'left' | 'right'
  iconSize?: number
  iconGap?: number
}

export function ButtonIconSettingsFields({
  value,
  onChange,
  readOnly,
}: {
  value: ButtonIconSettings
  onChange: (patch: Partial<ButtonIconSettings>) => void
  readOnly?: boolean
}) {
  return (
    <Stack gap="sm">
      <IconPickerField
        label="Button icon"
        value={value.icon || null}
        readOnly={readOnly}
        onChange={(icon) => onChange({ icon })}
      />
      {value.icon ? (
        <>
          <Select
            label="Icon position"
            size="sm"
            disabled={readOnly}
            value={value.iconPosition || 'left'}
            data={[
              { label: 'Left of label', value: 'left' },
              { label: 'Right of label', value: 'right' },
            ]}
            onChange={(v) => onChange({ iconPosition: (v as 'left' | 'right') || 'left' })}
          />
          <NumberInput
            label="Icon size (px)"
            size="sm"
            min={10}
            max={64}
            disabled={readOnly}
            value={typeof value.iconSize === 'number' ? value.iconSize : 18}
            onChange={(v) => onChange({ iconSize: typeof v === 'number' ? v : 18 })}
          />
          <NumberInput
            label="Icon gap (px)"
            size="sm"
            min={0}
            max={48}
            disabled={readOnly}
            value={typeof value.iconGap === 'number' ? value.iconGap : 8}
            onChange={(v) => onChange({ iconGap: typeof v === 'number' ? v : 8 })}
          />
          <Text size="xs" c="dimmed">
            Icon color inherits the button text color.
          </Text>
        </>
      ) : null}
    </Stack>
  )
}
