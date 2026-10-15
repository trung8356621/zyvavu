'use client'

import React, { useEffect, useState } from 'react'
import {
  Accordion,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { FileText, Globe, Link2, Plus, Search } from 'lucide-react'

import { generateNodeId, type MenuTreeNode } from './treeUtils'

type TargetItem = {
  id: number | string
  title: string
  slug?: string | null
  canonicalPath: string
}

export type MenuAddItemsPanelProps = {
  onAddItems: (newNodes: MenuTreeNode[]) => void
  disabled?: boolean
}

export function MenuAddItemsPanel({ onAddItems, disabled = false }: MenuAddItemsPanelProps) {
  // Pages state
  const [pageSearch, setPageSearch] = useState('')
  const [pagesLoading, setPagesLoading] = useState(false)
  const [pages, setPages] = useState<TargetItem[]>([])
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())

  // Posts state
  const [postSearch, setPostSearch] = useState('')
  const [postsLoading, setPostsLoading] = useState(false)
  const [posts, setPosts] = useState<TargetItem[]>([])
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())

  // Custom link state
  const [customUrl, setCustomUrl] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [customNewTab, setCustomNewTab] = useState(false)

  // Fetch Pages
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setPagesLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('where[and][0][_status][equals]', 'published')
        params.append('where[and][1][visibility][equals]', 'public')
        if (pageSearch.trim()) {
          params.append('where[and][2][title][like]', pageSearch.trim())
        }
        params.append('limit', '20')
        params.append('depth', '0')

        const res = await fetch(`/api/pages?${params.toString()}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch pages')
        const data = await res.json()
        if (active && data?.docs) {
          setPages(
            data.docs.map((d: any) => ({
              id: d.id,
              title: d.title || 'Untitled Page',
              slug: d.slug,
              canonicalPath: d.publicPath || (d.slug ? `/${d.slug}` : '/'),
            })),
          )
        }
      } catch {
        // network error fallback
      } finally {
        if (active) setPagesLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [pageSearch])

  // Fetch Posts
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setPostsLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('where[and][0][_status][equals]', 'published')
        if (postSearch.trim()) {
          params.append('where[and][1][title][like]', postSearch.trim())
        }
        params.append('limit', '20')
        params.append('depth', '0')

        const res = await fetch(`/api/posts?${params.toString()}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch posts')
        const data = await res.json()
        if (active && data?.docs) {
          setPosts(
            data.docs.map((d: any) => ({
              id: d.id,
              title: d.title || 'Untitled Post',
              slug: d.slug,
              canonicalPath: d.publicPath || (d.slug ? `/${d.slug}.html` : '/'),
            })),
          )
        }
      } catch {
        // network error fallback
      } finally {
        if (active) setPostsLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [postSearch])

  // Page selection helpers
  const togglePageSelect = (id: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPages = () => {
    if (selectedPageIds.size === pages.length && pages.length > 0) {
      setSelectedPageIds(new Set())
    } else {
      setSelectedPageIds(new Set(pages.map((p) => String(p.id))))
    }
  }

  const handleAddSelectedPages = () => {
    const selected = pages.filter((p) => selectedPageIds.has(String(p.id)))
    if (selected.length === 0) return

    const newNodes: MenuTreeNode[] = selected.map((p) => ({
      id: generateNodeId(),
      label: p.title,
      link: {
        type: 'page',
        page: p.id,
        post: null,
        url: p.canonicalPath,
        newTab: false,
      },
      url: p.canonicalPath,
      newTab: false,
      parentId: null,
      hasSubmenu: false,
      submenuType: 'classic',
      dropdownEffect: 'inherit',
      triggerOnly: false,
      children: [],
    }))

    onAddItems(newNodes)
    setSelectedPageIds(new Set())
  }

  // Post selection helpers
  const togglePostSelect = (id: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPosts = () => {
    if (selectedPostIds.size === posts.length && posts.length > 0) {
      setSelectedPostIds(new Set())
    } else {
      setSelectedPostIds(new Set(posts.map((p) => String(p.id))))
    }
  }

  const handleAddSelectedPosts = () => {
    const selected = posts.filter((p) => selectedPostIds.has(String(p.id)))
    if (selected.length === 0) return

    const newNodes: MenuTreeNode[] = selected.map((p) => ({
      id: generateNodeId(),
      label: p.title,
      link: {
        type: 'post',
        post: p.id,
        page: null,
        url: p.canonicalPath,
        newTab: false,
      },
      url: p.canonicalPath,
      newTab: false,
      parentId: null,
      hasSubmenu: false,
      submenuType: 'classic',
      dropdownEffect: 'inherit',
      triggerOnly: false,
      children: [],
    }))

    onAddItems(newNodes)
    setSelectedPostIds(new Set())
  }

  // Custom link handler
  const handleAddCustomLink = () => {
    if (!customUrl.trim() || !customLabel.trim()) return

    const newNode: MenuTreeNode = {
      id: generateNodeId(),
      label: customLabel.trim(),
      link: {
        type: 'custom',
        url: customUrl.trim(),
        page: null,
        post: null,
        newTab: customNewTab,
      },
      url: customUrl.trim(),
      newTab: customNewTab,
      parentId: null,
      hasSubmenu: false,
      submenuType: 'classic',
      dropdownEffect: 'inherit',
      triggerOnly: false,
      children: [],
    }

    onAddItems([newNode])
    setCustomUrl('')
    setCustomLabel('')
    setCustomNewTab(false)
  }

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={{
        backgroundColor: 'var(--zyvavu-surface, #ffffff)',
      }}
    >
      <Stack gap="sm">
        <div>
          <Text fw={600} size="sm" style={{ color: 'var(--zyvavu-text, #17201f)' }}>
            Add Menu Items
          </Text>
          <Text size="xs" c="dimmed">
            Select items to append to the menu tree
          </Text>
        </div>

        <Accordion defaultValue="pages" variant="separated" radius="sm">
          {/* 1. Pages Accordion */}
          <Accordion.Item value="pages">
            <Accordion.Control icon={<FileText size={16} color="#0e6b66" />}>
              <Text size="xs" fw={600}>
                Pages
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <TextInput
                  placeholder="Search published pages..."
                  size="xs"
                  leftSection={<Search size={12} />}
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.currentTarget.value)}
                />

                <ScrollArea.Autosize mah={180}>
                  {pagesLoading ? (
                    <Box py="sm" style={{ textAlign: 'center' }}>
                      <Loader size="xs" />
                    </Box>
                  ) : pages.length === 0 ? (
                    <Text size="xs" c="dimmed" py="xs" ta="center">
                      No published pages found.
                    </Text>
                  ) : (
                    <Stack gap={6} py={4}>
                      {pages.map((p) => {
                        const isChecked = selectedPageIds.has(String(p.id))
                        return (
                          <Checkbox
                            key={p.id}
                            size="xs"
                            checked={isChecked}
                            onChange={() => togglePageSelect(String(p.id))}
                            label={
                              <Box>
                                <Text size="xs" fw={500} lineClamp={1}>
                                  {p.title}
                                </Text>
                                <Text size="10px" c="dimmed">
                                  {p.canonicalPath}
                                </Text>
                              </Box>
                            }
                          />
                        )
                      })}
                    </Stack>
                  )}
                </ScrollArea.Autosize>

                <Group justify="space-between" pt="xs">
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="gray"
                    onClick={toggleAllPages}
                    disabled={pages.length === 0}
                  >
                    {selectedPageIds.size === pages.length && pages.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="#0e6b66"
                    leftSection={<Plus size={12} />}
                    disabled={disabled || selectedPageIds.size === 0}
                    onClick={handleAddSelectedPages}
                  >
                    Add to Menu ({selectedPageIds.size})
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* 2. Posts Accordion */}
          <Accordion.Item value="posts">
            <Accordion.Control icon={<Globe size={16} color="#0e6b66" />}>
              <Text size="xs" fw={600}>
                Posts
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <TextInput
                  placeholder="Search published posts..."
                  size="xs"
                  leftSection={<Search size={12} />}
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.currentTarget.value)}
                />

                <ScrollArea.Autosize mah={180}>
                  {postsLoading ? (
                    <Box py="sm" style={{ textAlign: 'center' }}>
                      <Loader size="xs" />
                    </Box>
                  ) : posts.length === 0 ? (
                    <Text size="xs" c="dimmed" py="xs" ta="center">
                      No published posts found.
                    </Text>
                  ) : (
                    <Stack gap={6} py={4}>
                      {posts.map((p) => {
                        const isChecked = selectedPostIds.has(String(p.id))
                        return (
                          <Checkbox
                            key={p.id}
                            size="xs"
                            checked={isChecked}
                            onChange={() => togglePostSelect(String(p.id))}
                            label={
                              <Box>
                                <Text size="xs" fw={500} lineClamp={1}>
                                  {p.title}
                                </Text>
                                <Text size="10px" c="dimmed">
                                  {p.canonicalPath}
                                </Text>
                              </Box>
                            }
                          />
                        )
                      })}
                    </Stack>
                  )}
                </ScrollArea.Autosize>

                <Group justify="space-between" pt="xs">
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="gray"
                    onClick={toggleAllPosts}
                    disabled={posts.length === 0}
                  >
                    {selectedPostIds.size === posts.length && posts.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="#0e6b66"
                    leftSection={<Plus size={12} />}
                    disabled={disabled || selectedPostIds.size === 0}
                    onClick={handleAddSelectedPosts}
                  >
                    Add to Menu ({selectedPostIds.size})
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* 3. Custom Links Accordion */}
          <Accordion.Item value="custom">
            <Accordion.Control icon={<Link2 size={16} color="#0e6b66" />}>
              <Text size="xs" fw={600}>
                Custom Links
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <TextInput
                  label="URL"
                  placeholder="https://... or /path"
                  size="xs"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.currentTarget.value)}
                />
                <TextInput
                  label="Link Text"
                  placeholder="Menu Item Label"
                  size="xs"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.currentTarget.value)}
                />
                <Checkbox
                  label="Open link in a new tab"
                  size="xs"
                  checked={customNewTab}
                  onChange={(e) => setCustomNewTab(e.currentTarget.checked)}
                />

                <Group justify="flex-end" pt="xs">
                  <Button
                    size="xs"
                    variant="light"
                    color="#0e6b66"
                    leftSection={<Plus size={12} />}
                    disabled={disabled || !customUrl.trim() || !customLabel.trim()}
                    onClick={handleAddCustomLink}
                  >
                    Add to Menu
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Paper>
  )
}
