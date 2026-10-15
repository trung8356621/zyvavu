'use client'

import React, { useEffect, useState } from 'react'
import { Loader, Select } from '@mantine/core'

export type MenuTarget = {
  id: number | string
  title: string
  slug?: string | null
  publicPath?: string | null
  canonicalPath: string
}

export type MenuTargetSelectorProps = {
  type: 'page' | 'post'
  value: number | string | null | undefined
  initialTitle?: string
  initialPath?: string
  onSelect: (target: MenuTarget | null) => void
  disabled?: boolean
  style?: React.CSSProperties
}

export function MenuTargetSelector({
  type,
  value,
  initialTitle,
  initialPath,
  onSelect,
  disabled = false,
  style,
}: MenuTargetSelectorProps) {
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<MenuTarget[]>([])

  // Seed targets if initial value and details are present
  useEffect(() => {
    if (value) {
      const canonical =
        initialPath ||
        (type === 'page' ? `/${value}` : `/${value}.html`)
      setTargets((prev) => {
        if (prev.some((t) => String(t.id) === String(value))) return prev
        return [
          {
            id: value,
            title: initialTitle || `${type === 'page' ? 'Page' : 'Post'} #${value}`,
            publicPath: initialPath,
            canonicalPath: canonical,
          },
          ...prev,
        ]
      })
    }
  }, [value, initialTitle, initialPath, type])

  // Fetch published targets from Payload REST API
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const endpoint = type === 'page' ? '/api/pages' : '/api/posts'
        const params = new URLSearchParams()
        params.append('where[and][0][_status][equals]', 'published')
        if (type === 'page') {
          params.append('where[and][1][visibility][equals]', 'public')
        }
        if (searchValue.trim()) {
          const index = type === 'page' ? '2' : '1'
          params.append(`where[and][${index}][title][like]`, searchValue.trim())
        }
        params.append('limit', '20')
        params.append('depth', '0')

        const res = await fetch(`${endpoint}?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (active && data?.docs) {
          const mapped: MenuTarget[] = data.docs.map((d: any) => {
            const canonical =
              d.publicPath ||
              (type === 'page' ? (d.slug ? `/${d.slug}` : '/') : d.slug ? `/${d.slug}.html` : '/')
            return {
              id: d.id,
              title: d.title || 'Untitled',
              slug: d.slug,
              publicPath: d.publicPath,
              canonicalPath: canonical,
            }
          })

          setTargets((prev) => {
            // Retain the currently selected target in options if not in results
            const selected = prev.find((t) => String(t.id) === String(value))
            if (selected && !mapped.some((m) => String(m.id) === String(selected.id))) {
              return [selected, ...mapped]
            }
            return mapped
          })
        }
      } catch {
        // Keep existing targets on network failure
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [type, searchValue, value])

  const selectData = targets.map((t) => ({
    value: String(t.id),
    label: `${t.title} (${t.canonicalPath})`,
  }))

  return (
    <Select
      label={`Select ${type === 'page' ? 'Page' : 'Post'}`}
      size="xs"
      searchable
      clearable
      disabled={disabled}
      placeholder={type === 'page' ? 'Search published page...' : 'Search published post...'}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      value={value ? String(value) : null}
      data={selectData}
      rightSection={loading ? <Loader size={12} /> : undefined}
      nothingFoundMessage={loading ? 'Searching...' : `No published ${type}s found`}
      comboboxProps={{ withinPortal: true }}
      onChange={(selectedId) => {
        if (!selectedId) {
          onSelect(null)
          return
        }
        const target = targets.find((t) => String(t.id) === selectedId)
        if (target) {
          onSelect(target)
        }
      }}
      style={{ flex: 2, minWidth: '180px', ...style }}
    />
  )
}
