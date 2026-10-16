'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Combobox,
  Flex,
  Group,
  InputBase,
  ScrollArea,
  Text,
  useCombobox,
} from '@mantine/core'
import { Check, ChevronDown, Search } from 'lucide-react'
import {
  CURATED_FONTS,
  SYSTEM_FONTS,
  extractPrimaryFontFamily,
  getGoogleFontUrl,
  hasVietnameseSupport,
} from '@/lib/theme-engine/fonts'

export interface WixFontPickerProps {
  value: string
  onChange: (fontFamily: string) => void
  label?: string
  description?: string
  placeholder?: string
  size?: 'xs' | 'sm' | 'md'
}

export function WixFontPicker({
  value,
  onChange,
  label,
  description,
  placeholder = 'Select font...',
  size = 'xs',
}: WixFontPickerProps) {
  const [search, setSearch] = useState('')
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      setSearch('')
    },
  })

  const primaryCurrent = useMemo(() => extractPrimaryFontFamily(value) || value, [value])

  // Combine and sort fonts: Vietnamese supported fonts first, then alphabetical
  const allFonts = useMemo(() => {
    const list = [...SYSTEM_FONTS, ...CURATED_FONTS]
    const map = new Map<string, (typeof list)[0]>()
    for (const item of list) {
      if (!map.has(item.family)) {
        map.set(item.family, item)
      }
    }
    const unique = Array.from(map.values())

    return unique.sort((a, b) => {
      const aVn = hasVietnameseSupport(a.family) ? 1 : 0
      const bVn = hasVietnameseSupport(b.family) ? 1 : 0
      if (aVn !== bVn) return bVn - aVn
      return a.family.localeCompare(b.family)
    })
  }, [])

  // Filter fonts by search query
  const filteredFonts = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allFonts
    return allFonts.filter((f) => f.family.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
  }, [allFonts, search])

  // Inject Google Fonts stylesheet into document head for visual previews
  useEffect(() => {
    const familiesToLoad = allFonts
      .map((f) => f.family)
      .filter((fam) => !fam.toLowerCase().includes('system') && !fam.toLowerCase().includes('monospace'))

    const url = getGoogleFontUrl(familiesToLoad)
    if (!url) return

    const existing = document.querySelector(`link[href*="fonts.googleapis.com/css2?family="]`)
    if (existing) {
      // already exists
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
  }, [allFonts])

  return (
    <Box>
      {label && (
        <Text size="xs" fw={600} mb={description ? 2 : 4}>
          {label}
        </Text>
      )}
      {description && (
        <Text size="xs" c="dimmed" mb={4} style={{ fontSize: 11 }}>
          {description}
        </Text>
      )}

      <Combobox
        store={combobox}
        onOptionSubmit={(val) => {
          onChange(val)
          combobox.closeDropdown()
        }}
      >
        <Combobox.Target>
          <InputBase
            size={size}
            component="button"
            type="button"
            pointer
            rightSection={<ChevronDown size={14} color="var(--mantine-color-dimmed)" />}
            onClick={() => combobox.toggleDropdown()}
            rightSectionPointerEvents="none"
          >
            <Flex align="center" justify="space-between" pr={4}>
              <Text
                size="xs"
                style={{
                  fontFamily: primaryCurrent || 'inherit',
                  fontWeight: 500,
                }}
                truncate
              >
                {primaryCurrent || placeholder}
              </Text>
              {hasVietnameseSupport(primaryCurrent) && (
                <Badge size="xs" color="teal" variant="light" radius="xs" style={{ fontSize: 9, height: 16 }}>
                  VN
                </Badge>
              )}
            </Flex>
          </InputBase>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search fonts..."
            leftSection={<Search size={13} color="var(--mantine-color-dimmed)" />}
            size="xs"
          />
          <Combobox.Options>
            <ScrollArea.Autosize mah={220} type="scroll">
              {filteredFonts.length === 0 ? (
                <Combobox.Empty>
                  <Text size="xs" c="dimmed" p="xs">
                    No fonts found
                  </Text>
                </Combobox.Empty>
              ) : (
                filteredFonts.map((font) => {
                  const isSelected = primaryCurrent.toLowerCase() === font.family.toLowerCase()
                  const isVn = hasVietnameseSupport(font.family)

                  return (
                    <Combobox.Option value={font.family} key={font.family}>
                      <Flex align="center" justify="space-between" py={2}>
                        <Group gap={6} style={{ minWidth: 0, flex: 1 }}>
                          <Text
                            size="xs"
                            style={{
                              fontFamily: font.family,
                              fontSize: 13,
                              fontWeight: isSelected ? 600 : 400,
                            }}
                            truncate
                          >
                            {font.family}
                          </Text>
                          {isVn && (
                            <Badge
                              size="xs"
                              color="teal"
                              variant="light"
                              radius="xs"
                              style={{ fontSize: 9, height: 15, padding: '0 4px' }}
                            >
                              VN
                            </Badge>
                          )}
                        </Group>
                        {isSelected && (
                          <Check size={14} color="var(--mantine-color-primary, #0e6b66)" strokeWidth={2.5} />
                        )}
                      </Flex>
                    </Combobox.Option>
                  )
                })
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  )
}
