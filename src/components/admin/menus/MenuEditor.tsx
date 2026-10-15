'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  Laptop,
  Plus,
  Save,
  Smartphone,
  Trash2,
} from 'lucide-react'

import {
  type BuilderDocument,
  createDefaultMegaMenuDocument,
  createEmptyBuilderDocument,
  deserializeBuilderDocument,
  extractNormalizedSourceLinks,
  megaMenuConfig,
  type MobileMenuData,
  PuckHost,
  validateBuilderDocument,
} from '@/components/builder'

export type ClassicMenuItem = {
  id?: string
  label: string
  link?: {
    type?: 'page' | 'post' | 'custom'
    page?: any
    post?: any
    url?: string
    newTab?: boolean
  }
}

export type MenuDoc = {
  id?: number | string
  name?: string
  location?: 'header' | 'footer'
  mode?: 'classic' | 'mega'
  items?: ClassicMenuItem[]
  megaLayout?: any
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
  const [mode, setMode] = useState<'classic' | 'mega'>(initialDoc.mode === 'mega' && enableMegaMenu ? 'mega' : 'classic')

  const [items, setItems] = useState<ClassicMenuItem[]>(initialDoc.items || [])

  const initialMegaLayout = useMemo<BuilderDocument>(() => {
    if (initialDoc.megaLayout) {
      try {
        return deserializeBuilderDocument(initialDoc.megaLayout)
      } catch {
        return createDefaultMegaMenuDocument()
      }
    }
    return createDefaultMegaMenuDocument()
  }, [initialDoc.megaLayout])

  const [megaLayout, setMegaLayout] = useState<BuilderDocument>(initialMegaLayout)
  const [activeTab, setActiveTab] = useState<string | null>('desktop')

  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Extracted mobile source links from mega layout
  const extractedSourceLinks = useMemo(() => {
    return extractNormalizedSourceLinks(megaLayout)
  }, [megaLayout])

  const handleSave = async (customDoc?: BuilderDocument) => {
    if (!name.trim()) {
      setSaveError('Menu name is required')
      return
    }

    const docToSave = customDoc || megaLayout

    if (mode === 'mega') {
      if (!enableMegaMenu) {
        setSaveError('Mega Menu feature is disabled in Site Settings')
        return
      }
      const val = validateBuilderDocument(docToSave)
      if (!val.valid) {
        setSaveError(`Layout validation failed: ${val.errors.join('; ')}`)
        return
      }
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        location,
        mode,
        // Always preserve items and relationships:
        items,
      }

      if (mode === 'mega') {
        payload.megaLayout = docToSave
        // Automatically save updated source link snapshot to mobile foundation
        payload.mobileMenu = {
          version: 1,
          items: extractedSourceLinks.map((sl) => ({
            id: sl.id,
            label: sl.label,
            url: sl.url,
            newTab: sl.newTab,
            sourceLinkId: sl.id,
          })),
          sourceSnapshot: extractedSourceLinks,
        }
      }

      const url = isCreate ? '/api/menus' : `/api/menus/${menuId}`
      const method = isCreate ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
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

  // Classic items handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        label: `Link ${prev.length + 1}`,
        link: { type: 'custom', url: '/', newTab: false },
      },
    ])
    setIsDirty(true)
  }

  const handleUpdateItem = (index: number, updated: ClassicMenuItem) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = updated
      return next
    })
    setIsDirty(true)
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setIsDirty(true)
  }

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
      return next
    })
    setIsDirty(true)
  }

  return (
    <Box
      className="zyvavu-menu-editor-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '16px 24px',
        boxSizing: 'border-box',
        backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
      }}
    >
      {/* Top Header & Navigation */}
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <Group gap="md">
          <Button
            variant="subtle"
            size="sm"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
            onClick={() => router.push('/admin/collections/menus')}
          >
            Menus
          </Button>
          <Title order={2} size="h3" style={{ color: 'var(--zyvavu-text, #17201f)', margin: 0 }}>
            {isCreate ? 'Create Menu' : `Edit Menu: ${name || initialDoc.name || 'Untitled'}`}
          </Title>
          {isDirty && (
            <Badge color="yellow" variant="light" size="sm">
              Unsaved changes
            </Badge>
          )}
        </Group>

        <Group gap="sm">
          {saveSuccess && (
            <Badge color="teal" variant="light" leftSection={<Check size={12} />}>
              Saved successfully
            </Badge>
          )}
          <Button
            size="sm"
            color="#0e6b66"
            leftSection={<Save size={16} />}
            loading={isSaving}
            onClick={() => handleSave()}
          >
            Save Menu
          </Button>
        </Group>
      </Box>

      {saveError && (
        <Alert
          icon={<AlertCircle size={16} />}
          title="Save Failed"
          color="red"
          withCloseButton
          onClose={() => setSaveError(null)}
          mb="md"
        >
          {saveError}
        </Alert>
      )}

      {/* Menu Metadata Controls */}
      <Paper p="md" radius="md" withBorder mb="md" style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}>
        <Group grow align="flex-start">
          <TextInput
            label="Menu Name"
            placeholder="e.g. Header Navigation"
            required
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value)
              setIsDirty(true)
            }}
          />

          <Select
            label="Menu Location"
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

          <Select
            label="Editor Mode"
            value={mode}
            onChange={(val) => {
              if (val === 'mega' && !enableMegaMenu) {
                setSaveError('Mega Menu is disabled in Site Settings. Enable it under Settings > Mega Menu.')
                return
              }
              if (val === 'classic' || val === 'mega') {
                setMode(val)
                setIsDirty(true)
              }
            }}
            data={[
              { label: 'Classic (Simple Link Tree)', value: 'classic' },
              {
                label: enableMegaMenu ? 'Mega Menu (Visual Layout Builder)' : 'Mega Menu (Disabled in Settings)',
                value: 'mega',
                disabled: !enableMegaMenu,
              },
            ]}
            description={
              enableMegaMenu
                ? 'Select Classic for traditional link tree, or Mega for visual multi-column layout.'
                : 'Mega Menu feature switch is OFF in Site Settings.'
            }
          />
        </Group>
      </Paper>

      {/* Workspace Area */}
      {mode === 'classic' ? (
        /* Classic Editor */
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={600} size="sm">
                  Classic Menu Items
                </Text>
                <Text size="xs" c="dimmed">
                  Manage conventional hierarchical navigation links.
                </Text>
              </div>
              <Button size="xs" variant="light" color="#0e6b66" leftSection={<Plus size={14} />} onClick={handleAddItem}>
                Add Link Item
              </Button>
            </Group>

            <Divider />

            {items.length === 0 ? (
              <Box p="xl" style={{ textAlign: 'center' }}>
                <Text size="sm" c="dimmed">
                  No menu items configured. Click "Add Link Item" above to add links.
                </Text>
              </Box>
            ) : (
              <Stack gap="sm">
                {items.map((item, idx) => (
                  <Card key={idx} withBorder p="sm" radius="sm">
                    <Group align="flex-end" gap="sm">
                      <Group gap={4}>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, 'up')}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          disabled={idx === items.length - 1}
                          onClick={() => handleMoveItem(idx, 'down')}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </ActionIcon>
                      </Group>

                      <TextInput
                        label="Label"
                        size="xs"
                        value={item.label}
                        onChange={(e) =>
                          handleUpdateItem(idx, {
                            ...item,
                            label: e.currentTarget.value,
                          })
                        }
                        style={{ flex: 2 }}
                      />

                      <Select
                        label="Type"
                        size="xs"
                        value={item.link?.type || 'custom'}
                        onChange={(val: any) =>
                          handleUpdateItem(idx, {
                            ...item,
                            link: { ...item.link, type: val },
                          })
                        }
                        data={[
                          { label: 'Page', value: 'page' },
                          { label: 'Post', value: 'post' },
                          { label: 'Custom path', value: 'custom' },
                        ]}
                        style={{ flex: 1 }}
                      />

                      <TextInput
                        label="Path / URL"
                        size="xs"
                        value={item.link?.url || ''}
                        onChange={(e) =>
                          handleUpdateItem(idx, {
                            ...item,
                            link: { ...item.link, url: e.currentTarget.value },
                          })
                        }
                        placeholder="/about"
                        style={{ flex: 2 }}
                      />

                      <Checkbox
                        label="New Tab"
                        size="xs"
                        checked={Boolean(item.link?.newTab)}
                        onChange={(e) =>
                          handleUpdateItem(idx, {
                            ...item,
                            link: { ...item.link, newTab: e.currentTarget.checked },
                          })
                        }
                        mb={8}
                      />

                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        mb={4}
                        onClick={() => handleRemoveItem(idx)}
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      ) : (
        /* Mega Mode: Desktop / Mobile Navigation Tabs */
        <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Tabs value={activeTab} onChange={setActiveTab} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Tabs.List mb="sm">
              <Tabs.Tab value="desktop" leftSection={<Laptop size={16} />}>
                Desktop Layout (Mega Builder)
              </Tabs.Tab>
              <Tabs.Tab
                value="mobile"
                leftSection={<Smartphone size={16} />}
                rightSection={
                  <Badge size="xs" variant="light" color="blue">
                    {extractedSourceLinks.length} Links
                  </Badge>
                }
              >
                Mobile Navigation Foundation
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="desktop" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PuckHost
                config={megaMenuConfig}
                document={megaLayout}
                isSaving={isSaving}
                onChange={(updated) => {
                  setMegaLayout(updated)
                  setIsDirty(true)
                }}
                onSave={async (updated) => {
                  setMegaLayout(updated)
                  await handleSave(updated)
                }}
              />
            </Tabs.Panel>

            <Tabs.Panel value="mobile" style={{ flex: 1, minHeight: 0 }}>
              <Paper p="lg" radius="md" withBorder style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}>
                <Stack gap="md">
                  <Alert color="blue" title="Phase V1A Foundation — Mobile Navigation Tree Contract">
                    <Text size="sm">
                      Mobile navigation uses structured links extracted from the Desktop Mega Layout. In this Phase V1A,
                      the typed source-link foundation is established and live source links are synchronized.
                      Custom drag-and-drop hierarchy reordering, nesting, and reset workflows will be enabled in Phase V1B.
                    </Text>
                  </Alert>

                  <Group justify="space-between">
                    <div>
                      <Text fw={600} size="sm">
                        Extracted Source Links Snapshot ({extractedSourceLinks.length})
                      </Text>
                      <Text size="xs" c="dimmed">
                        Source links are automatically normalized from Desktop blocks (LinkList, PromoBanner, ContactCard).
                      </Text>
                    </div>
                  </Group>

                  {extractedSourceLinks.length === 0 ? (
                    <Box p="xl" style={{ textAlign: 'center' }}>
                      <Text size="sm" c="dimmed">
                        No links found in current desktop layout. Add a LinkList or PromoBanner with CTA in the Desktop tab.
                      </Text>
                    </Box>
                  ) : (
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ width: '40px' }}>#</Table.Th>
                          <Table.Th>Link Label</Table.Th>
                          <Table.Th>URL / Path</Table.Th>
                          <Table.Th>Source Block</Table.Th>
                          <Table.Th style={{ width: '100px' }}>New Tab</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {extractedSourceLinks.map((link, idx) => (
                          <Table.Tr key={link.id || idx}>
                            <Table.Td>{idx + 1}</Table.Td>
                            <Table.Td fw={500}>{link.label}</Table.Td>
                            <Table.Td>
                              <Text size="xs" style={{ fontFamily: 'monospace' }}>
                                {link.url}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge size="xs" variant="outline" color="gray">
                                {link.sourceBlockType}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {link.newTab ? (
                                <Badge size="xs" color="teal">
                                  Yes
                                </Badge>
                              ) : (
                                <Text size="xs" c="dimmed">
                                  No
                                </Text>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Box>
      )}
    </Box>
  )
}
