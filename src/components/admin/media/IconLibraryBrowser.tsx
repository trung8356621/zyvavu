'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { Search, X } from 'lucide-react'
import {
  getBuiltInCategories,
  IconRenderer,
  searchBuiltInIcons,
  type IconCatalogEntry,
  type IconRef,
} from '@/lib/icons'

const PAGE_SIZE = 120

function iconMatches(entry: IconCatalogEntry, selected?: IconRef | null) {
  if (!selected) return false
  if (selected.source === 'custom') return entry.source === 'custom' && entry.name === selected.name
  if (selected.source === 'lucide') return entry.source !== 'custom' && entry.name === selected.name
  return false
}

function IconCell({
  entry,
  selected,
  onSelect,
  tabIndex,
  onKeyDown,
  cellRef,
}: {
  entry: IconCatalogEntry
  selected: boolean
  onSelect: () => void
  tabIndex: number
  onKeyDown: (event: React.KeyboardEvent) => void
  cellRef?: (el: HTMLButtonElement | null) => void
}) {
  return (
    <Tooltip label={entry.label || entry.name} withArrow openDelay={400}>
      <UnstyledButton
        ref={cellRef}
        tabIndex={tabIndex}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        aria-label={entry.label || entry.name}
        aria-pressed={selected}
        data-selected={selected || undefined}
        style={{
          width: 64,
          height: 64,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--mantine-radius-sm)',
          border: selected
            ? '2px solid var(--mantine-color-blue-6)'
            : '1px solid var(--mantine-color-default-border)',
          background: selected ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-body)',
          color: 'var(--mantine-color-text)',
        }}
      >
        <IconRenderer
          icon={{
            source: entry.source === 'custom' ? 'custom' : 'lucide',
            name: entry.name,
          }}
          size={36}
          strokeWidth={1.75}
          decorative
        />
      </UnstyledButton>
    </Tooltip>
  )
}

export function IconLibraryBrowser({
  value,
  onSelect,
}: {
  value?: IconRef | null
  onSelect: (icon: IconRef) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [focusIndex, setFocusIndex] = useState(0)
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])

  const categories = useMemo(() => getBuiltInCategories(), [])
  const matches = useMemo(() => searchBuiltInIcons(query, category), [query, category])
  const visible = matches.slice(0, visibleCount)

  const resetResults = () => {
    setVisibleCount(PAGE_SIZE)
    setFocusIndex(0)
  }
  const changeQuery = (value: string) => {
    setQuery(value)
    resetResults()
  }
  const changeCategory = (value: string | null) => {
    setCategory(value)
    resetResults()
  }

  const selectBuiltIn = useCallback((entry: IconCatalogEntry) => {
    onSelect({
      source: entry.source === 'custom' ? 'custom' : 'lucide',
      name: entry.name,
      recolorable: true,
    })
  }, [onSelect])

  const onGridKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent) => {
      const cols = 8
      let next = index
      if (event.key === 'ArrowRight') next = Math.min(visible.length - 1, index + 1)
      else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1)
      else if (event.key === 'ArrowDown') next = Math.min(visible.length - 1, index + cols)
      else if (event.key === 'ArrowUp') next = Math.max(0, index - cols)
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const entry = visible[index]
        if (entry) selectBuiltIn(entry)
        return
      } else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = visible.length - 1
      else return

      event.preventDefault()
      setFocusIndex(next)
      cellRefs.current[next]?.focus()
    },
    [selectBuiltIn, visible],
  )

  return (
    <Stack gap="sm">
      <TextInput
        label="Search icons"
        placeholder="Search Lucide and custom icons"
        leftSection={<Search size={14} />}
        rightSection={
          query ? (
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => changeQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </ActionIcon>
          ) : null
        }
        value={query}
        onChange={(e) => changeQuery(e.currentTarget.value)}
      />

      <ScrollArea type="hover" offsetScrollbars scrollbarSize={6} style={{ maxHeight: 40 }}>
        <Group gap={6} wrap="nowrap">
          <Badge
            size="sm"
            variant={!category ? 'filled' : 'light'}
            style={{ cursor: 'pointer' }}
            onClick={() => changeCategory(null)}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              size="sm"
              variant={category === cat ? 'filled' : 'light'}
              style={{ cursor: 'pointer', textTransform: 'capitalize' }}
              onClick={() => changeCategory(cat === category ? null : cat)}
            >
              {cat}
            </Badge>
          ))}
        </Group>
      </ScrollArea>

      {visible.length === 0 ? (
        <Text size="sm" c="dimmed">
          No icons match your search.
        </Text>
      ) : (
        <ScrollArea h={360} type="auto" offsetScrollbars>
          <Box
            role="listbox"
            aria-label="Built-in icon grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
              gap: 10,
              paddingBottom: 8,
            }}
          >
            {visible.map((entry, index) => (
              <IconCell
                key={`${entry.source || 'lucide'}:${entry.name}`}
                entry={entry}
                selected={iconMatches(entry, value)}
                onSelect={() => selectBuiltIn(entry)}
                tabIndex={index === focusIndex ? 0 : -1}
                onKeyDown={(event) => onGridKeyDown(index, event)}
                cellRef={(el) => {
                  cellRefs.current[index] = el
                }}
              />
            ))}
          </Box>
          {visibleCount < matches.length ? (
            <Button
              variant="subtle"
              size="xs"
              fullWidth
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              Show more ({matches.length - visibleCount} remaining)
            </Button>
          ) : null}
        </ScrollArea>
      )}
    </Stack>
  )
}
