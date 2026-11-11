'use client'

import { sampleContactEntriesWithOrder, type ContactEntry } from '@/lib/site/contact'
import { ActionIcon, Checkbox, Group, Loader, Stack, Text } from '@mantine/core'
import { ChevronDown, ChevronUp } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

type EntryIdsFieldProps = {
  value?: string[]
  onChange: (next: string[]) => void
  siteEntries?: ContactEntry[]
}

function normalizeEntries(raw: unknown): ContactEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ContactEntry[] = []
  for (let index = 0; index < raw.length; index++) {
    const row = raw[index]
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const entryId = typeof record.entryId === 'string' ? record.entryId.trim() : ''
    const key = typeof record.key === 'string' ? record.key.trim() : ''
    const value = typeof record.value === 'string' ? record.value.trim() : ''
    if (!entryId || !key || !value) continue
    out.push({
      entryId,
      key,
      value,
      link: typeof record.link === 'string' ? record.link : null,
      semantics:
        record.semantics === 'phone' || record.semantics === 'email' ? record.semantics : null,
      order: typeof record.order === 'number' ? record.order : index,
    })
  }
  return out.sort((a, b) => a.order - b.order)
}

export function ContactEntryIdsField({ value = [], onChange, siteEntries }: EntryIdsFieldProps) {
  const [fallbackEntries, setEntries] = useState<ContactEntry[]>(sampleContactEntriesWithOrder())
  const entries = siteEntries ?? fallbackEntries
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (siteEntries) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/globals/settings?depth=0', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`Failed to load site settings (${response.status})`)
        const json = (await response.json()) as { contactEntries?: unknown }
        const next = normalizeEntries(json.contactEntries)
        if (!cancelled) {
          setEntries(next.length > 0 ? next : sampleContactEntriesWithOrder())
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load contact entries')
          setEntries(sampleContactEntriesWithOrder())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [siteEntries])

  const selectedSet = useMemo(() => new Set(value), [value])

  const orderedVisible = useMemo(() => {
    const byId = new Map(entries.map((entry) => [entry.entryId, entry]))
    const selected = value
      .map((id) => byId.get(id))
      .filter((entry): entry is ContactEntry => Boolean(entry))
    const remaining = entries.filter((entry) => !selectedSet.has(entry.entryId))
    return [...selected, ...remaining]
  }, [entries, selectedSet, value])

  const toggle = (entryId: string, checked: boolean) => {
    if (checked) {
      if (selectedSet.has(entryId)) return
      onChange([...value, entryId])
      return
    }
    onChange(value.filter((id) => id !== entryId))
  }

  const move = (entryId: string, direction: -1 | 1) => {
    const index = value.indexOf(entryId)
    if (index < 0) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= value.length) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange(next)
  }

  if (!siteEntries && loading) {
    return (
      <Group gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading site contacts…
        </Text>
      </Group>
    )
  }

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        Select and reorder entries. Values come from Site Settings; this widget stores IDs only.
      </Text>
      {error ? (
        <Text size="sm" c="orange">
          {error}. Showing sample entries for preview.
        </Text>
      ) : null}
      {orderedVisible.length === 0 ? (
        <Text size="sm" c="dimmed">
          No contact entries in Site Settings yet.
        </Text>
      ) : (
        orderedVisible.map((entry) => {
          const checked = selectedSet.has(entry.entryId)
          const selectedIndex = value.indexOf(entry.entryId)
          return (
            <Group key={entry.entryId} gap="xs" wrap="nowrap" align="flex-start">
              <Checkbox
                checked={checked}
                onChange={(event) => toggle(entry.entryId, event.currentTarget.checked)}
                label={
                  <Stack gap={0}>
                    <Text size="sm" fw={600}>
                      {entry.key}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {entry.value}
                    </Text>
                  </Stack>
                }
                styles={{ body: { alignItems: 'flex-start' }, label: { paddingLeft: 8 } }}
              />
              {checked ? (
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    aria-label={`Move ${entry.key} up`}
                    disabled={selectedIndex <= 0}
                    onClick={() => move(entry.entryId, -1)}
                  >
                    <ChevronUp size={14} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    aria-label={`Move ${entry.key} down`}
                    disabled={selectedIndex < 0 || selectedIndex >= value.length - 1}
                    onClick={() => move(entry.entryId, 1)}
                  >
                    <ChevronDown size={14} />
                  </ActionIcon>
                </Group>
              ) : null}
            </Group>
          )
        })
      )}
    </Stack>
  )
}
