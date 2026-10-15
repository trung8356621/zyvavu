'use client'

import React, { useEffect, useState } from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { Alert, Box, Loader, Select, Skeleton, Stack, Text } from '@mantine/core'
import { AlertCircle, FolderOpen } from 'lucide-react'

import { payloadPostAdapter } from '../../adapters/postAdapter'
import type { SortOrderOption } from '../../adapters/types'
import {
  getPostTemplate,
  getPostTemplateOptions,
  type PostItemData,
} from '../../templates/registry'

export type PostCategoryListProps = {
  categoryId?: string
  heading?: string
  limit?: number
  sortBy?: SortOrderOption
  templateId?: string
}

// Searchable Category Selector Field for Puck Properties Sidebar
function CategorySelectField({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/categories?limit=100&sort=title', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((data) => {
        if (cancelled) return
        const docs = Array.isArray(data?.docs) ? data.docs : []
        const options = docs.map((doc: any) => ({
          value: String(doc.id),
          label: doc.title || `Category #${doc.id}`,
        }))
        setCategories(options)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Select
      label="Category"
      description="Choose a category to display published posts"
      placeholder={loading ? 'Loading categories...' : 'Select or search category...'}
      data={categories}
      value={value ? String(value) : null}
      onChange={(val) => onChange(val || '')}
      searchable
      clearable
      nothingFoundMessage="No categories found"
      rightSection={loading ? <Loader size={14} /> : undefined}
      size="xs"
    />
  )
}

function PostCategoryListRenderer({
  categoryId,
  heading,
  limit = 4,
  sortBy = 'publishedAt:desc',
  templateId = 'default-link-list',
}: PostCategoryListProps) {
  const [posts, setPosts] = useState<PostItemData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categoryId) {
      setPosts([])
      setError(null)
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)

    payloadPostAdapter
      .fetchPostsByCategory({
        categoryId,
        limit: Number(limit) || 4,
        sortBy,
      })
      .then((items) => {
        if (active) setPosts(items)
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to load posts')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [categoryId, limit, sortBy])

  const template = getPostTemplate(templateId)

  return (
    <Box
      className="zyvavu-mega-post-category-list"
      style={{
        padding: '12px 14px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Section Heading */}
      {heading && (
        <Text
          size="xs"
          fw={700}
          c="var(--zyvavu-text, #17201f)"
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
            borderBottom: '1px solid var(--zyvavu-border, #dfe5e2)',
            paddingBottom: '6px',
          }}
        >
          {heading}
        </Text>
      )}

      {/* State: Missing Category Configuration */}
      {!categoryId && (
        <Box
          p="md"
          style={{
            border: '1px dashed #cbd5e1',
            borderRadius: '6px',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
          }}
        >
          <FolderOpen size={20} color="#64748b" style={{ margin: '0 auto 6px' }} />
          <Text size="xs" fw={600} c="#475569">
            Post Category List
          </Text>
          <Text size="xs" c="#64748b">
            Select a Category in the Properties panel to display live published posts.
          </Text>
        </Box>
      )}

      {/* State: Loading */}
      {isLoading && (
        <Stack gap="xs">
          <Skeleton height={28} radius="sm" />
          <Skeleton height={28} radius="sm" />
          <Skeleton height={28} radius="sm" />
        </Stack>
      )}

      {/* State: Error */}
      {error && !isLoading && (
        <Alert icon={<AlertCircle size={14} />} color="red" p="xs">
          {error}
        </Alert>
      )}

      {/* State: Empty Result */}
      {!isLoading && !error && categoryId && posts.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic" p="xs">
          No published posts found in this category.
        </Text>
      )}

      {/* State: Rendered Posts via Template */}
      {!isLoading && !error && posts.length > 0 && (
        <Stack gap={4}>
          {posts.map((post, idx) => (
            <React.Fragment key={post.id}>
              {template.render({ item: post, index: idx })}
            </React.Fragment>
          ))}
        </Stack>
      )}
    </Box>
  )
}

export const PostCategoryListBlock: ComponentConfig<PostCategoryListProps> = {
  label: 'Post Category List',
  fields: {
    heading: {
      type: 'text',
      label: 'Section Heading',
    },
    categoryId: {
      type: 'custom',
      render: ({ value, onChange }) => (
        <CategorySelectField value={value || ''} onChange={onChange} />
      ),
    },
    limit: {
      type: 'select',
      label: 'Display Limit',
      options: [
        { label: '3 Posts', value: 3 },
        { label: '4 Posts', value: 4 },
        { label: '6 Posts', value: 6 },
        { label: '8 Posts', value: 8 },
        { label: '12 Posts (Max)', value: 12 },
      ],
    },
    sortBy: {
      type: 'select',
      label: 'Sort Order',
      options: [
        { label: 'Newest First', value: 'publishedAt:desc' },
        { label: 'Oldest First', value: 'publishedAt:asc' },
        { label: 'Alphabetical (A-Z)', value: 'title:asc' },
        { label: 'Recently Updated', value: 'updatedAt:desc' },
      ],
    },
    templateId: {
      type: 'select',
      label: 'Item Template',
      options: getPostTemplateOptions(),
    },
  },
  defaultProps: {
    heading: 'Latest Posts',
    limit: 4,
    sortBy: 'publishedAt:desc',
    templateId: 'default-link-list',
  },
  render: (props) => <PostCategoryListRenderer {...props} />,
}
