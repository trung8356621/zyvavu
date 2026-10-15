'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  CornerUpLeft,
  ExternalLink,
  GripVertical,
  Laptop,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react'

import {
  type DisplayRow,
  flattenTreeForDisplay,
  generateNodeId,
  indentNodeInTree,
  type MenuTreeNode,
  moveNodeInLevel,
  outdentNodeInTree,
  reorderTreeDragDrop,
  updateNodeInTree,
  deleteNodeFromTree,
} from './treeUtils'
import { MenuTargetSelector, type MenuTarget } from './MenuTargetSelector'
import { DropdownEffectPicker } from '../shared/DropdownEffectPicker'
import type { DropdownEffectId, ItemDropdownEffectId } from '../shared/dropdownEffects'

export type MenuTreeEditorProps = {
  tree: MenuTreeNode[]
  onChange: (updatedTree: MenuTreeNode[]) => void
  menuId?: string | number
  enableMegaMenu?: boolean
  menuDefaultEffect?: DropdownEffectId
  disabled?: boolean
  emptyMessage?: string
}

export function MenuTreeEditor({
  tree,
  onChange,
  menuId,
  enableMegaMenu = false,
  menuDefaultEffect = 'fade',
  disabled = false,
  emptyMessage = 'No menu items yet. Use the "Add Menu Items" panel on the right to add pages, posts, or custom links.',
}: MenuTreeEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | 'inside'>('after')

  const rows = flattenTreeForDisplay(tree)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleTypeChange = (id: string, newType: 'page' | 'post' | 'custom') => {
    const patch: Partial<MenuTreeNode> = {
      link: {
        type: newType,
        page: null,
        post: null,
        url: newType === 'custom' ? '/' : '',
        newTab: false,
      },
      url: newType === 'custom' ? '/' : '',
    }
    onChange(updateNodeInTree(tree, id, patch))
  }

  const handleSelectTarget = (
    id: string,
    target: MenuTarget | null,
    targetType: 'page' | 'post',
  ) => {
    if (!target) {
      onChange(
        updateNodeInTree(tree, id, {
          link: {
            type: targetType,
            page: null,
            post: null,
            url: '',
            newTab: false,
          },
          url: '',
        }),
      )
      return
    }

    onChange(
      updateNodeInTree(tree, id, {
        label: target.title,
        link: {
          type: targetType,
          page: targetType === 'page' ? target.id : null,
          post: targetType === 'post' ? target.id : null,
          url: target.canonicalPath,
          newTab: false,
        },
        url: target.canonicalPath,
      }),
    )
  }

  const handleUpdateLabel = (id: string, newLabel: string) => {
    onChange(updateNodeInTree(tree, id, { label: newLabel }))
  }

  const handleUpdateCustomUrl = (id: string, newUrl: string) => {
    onChange(
      updateNodeInTree(tree, id, {
        url: newUrl,
        link: {
          type: 'custom',
          url: newUrl,
          page: null,
          post: null,
        },
      }),
    )
  }

  const handleUpdateNewTab = (id: string, checked: boolean) => {
    onChange(
      updateNodeInTree(tree, id, {
        newTab: checked,
        link: {
          newTab: checked,
        },
      }),
    )
  }

  const handleUpdateTriggerOnly = (id: string, checked: boolean) => {
    onChange(updateNodeInTree(tree, id, { triggerOnly: checked }))
  }

  const handleUpdateHasSubmenu = (id: string, checked: boolean) => {
    onChange(
      updateNodeInTree(tree, id, {
        hasSubmenu: checked,
        submenuType: checked ? 'classic' : undefined,
      }),
    )
  }

  const handleUpdateSubmenuType = (id: string, typeVal: 'classic' | 'mega') => {
    onChange(updateNodeInTree(tree, id, { submenuType: typeVal }))
  }

  const handleUpdateDropdownEffect = (id: string, effect: ItemDropdownEffectId) => {
    onChange(updateNodeInTree(tree, id, { dropdownEffect: effect }))
  }

  const handleDelete = (id: string) => {
    onChange(deleteNodeFromTree(tree, id))
  }

  const handleIndent = (id: string) => {
    onChange(indentNodeInTree(tree, id))
  }

  const handleOutdent = (id: string) => {
    onChange(outdentNodeInTree(tree, id))
  }

  const handleMove = (id: string, direction: 'up' | 'down') => {
    onChange(moveNodeInLevel(tree, id, direction))
  }

  // HTML5 Drag & Drop handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNodeId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedNodeId === id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const height = rect.height

    let pos: 'before' | 'after' | 'inside' = 'after'
    if (relativeY < height * 0.25) {
      pos = 'before'
    } else if (relativeY > height * 0.75) {
      pos = 'after'
    } else {
      pos = 'inside'
    }

    setDragOverNodeId(id)
    setDragPosition(pos)
  }

  const onDragLeave = () => {
    setDragOverNodeId(null)
  }

  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedNodeId || draggedNodeId === targetId) {
      setDraggedNodeId(null)
      setDragOverNodeId(null)
      return
    }

    const updated = reorderTreeDragDrop(tree, draggedNodeId, targetId, dragPosition)
    onChange(updated)

    setDraggedNodeId(null)
    setDragOverNodeId(null)
  }

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs">
              <Text fw={600} size="sm" style={{ color: 'var(--zyvavu-text, #17201f)' }}>
                Menu Structure
              </Text>
              <Badge size="xs" variant="light" color="#0e6b66">
                {rows.length} {rows.length === 1 ? 'item' : 'items'}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Drag items or use indent/outdent buttons to organize parent-child navigation. Click an
              item to edit link and submenu settings.
            </Text>
          </div>
        </Group>

        <Divider />

        {rows.length === 0 ? (
          <Box p="xl" style={{ textAlign: 'center' }}>
            <Text size="sm" c="dimmed">
              {emptyMessage}
            </Text>
          </Box>
        ) : (
          <Stack gap="xs">
            {rows.map((row) => {
              const { node, depth, canIndent, canOutdent, indexInLevel, totalInLevel } = row
              const isExpanded = expandedIds.has(node.id)
              const itemType = node.link?.type || 'custom'
              const isPageOrPost = itemType === 'page' || itemType === 'post'

              const targetId =
                itemType === 'page'
                  ? typeof node.link?.page === 'object' && node.link?.page !== null
                    ? node.link.page.id
                    : node.link?.page
                  : typeof node.link?.post === 'object' && node.link?.post !== null
                    ? node.link.post.id
                    : node.link?.post

              const targetTitle =
                itemType === 'page' ? node.link?.page?.title : node.link?.post?.title

              const targetPath =
                itemType === 'page'
                  ? node.link?.page?.publicPath ||
                    (node.link?.page?.slug ? `/${node.link.page.slug}` : undefined)
                  : node.link?.post?.publicPath ||
                    (node.link?.post?.slug ? `/${node.link.post.slug}.html` : undefined)

              const resolvedCanonicalPreview =
                targetPath || node.link?.url || node.url || ''

              const isDraggingThis = draggedNodeId === node.id
              const isDragOverThis = dragOverNodeId === node.id

              const isMega = node.hasSubmenu && node.submenuType === 'mega'

              return (
                <Card
                  key={node.id}
                  withBorder
                  p="xs"
                  radius="sm"
                  draggable={!disabled}
                  onDragStart={(e) => onDragStart(e, node.id)}
                  onDragOver={(e) => onDragOver(e, node.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, node.id)}
                  style={{
                    marginLeft: `${depth * 28}px`,
                    opacity: isDraggingThis ? 0.4 : 1,
                    borderLeft: depth > 0 ? '3px solid #0e6b66' : undefined,
                    borderTop:
                      isDragOverThis && dragPosition === 'before'
                        ? '2px solid #0e6b66'
                        : undefined,
                    borderBottom:
                      isDragOverThis && dragPosition === 'after'
                        ? '2px solid #0e6b66'
                        : undefined,
                    backgroundColor:
                      isDragOverThis && dragPosition === 'inside'
                        ? 'var(--zyvavu-background, #f0fdf4)'
                        : 'var(--zyvavu-surface, #ffffff)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Compact Header Row */}
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      {/* Drag Handle */}
                      <Box
                        style={{
                          cursor: disabled ? 'default' : 'grab',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Drag to reorder or nest"
                      >
                        <GripVertical size={16} />
                      </Box>

                      {/* Item Title and Badges */}
                      <Group gap={6} wrap="nowrap" style={{ overflow: 'hidden' }}>
                        <Text
                          size="sm"
                          fw={600}
                          style={{
                            cursor: 'pointer',
                            color: 'var(--zyvavu-text, #17201f)',
                          }}
                          onClick={() => toggleExpand(node.id)}
                          lineClamp={1}
                        >
                          {node.label || 'Untitled'}
                        </Text>

                        {/* Target badge */}
                        <Badge size="xs" variant="outline" color="gray">
                          {itemType === 'page'
                            ? 'Page'
                            : itemType === 'post'
                              ? 'Post'
                              : 'Custom URL'}
                        </Badge>

                        {/* Submenu status badge */}
                        {node.hasSubmenu && (
                          <Badge
                            size="xs"
                            variant="light"
                            color={isMega ? 'teal' : 'blue'}
                            leftSection={isMega ? <Sparkles size={10} /> : <Layers size={10} />}
                          >
                            {isMega ? 'Mega Menu' : 'Classic Dropdown'}
                          </Badge>
                        )}

                        {/* Trigger Only badge */}
                        {node.triggerOnly && (
                          <Badge size="xs" variant="light" color="orange">
                            Trigger Only
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    {/* Action Controls */}
                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Tooltip label="Indent (Nest under item above)" withArrow>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="teal"
                          disabled={disabled || !canIndent}
                          onClick={() => handleIndent(node.id)}
                        >
                          <CornerDownRight size={13} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Outdent (Promote to higher level)" withArrow>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="blue"
                          disabled={disabled || !canOutdent}
                          onClick={() => handleOutdent(node.id)}
                        >
                          <CornerUpLeft size={13} />
                        </ActionIcon>
                      </Tooltip>

                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        disabled={disabled || indexInLevel === 0}
                        onClick={() => handleMove(node.id, 'up')}
                        title="Move Up"
                      >
                        <ArrowUp size={13} />
                      </ActionIcon>

                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        disabled={disabled || indexInLevel === totalInLevel - 1}
                        onClick={() => handleMove(node.id, 'down')}
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </ActionIcon>

                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="xs"
                        disabled={disabled}
                        onClick={() => handleDelete(node.id)}
                        title="Remove Item"
                      >
                        <Trash2 size={13} />
                      </ActionIcon>

                      {/* Expand / Collapse Button */}
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={() => toggleExpand(node.id)}
                        title={isExpanded ? 'Collapse settings' : 'Expand settings'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* Expanded Settings Panel */}
                  <Collapse in={isExpanded}>
                    <Box pt="sm">
                      <Divider mb="sm" />
                      <Stack gap="sm">
                        {/* 1. Label and Target Type */}
                        <Group align="flex-start" grow>
                          <TextInput
                            label="Navigation Label"
                            size="xs"
                            placeholder="Menu Item Label"
                            value={node.label}
                            disabled={disabled}
                            onChange={(e) => handleUpdateLabel(node.id, e.currentTarget.value)}
                          />

                          <Select
                            label="Link Type"
                            size="xs"
                            value={itemType}
                            disabled={disabled}
                            onChange={(val: any) => handleTypeChange(node.id, val)}
                            data={[
                              { label: 'Page', value: 'page' },
                              { label: 'Post', value: 'post' },
                              { label: 'Custom URL', value: 'custom' },
                            ]}
                          />
                        </Group>

                        {/* 2. Target Selector & Canonical Path */}
                        <Group align="flex-start" grow>
                          {isPageOrPost ? (
                            <MenuTargetSelector
                              type={itemType}
                              value={targetId}
                              initialTitle={targetTitle}
                              initialPath={targetPath}
                              disabled={disabled}
                              onSelect={(target) =>
                                handleSelectTarget(node.id, target, itemType as 'page' | 'post')
                              }
                            />
                          ) : (
                            <TextInput
                              label="Custom URL"
                              size="xs"
                              placeholder="/path or https://..."
                              value={node.url || node.link?.url || ''}
                              disabled={disabled}
                              onChange={(e) => handleUpdateCustomUrl(node.id, e.currentTarget.value)}
                            />
                          )}

                          <TextInput
                            label="Canonical URL Preview"
                            size="xs"
                            value={resolvedCanonicalPreview || '—'}
                            readOnly
                            disabled
                          />
                        </Group>

                        {/* 3. Link Behavior Checkboxes */}
                        <Group gap="xl">
                          <Checkbox
                            label="Open in new window / tab"
                            size="xs"
                            checked={Boolean(node.newTab || node.link?.newTab)}
                            disabled={disabled}
                            onChange={(e) => handleUpdateNewTab(node.id, e.currentTarget.checked)}
                          />

                          <Checkbox
                            label="Trigger only (clicking only opens dropdown; does not navigate)"
                            size="xs"
                            checked={Boolean(node.triggerOnly)}
                            disabled={disabled}
                            onChange={(e) => handleUpdateTriggerOnly(node.id, e.currentTarget.checked)}
                          />
                        </Group>

                        <Divider my={4} />

                        {/* 4. Submenu Configuration */}
                        <Stack gap="xs">
                          <Group justify="space-between" align="center">
                            <div>
                              <Text size="xs" fw={600}>
                                Submenu Configuration
                              </Text>
                              <Text size="11px" c="dimmed">
                                Configure whether this item acts as a dropdown menu parent
                              </Text>
                            </div>

                            <Switch
                              size="xs"
                              color="#0e6b66"
                              label="Enable Submenu"
                              checked={Boolean(node.hasSubmenu)}
                              disabled={disabled}
                              onChange={(e) => handleUpdateHasSubmenu(node.id, e.currentTarget.checked)}
                            />
                          </Group>

                          {node.hasSubmenu && (
                            <Paper
                              withBorder
                              p="xs"
                              radius="sm"
                              style={{
                                backgroundColor: 'var(--zyvavu-surface-subtle, #f8f9fa)',
                              }}
                            >
                              <Stack gap="xs">
                                <div>
                                  <Text size="xs" fw={600} mb={4}>
                                    Submenu Type
                                  </Text>
                                  <SegmentedControl
                                    size="xs"
                                    value={node.submenuType || 'classic'}
                                    disabled={disabled}
                                    onChange={(val) =>
                                      handleUpdateSubmenuType(node.id, val as 'classic' | 'mega')
                                    }
                                    data={[
                                      { label: 'Classic Dropdown', value: 'classic' },
                                      {
                                        label: 'Mega Menu (Puck)',
                                        value: 'mega',
                                        disabled: !enableMegaMenu,
                                      },
                                    ]}
                                  />
                                  {!enableMegaMenu && (
                                    <Text size="11px" c="dimmed" mt={4}>
                                      Mega Menu is disabled in Site Settings. Enable it to design visual layouts.
                                    </Text>
                                  )}
                                </div>

                                {isMega ? (
                                  <Paper withBorder p="xs" radius="sm" style={{ backgroundColor: '#ffffff' }}>
                                    <Group justify="space-between" align="center">
                                      <div>
                                        <Text size="xs" fw={600} c="#0e6b66">
                                          Dedicated Visual Mega Layout
                                        </Text>
                                        <Text size="11px" c="dimmed">
                                          This item uses an independent desktop layout designed in Puck.
                                        </Text>
                                      </div>

                                      {menuId && menuId !== 'create' ? (
                                        <Button
                                          component={Link}
                                          href={`/admin/menu-builder?menuId=${menuId}&itemId=${node.id}`}
                                          size="xs"
                                          color="#0e6b66"
                                          leftSection={<Laptop size={14} />}
                                          rightSection={<ExternalLink size={12} />}
                                        >
                                          Open Mega Menu Editor
                                        </Button>
                                      ) : (
                                        <Tooltip label="Save the menu first so a real ID exists before opening Puck" withArrow>
                                          <Button size="xs" color="gray" variant="light" disabled>
                                            Save Menu First to Open Puck
                                          </Button>
                                        </Tooltip>
                                      )}
                                    </Group>
                                  </Paper>
                                ) : (
                                  <Text size="11px" c="dimmed">
                                    Classic Submenu: arrange sub-items under this item by indenting them in the menu structure above.
                                  </Text>
                                )}

                                {/* Dropdown Animation Effect */}
                                <Box pt={4}>
                                  <Text size="xs" fw={600} mb={4}>
                                    Dropdown Animation Effect
                                  </Text>
                                  <DropdownEffectPicker
                                    value={node.dropdownEffect || 'inherit'}
                                    onChange={(eff) => handleUpdateDropdownEffect(node.id, eff)}
                                    allowInherit={true}
                                    menuDefault={menuDefaultEffect}
                                    disabled={disabled}
                                  />
                                </Box>
                              </Stack>
                            </Paper>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  </Collapse>
                </Card>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
