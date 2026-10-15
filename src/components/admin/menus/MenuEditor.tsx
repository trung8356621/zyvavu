'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, Check, Save } from 'lucide-react'

import {
  type ClassicMenuItem,
  flatItemsToTree,
  type MenuTreeNode,
  treeToFlatItems,
} from './treeUtils'
import { MenuTreeEditor } from './MenuTreeEditor'
import { MenuAddItemsPanel } from './MenuAddItemsPanel'
import { DropdownEffectPicker } from '../shared/DropdownEffectPicker'
import type { DropdownEffectId } from '../shared/dropdownEffects'

export { type ClassicMenuItem }

export type MenuDoc = {
  id?: number | string
  name?: string
  location?: 'header' | 'footer'
  mode?: 'classic' | 'mega'
  defaultDropdownEffect?: DropdownEffectId
  items?: ClassicMenuItem[]
  megaLayout?: any
  megaLayouts?: Record<string, any>
  mobileMenu?: any
}

export type MenuEditorProps = {
  initialDoc: MenuDoc
  enableMegaMenu: boolean
  menuId?: number | string
}

export function MenuEditor({ initialDoc, enableMegaMenu, menuId }: MenuEditorProps) {
  const router = useRouter()
  const isCreate = !menuId || menuId === 'create'

  const [name, setName] = useState<string>(initialDoc.name || '')
  const [location, setLocation] = useState<'header' | 'footer'>(initialDoc.location || 'header')
  const [defaultDropdownEffect, setDefaultDropdownEffect] = useState<DropdownEffectId>(
    initialDoc.defaultDropdownEffect || 'fade',
  )

  // Initialize hierarchical tree from persisted items
  const [tree, setTree] = useState<MenuTreeNode[]>(() =>
    flatItemsToTree(initialDoc.items || []),
  )

  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Warn on unsaved changes when closing / navigating
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
        'You have unsaved changes in this menu. Are you sure you want to leave without saving?',
      )
      if (!confirmLeave) return
    }
    router.push('/admin/collections/menus')
  }

  const handleTreeChange = (updatedTree: MenuTreeNode[]) => {
    setTree(updatedTree)
    setIsDirty(true)
  }

  const handleAddItems = (newNodes: MenuTreeNode[]) => {
    setTree((prev) => [...prev, ...newNodes])
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError('Menu name is required')
      return
    }

    // Check if any item uses mega layout when site-wide feature switch is off
    const flatList = treeToFlatItems(tree)
    const hasMegaItem = flatList.some((item) => item.hasSubmenu && item.submenuType === 'mega')

    if (hasMegaItem && !enableMegaMenu) {
      setSaveError(
        'One or more items are configured with Mega Menu, but Mega Menu is disabled in Site Settings. Enable it under Settings > Mega Menu before saving.',
      )
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const payloadData: Record<string, any> = {
        name: name.trim(),
        location,
        defaultDropdownEffect,
        items: flatList,
      }

      // Preserve existing megaLayouts map & legacy fields
      if (initialDoc.megaLayouts) {
        payloadData.megaLayouts = initialDoc.megaLayouts
      }
      if (initialDoc.megaLayout) {
        payloadData.megaLayout = initialDoc.megaLayout
      }
      if (initialDoc.mobileMenu) {
        payloadData.mobileMenu = initialDoc.mobileMenu
      }

      const url = isCreate ? '/api/menus' : `/api/menus/${menuId}`
      const method = isCreate ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadData),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || (json.errors && json.errors.length > 0)) {
        const errorDetail =
          json.errors?.[0]?.message ||
          (Array.isArray(json.errors) && json.errors.map((e: any) => e.message).join('; ')) ||
          json.message ||
          `Failed to save menu (${res.status} ${res.statusText})`
        throw new Error(errorDetail)
      }

      setIsDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      if (isCreate && json.doc?.id) {
        router.push(`/admin/collections/menus/${json.doc.id}`)
      }
    } catch (err: any) {
      setSaveSuccess(false)
      setSaveError(err?.message || 'Error occurred while saving menu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box
      className="zyvavu-menu-editor-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Toolbar */}
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
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
            Back to Menus
          </Button>

          <Group gap="xs">
            <Title order={3} size="h4" style={{ color: 'var(--zyvavu-text, #17201f)', margin: 0 }}>
              {isCreate ? 'Create Menu' : `Edit Menu: ${name || initialDoc.name}`}
            </Title>
            {!isCreate && (
              <Text size="xs" c="dimmed">
                (ID: {menuId})
              </Text>
            )}
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
              Menu saved successfully
            </Badge>
          )}

          <Button
            size="sm"
            color="#0e6b66"
            leftSection={<Save size={16} />}
            loading={isSaving}
            onClick={handleSave}
          >
            {isCreate ? 'Create Menu' : 'Save Menu'}
          </Button>
        </Group>
      </Paper>

      {/* Save Error Alert */}
      {saveError && (
        <Alert
          icon={<AlertCircle size={16} />}
          title="Save Failed"
          color="red"
          withCloseButton
          onClose={() => setSaveError(null)}
        >
          {saveError}
        </Alert>
      )}

      {/* 2. Menu Meta & Default Animation Settings */}
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}
      >
        <Stack gap="md">
          <Group align="flex-start" grow>
            <TextInput
              label="Menu Name"
              required
              placeholder="e.g. Primary Header Menu"
              value={name}
              onChange={(e) => {
                setName(e.currentTarget.value)
                setIsDirty(true)
              }}
            />

            <Select
              label="Menu Location"
              required
              value={location}
              onChange={(val) => {
                if (val === 'header' || val === 'footer') {
                  setLocation(val)
                  setIsDirty(true)
                }
              }}
              data={[
                { label: 'Header', value: 'header' },
                { label: 'Footer', value: 'footer' },
              ]}
            />
          </Group>

          <div>
            <Text size="xs" fw={600} mb={6}>
              Default Dropdown Animation Effect
            </Text>
            <DropdownEffectPicker
              value={defaultDropdownEffect}
              onChange={(val) => {
                setDefaultDropdownEffect(val as DropdownEffectId)
                setIsDirty(true)
              }}
              allowInherit={false}
              menuDefault={defaultDropdownEffect}
            />
          </div>
        </Stack>
      </Paper>

      {/* 3. WordPress-style Two-Column Layout */}
      <Grid gutter="md">
        {/* Left Column (65–70%): Menu Structure Tree */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <MenuTreeEditor
            tree={tree}
            onChange={handleTreeChange}
            menuId={menuId}
            enableMegaMenu={enableMegaMenu}
            menuDefaultEffect={defaultDropdownEffect}
          />
        </Grid.Col>

        {/* Right Column (30–35%): Add Menu Items Panel */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <MenuAddItemsPanel onAddItems={handleAddItems} />
        </Grid.Col>
      </Grid>
    </Box>
  )
}
