'use client'

import React from 'react'
import {
  Accordion,
  Button,
  Checkbox,
  Collapse,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { ChevronDown, Link2 } from 'lucide-react'
import { SharedDraggableModal } from '@/components/admin/shared/SharedDraggableModal'
import { MenuTargetSelector } from '@/components/admin/menus/MenuTargetSelector'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import {
  LINK_DESTINATIONS,
  LINK_DESTINATION_LABELS,
  LINK_DESTINATION_SUPPORT,
  LINK_REL_OPTIONS,
  canApplyLinkDraft,
  isDestinationEnabled,
  switchLinkDestination,
  type LinkDestination,
  type LinkEditorDraft,
  type LinkRelValue,
} from './link-editor-model'
import styles from './InlineContentEditor.module.css'

/**
 * Docked Link Editor V2 — accordion destinations (Wix-style), Style shell.
 */
export function InlineLinkEditor({
  opened,
  draft,
  onChange,
  onApply,
  onCancel,
}: {
  opened: boolean
  draft: LinkEditorDraft | null
  onChange: (next: LinkEditorDraft) => void
  onApply: (draft: LinkEditorDraft) => void
  onCancel: () => void
}) {
  const [seoOpen, setSeoOpen] = React.useState(false)

  React.useEffect(() => {
    if (!opened) setSeoOpen(false)
  }, [opened])

  if (!draft) return null

  const canApply = canApplyLinkDraft(draft)
  const showOpenMode = draft.destination === 'page' || draft.destination === 'web'
  const showSeo = showOpenMode && isDestinationEnabled(draft.destination)

  return (
    <SharedDraggableModal
      opened={opened}
      onClose={onCancel}
      title="Link"
      subtitle="Apply commits · Cancel discards"
      headerExtra={<Link2 size={16} color="var(--mantine-color-teal-7, #0e6b66)" />}
      width={360}
      mode="docked"
      draggable={false}
      showCloseButton
      closeOnClickOutside={false}
      closeOnEscape
      zIndex={ADMIN_OVERLAY_LAYERS.STYLE_MODAL}
      footer={
        <Group justify="flex-end" gap="xs" grow>
          <Button size="sm" variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canApply}
            onClick={() => {
              if (!canApply) return
              onApply(draft)
            }}
          >
            Apply
          </Button>
        </Group>
      }
    >
      <Stack gap="sm" data-inline-link-modal="true" className={styles.linkEditor}>
        <Accordion
          variant="contained"
          radius="sm"
          value={draft.destination}
          onChange={(value) => {
            if (!value) return
            onChange(switchLinkDestination(draft, value as LinkDestination))
            setSeoOpen(false)
          }}
          classNames={{
            item: styles.linkAccordionItem,
            control: styles.linkAccordionControl,
            label: styles.linkAccordionLabel,
            panel: styles.linkAccordionPanel,
            content: styles.linkAccordionContent,
          }}
        >
          {LINK_DESTINATIONS.map((destination) => {
            const support = LINK_DESTINATION_SUPPORT[destination]
            return (
              <Accordion.Item key={destination} value={destination}>
                <Accordion.Control>
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500}>
                      {LINK_DESTINATION_LABELS[destination]}
                    </Text>
                    {!support.enabled ? (
                      <Text size="xs" c="dimmed">
                        Soon
                      </Text>
                    ) : null}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  {!support.enabled ? (
                    <Text size="xs" c="dimmed">
                      {support.unavailableReason}
                    </Text>
                  ) : (
                    <DestinationFields
                      destination={destination}
                      draft={draft}
                      onChange={onChange}
                      seoOpen={seoOpen}
                      setSeoOpen={setSeoOpen}
                      showOpenMode={showOpenMode && destination === draft.destination}
                      showSeo={showSeo && destination === draft.destination}
                    />
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            )
          })}
        </Accordion>
      </Stack>
    </SharedDraggableModal>
  )
}

function DestinationFields({
  destination,
  draft,
  onChange,
  seoOpen,
  setSeoOpen,
  showOpenMode,
  showSeo,
}: {
  destination: LinkDestination
  draft: LinkEditorDraft
  onChange: (next: LinkEditorDraft) => void
  seoOpen: boolean
  setSeoOpen: (open: boolean) => void
  showOpenMode: boolean
  showSeo: boolean
}) {
  if (destination === 'none') {
    return (
      <Text size="xs" c="dimmed">
        Removes the link from the selection.
      </Text>
    )
  }

  if (destination === 'page') {
    return (
      <Stack gap="xs">
        <MenuTargetSelector
          type="page"
          value={draft.pageId}
          initialTitle={draft.pageTitle || undefined}
          initialPath={draft.pagePath || undefined}
          onSelect={(target) => {
            onChange({
              ...draft,
              pageId: target ? String(target.id) : null,
              pagePath: target?.canonicalPath || null,
              pageTitle: target?.title || null,
            })
          }}
        />
        {showOpenMode ? <OpenModeFields draft={draft} onChange={onChange} /> : null}
        {showSeo ? (
          <SeoFields draft={draft} onChange={onChange} open={seoOpen} setOpen={setSeoOpen} />
        ) : null}
      </Stack>
    )
  }

  if (destination === 'web') {
    return (
      <Stack gap="xs">
        <TextInput
          label="URL"
          size="sm"
          placeholder="https://…"
          value={draft.url || ''}
          onChange={(event) => onChange({ ...draft, url: event.currentTarget.value })}
        />
        {showOpenMode ? <OpenModeFields draft={draft} onChange={onChange} /> : null}
        {showSeo ? (
          <SeoFields draft={draft} onChange={onChange} open={seoOpen} setOpen={setSeoOpen} />
        ) : null}
      </Stack>
    )
  }

  if (destination === 'email') {
    return (
      <Stack gap="xs">
        <TextInput
          label="Email"
          size="sm"
          placeholder="name@example.com"
          value={draft.email || ''}
          onChange={(event) => onChange({ ...draft, email: event.currentTarget.value })}
        />
        <TextInput
          label="Subject"
          size="sm"
          placeholder="Optional"
          value={draft.emailSubject || ''}
          onChange={(event) => onChange({ ...draft, emailSubject: event.currentTarget.value })}
        />
      </Stack>
    )
  }

  if (destination === 'phone') {
    return (
      <TextInput
        label="Phone"
        size="sm"
        placeholder="+84…"
        value={draft.phone || ''}
        onChange={(event) => onChange({ ...draft, phone: event.currentTarget.value })}
      />
    )
  }

  return null
}

function OpenModeFields({
  draft,
  onChange,
}: {
  draft: LinkEditorDraft
  onChange: (next: LinkEditorDraft) => void
}) {
  return (
    <Radio.Group
      label="Open in"
      size="sm"
      value={draft.target}
      onChange={(value) =>
        onChange({ ...draft, target: value === '_blank' ? '_blank' : '_self' })
      }
    >
      <Group gap="md" mt={4}>
        <Radio value="_self" label="Current" size="sm" />
        <Radio value="_blank" label="New tab" size="sm" />
      </Group>
    </Radio.Group>
  )
}

function SeoFields({
  draft,
  onChange,
  open,
  setOpen,
}: {
  draft: LinkEditorDraft
  onChange: (next: LinkEditorDraft) => void
  open: boolean
  setOpen: (open: boolean) => void
}) {
  return (
    <Stack gap={4}>
      <Button
        variant="subtle"
        size="compact-xs"
        justify="space-between"
        rightSection={
          <ChevronDown
            size={12}
            style={{
              transform: open ? 'rotate(180deg)' : undefined,
              transition: 'transform 120ms',
            }}
          />
        }
        onClick={() => setOpen(!open)}
      >
        SEO rel
      </Button>
      <Collapse in={open}>
        <Stack gap={4}>
          {LINK_REL_OPTIONS.map((opt) => (
            <Checkbox
              key={opt}
              size="xs"
              label={opt}
              checked={draft.rel.includes(opt)}
              onChange={(event) => {
                const checked = event.currentTarget.checked
                const rel: LinkRelValue[] = checked
                  ? [...draft.rel, opt]
                  : draft.rel.filter((item) => item !== opt)
                onChange({ ...draft, rel })
              }}
            />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  )
}
