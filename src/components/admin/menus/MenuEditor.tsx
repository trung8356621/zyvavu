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
  deserializeBuilderDocument,
  extractNormalizedSourceLinks,
} from '@/components/builder'
import { MenuTargetSelector, type MenuTarget } from './MenuTargetSelector'

export type ClassicMenuItem = {
  id?: string
  label: string
  link?: {
    type?: 'page' | 'post' | 'custom'
    page?: any
    post?: any
    url?: string | null
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
  const [mode, setMode] = useState<'classic' | 'mega'>(
    initialDoc.mode === 'mega' && enableMegaMenu ? 'mega' : 'classic',
  )

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

  const [activeTab, setActiveTab] = useState<string | null>('desktop')
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Extracted mobile source links from mega layout
  const extractedSourceLinks = useMemo(() => {
    if (initialDoc.mobileMenu?.sourceSnapshot?.length) {
      return initialDoc.mobileMenu.sourceSnapshot
    }
    return extractNormalizedSourceLinks(initialMegaLayout)
  }, [initialDoc.mobileMenu, initialMegaLayout])

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError('Menu name is required')
      return
    }

    if (mode === 'mega' && !enableMegaMenu) {
      setSaveError('Mega Menu feature is disabled in Site Settings')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // Clean and sanitize items to match Payload schema & linksForMenu contracts
      const sanitizedItems = items.map((item) => {
        const itemType = item.link?.type || 'custom'
        if (itemType === 'page') {
          const pageId =
            typeof item.link?.page === 'object' && item.link?.page !== null
              ? item.link.page.id
              : item.link?.page
          return {
            label: item.label.trim() || 'Untitled',
            link: {
              type: 'page' as const,
              page: pageId ? Number(pageId) || pageId : null,
              post: null,
              url: null,
              newTab: Boolean(item.link?.newTab),
            },
          }
        } else if (itemType === 'post') {
          const postId =
            typeof item.link?.post === 'object' && item.link?.post !== null
              ? item.link.post.id
              : item.link?.post
          return {
            label: item.label.trim() || 'Untitled',
            link: {
              type: 'post' as const,
              post: postId ? Number(postId) || postId : null,
              page: null,
              url: null,
              newTab: Boolean(item.link?.newTab),
            },
          }
        } else {
          return {
            label: item.label.trim() || 'Untitled',
            link: {
              type: 'custom' as const,
              url: item.link?.url || '/',
              page: null,
              post: null,
              newTab: Boolean(item.link?.newTab),
            },
          }
        }
      })

      const payloadData: Record<string, any> = {
        name: name.trim(),
        location,
        mode,
        items: sanitizedItems,
      }

      if (isCreate && mode === 'mega') {
        payloadData.megaLayout = initialMegaLayout
        payloadData.mobileMenu = {
          version: 1,
          items: extractedSourceLinks.map((sl: any) => ({
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

  // Classic items handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        label: `Link ${prev.length + 1}`,
        link: { type: 'page', page: null, post: null, url: '', newTab: false },
      },
    ])
    setIsDirty(true)
  }

  const handleTypeChange = (index: number, newType: 'page' | 'post' | 'custom') => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      if (newType === 'page') {
        next[index] = {
          ...current,
          link: {
            type: 'page',
            page: null,
            post: null,
            url: '',
            newTab: Boolean(current.link?.newTab),
          },
        }
      } else if (newType === 'post') {
        next[index] = {
          ...current,
          link: {
            type: 'post',
            page: null,
            post: null,
            url: '',
            newTab: Boolean(current.link?.newTab),
          },
        }
      } else {
        next[index] = {
          ...current,
          link: {
            type: 'custom',
            page: null,
            post: null,
            url: current.link?.url || '/',
            newTab: Boolean(current.link?.newTab),
          },
        }
      }
      return next
    })
    setIsDirty(true)
  }

  const handleSelectTarget = (
    index: number,
    target: MenuTarget | null,
    targetType: 'page' | 'post',
  ) => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      if (!target) {
        next[index] = {
          ...current,
          link: {
            ...current.link,
            type: targetType,
            page: null,
            post: null,
            url: '',
          },
        }
        return next
      }

      next[index] = {
        ...current,
        label: target.title,
        link: {
          ...current.link,
          type: targetType,
          page: targetType === 'page' ? target.id : null,
          post: targetType === 'post' ? target.id : null,
          url: target.canonicalPath,
          newTab: Boolean(current.link?.newTab),
        },
      }
      return next
    })
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
      <Paper
        p="md"
        radius="md"
        withBorder
        mb="md"
        style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}
      >
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
                setSaveError(
                  'Mega Menu is disabled in Site Settings. Enable it under Settings > Mega Menu.',
                )
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
                label: enableMegaMenu
                  ? 'Mega Menu (Visual Layout Builder)'
                  : 'Mega Menu (Disabled in Settings)',
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
        /* Redesigned Classic Editor: Type -> Select Target -> Label -> URL */
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}
        >
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={600} size="sm">
                  Classic Menu Items
                </Text>
                <Text size="xs" c="dimmed">
                  Manage conventional navigation links with CMS relationship targets.
                </Text>
              </div>
              <Button
                size="xs"
                variant="light"
                color="#0e6b66"
                leftSection={<Plus size={14} />}
                onClick={handleAddItem}
              >
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
                {items.map((item, idx) => {
                  const itemType = item.link?.type || 'custom'
                  const isPageOrPost = itemType === 'page' || itemType === 'post'

                  // Resolve target ID and pre-populated details
                  const targetId =
                    itemType === 'page'
                      ? typeof item.link?.page === 'object' && item.link?.page !== null
                        ? item.link.page.id
                        : item.link?.page
                      : typeof item.link?.post === 'object' && item.link?.post !== null
                        ? item.link.post.id
                        : item.link?.post

                  const targetTitle =
                    itemType === 'page'
                      ? item.link?.page?.title
                      : item.link?.post?.title

                  const targetPath =
                    itemType === 'page'
                      ? item.link?.page?.publicPath ||
                        (item.link?.page?.slug ? `/${item.link.page.slug}` : undefined)
                      : item.link?.post?.publicPath ||
                        (item.link?.post?.slug ? `/${item.link.post.slug}.html` : undefined)

                  const resolvedCanonicalPreview =
                    targetPath || item.link?.url || ''

                  return (
                    <Card key={idx} withBorder p="sm" radius="sm">
                      <Group align="flex-start" gap="sm" wrap="nowrap">
                        {/* Reorder Up / Down */}
                        <Group gap={4} style={{ marginTop: '24px', flexShrink: 0 }}>
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

                        {/* 1. Type (First control) */}
                        <Select
                          label="Type"
                          size="xs"
                          value={itemType}
                          onChange={(val: any) => handleTypeChange(idx, val)}
                          data={[
                            { label: 'Page', value: 'page' },
                            { label: 'Post', value: 'post' },
                            { label: 'Custom URL', value: 'custom' },
                          ]}
                          style={{ width: '130px', flexShrink: 0 }}
                        />

                        {/* 2. Select Target (Page / Post searchable picker) */}
                        {isPageOrPost ? (
                          <MenuTargetSelector
                            type={itemType}
                            value={targetId}
                            initialTitle={targetTitle}
                            initialPath={targetPath}
                            onSelect={(target) =>
                              handleSelectTarget(idx, target, itemType as 'page' | 'post')
                            }
                            style={{ flex: 2 }}
                          />
                        ) : (
                          <TextInput
                            label="Target"
                            size="xs"
                            value="Direct Custom URL"
                            disabled
                            readOnly
                            style={{ flex: 1, minWidth: '130px' }}
                          />
                        )}

                        {/* 3. Label (Autofilled on target selection, but editable) */}
                        <TextInput
                          label="Label"
                          size="xs"
                          placeholder="Link Label"
                          value={item.label}
                          onChange={(e) =>
                            handleUpdateItem(idx, {
                              ...item,
                              label: e.currentTarget.value,
                            })
                          }
                          style={{ flex: 2, minWidth: '150px' }}
                        />

                        {/* 4. URL (Read-only Canonical Preview for Page/Post, Editable for Custom) */}
                        {itemType === 'custom' ? (
                          <TextInput
                            label="URL / Path"
                            size="xs"
                            placeholder="e.g. /about or https://..."
                            value={item.link?.url || ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                ...item,
                                link: {
                                  ...item.link,
                                  type: 'custom',
                                  url: e.currentTarget.value,
                                  page: null,
                                  post: null,
                                },
                              })
                            }
                            style={{ flex: 2, minWidth: '150px' }}
                          />
                        ) : (
                          <TextInput
                            label="Canonical URL Preview"
                            size="xs"
                            value={resolvedCanonicalPreview || '—'}
                            readOnly
                            disabled
                            style={{ flex: 2, minWidth: '150px' }}
                          />
                        )}

                        {/* 5. New Tab */}
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
                          style={{ marginTop: '28px', flexShrink: 0 }}
                        />

                        {/* 6. Remove */}
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          style={{ marginTop: '24px', flexShrink: 0 }}
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove Item"
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  )
                })}
              </Stack>
            )}
          </Stack>
        </Paper>
      ) : (
        /* Mega Mode: Dedicated Mega Menu Section & Mobile Navigation Foundation */
        <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <Tabs.List mb="sm">
              <Tabs.Tab value="desktop" leftSection={<Laptop size={16} />}>
                Desktop Mega Layout
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

            <Tabs.Panel value="desktop" style={{ flex: 1 }}>
              <Paper
                p="xl"
                radius="md"
                withBorder
                style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}
              >
                <Stack gap="md" maw={680}>
                  <Group gap="sm">
                    <Laptop size={28} style={{ color: '#0e6b66' }} />
                    <div>
                      <Text fw={600} size="md">
                        Mega Menu Visual Layout
                      </Text>
                      <Text size="xs" c="dimmed">
                        Design multi-column desktop dropdowns with LinkList, PromoBanner, and ContactCard blocks.
                      </Text>
                    </div>
                  </Group>

                  <Divider />

                  {isCreate ? (
                    <Alert
                      icon={<AlertCircle size={16} />}
                      title="Menu Save Required"
                      color="orange"
                    >
                      This menu has not been saved yet. Please enter a menu name, select a location,
                      and click <b>Save Menu</b> above. Once saved with a valid ID, the dedicated Mega
                      Menu Editor will be unlocked.
                    </Alert>
                  ) : (
                    <>
                      <Text size="sm">
                        Mega Menu layouts are edited in a dedicated, full-screen visual workspace powered
                        by the Puck builder.
                      </Text>

                      <Group mt="xs">
                        <Button
                          color="#0e6b66"
                          size="sm"
                          leftSection={<ExternalLink size={16} />}
                          onClick={() => {
                            if (isDirty) {
                              const confirmLeave = window.confirm(
                                'You have unsaved changes on this menu form. Click OK to proceed to the Mega Menu Editor, or Cancel to stay and save.',
                              )
                              if (!confirmLeave) return
                            }
                            router.push(`/admin/menu-builder?menuId=${menuId}`)
                          }}
                        >
                          Open Mega Menu Editor
                        </Button>
                      </Group>
                    </>
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="mobile" style={{ flex: 1, minHeight: 0 }}>
              <Paper
                p="lg"
                radius="md"
                withBorder
                style={{ backgroundColor: 'var(--zyvavu-surface, #ffffff)' }}
              >
                <Stack gap="md">
                  <Alert color="blue" title="Phase V1A Foundation — Mobile Navigation Tree Contract">
                    <Text size="sm">
                      Mobile navigation uses structured links extracted from the Desktop Mega Layout.
                      In Phase V1A, the typed source-link foundation is established and live source links
                      are synchronized. Custom drag-and-drop hierarchy reordering will be enabled in Phase V1B.
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
                        No links found in current desktop layout. Add links in the dedicated Mega Menu Editor.
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
                        {extractedSourceLinks.map((link: any, idx: number) => (
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
