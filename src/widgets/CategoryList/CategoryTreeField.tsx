'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ActionIcon,
  Checkbox,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  fetchCategoriesForEditor,
  type CategoryNode,
} from '@/lib/taxonomy/category-tree'

export function CategoryTreeField({
  value,
  onChange,
  readOnly,
}: {
  value?: Array<string | number>
  onChange: (next: Array<string | number>) => void
  readOnly?: boolean
}) {
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const selected = useMemo(
    () => new Set((value || []).map((id) => Number(id)).filter(Number.isFinite)),
    [value],
  )

  useEffect(() => {
    let cancelled = false
    fetchCategoriesForEditor()
      .then((nodes) => {
        if (cancelled) return
        setTree(nodes)
        // Expand roots with children by default for discoverability.
        const next = new Set<number>()
        nodes.forEach((n) => {
          if (n.children.length) next.add(n.id)
        })
        setExpanded(next)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleExpand = (id: number, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelect = (id: number, checked: boolean) => {
    if (readOnly) return
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onChange([...next])
  }

  const renderNode = (node: CategoryNode, depth: number) => {
    const hasChildren = node.children.length > 0
    const isOpen = expanded.has(node.id)
    return (
      <Stack key={node.id} gap={2}>
        <Group gap={6} wrap="nowrap" style={{ paddingInlineStart: `min(${depth * 14}px, 35%)` }}>
          {hasChildren ? (
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label={isOpen ? 'Collapse' : 'Expand'}
              onClick={(e) => toggleExpand(node.id, e)}
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </ActionIcon>
          ) : (
            <span style={{ width: 28 }} />
          )}
          <Checkbox
            size="sm"
            checked={selected.has(node.id)}
            disabled={readOnly}
            onChange={(e) => toggleSelect(node.id, e.currentTarget.checked)}
            label={node.title}
            styles={{ root: { minWidth: 0 }, label: { overflowWrap: 'anywhere' } }}
          />
        </Group>
        {hasChildren && isOpen
          ? node.children.map((child) => renderNode(child, depth + 1))
          : null}
      </Stack>
    )
  }

  if (loading) {
    return (
      <Group gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading categories…
        </Text>
      </Group>
    )
  }

  if (!tree.length) {
    return (
      <Text size="sm" c="dimmed">
        No categories found.
      </Text>
    )
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          Categories
        </Text>
        {!readOnly && selected.size > 0 ? (
          <UnstyledButton onClick={() => onChange([])}>
            <Text size="xs" c="dimmed">
              Clear selection
            </Text>
          </UnstyledButton>
        ) : null}
      </Group>
      <Text size="xs" c="dimmed">
        Checkbox selects a category. Chevron expands the settings tree only.
      </Text>
      <ScrollArea.Autosize mah="min(20rem, 42dvh)" type="auto" scrollbars="y" offsetScrollbars>
        <Stack gap={4}>{tree.map((node) => renderNode(node, 0))}</Stack>
      </ScrollArea.Autosize>
    </Stack>
  )
}
