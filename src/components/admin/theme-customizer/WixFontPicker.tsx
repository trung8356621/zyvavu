'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Combobox,
  Flex,
  Group,
  InputBase,
  Loader,
  ScrollArea,
  Text,
  useCombobox,
} from '@mantine/core'
import { AlertCircle, Check, ChevronDown, RefreshCw, Search } from 'lucide-react'
import {
  type CatalogFontItem,
  extractPrimaryFontFamily,
  getCuratedCatalogFallback,
  hasVietnameseSupport,
  isSystemOrGenericFont,
  loadGoogleFontStyles,
} from '@/lib/theme-engine/fonts'

export interface WixFontPickerProps {
  value: string
  onChange: (fontFamily: string) => void
  label?: string
  description?: string
  placeholder?: string
  size?: 'xs' | 'sm' | 'md'
  lang?: string
}

const PREVIEW_SLICE_LIMIT = 50

export function WixFontPicker({
  value,
  onChange,
  label,
  description,
  placeholder = 'Select font...',
  size = 'xs',
  lang,
}: WixFontPickerProps) {
  const [search, setSearch] = useState('')
  const [catalogFonts, setCatalogFonts] = useState<CatalogFontItem[]>(() => getCuratedCatalogFallback())
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<string>(lang || 'vi')

  const abortControllerRef = useRef<AbortController | null>(null)

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      setSearch('')
    },
    onDropdownOpen: () => {
      // Lazy-load preview CSS for top visible candidates when dropdown opens
      const visible = filteredFonts.slice(0, 25).map((f) => f.family)
      loadGoogleFontStyles(visible, [400, 600])
    },
  })

  const primaryCurrent = useMemo(() => extractPrimaryFontFamily(value) || value, [value])

  // Fetch language-aware catalog from /api/fonts
  const fetchFonts = useCallback(async () => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setApiError(null)

    try {
      const q = lang ? `?lang=${encodeURIComponent(lang)}` : ''
      const res = await fetch(`/api/fonts${q}`, { signal: controller.signal })
      if (!res.ok) {
        throw new Error(`Catalog returned ${res.status}`)
      }
      const data = await res.json()
      if (Array.isArray(data.fonts) && data.fonts.length > 0) {
        setCatalogFonts(data.fonts)
        if (data.language) {
          setActiveLang(data.language)
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setApiError(err.message || 'Network error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [lang])

  useEffect(() => {
    fetchFonts()
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [fetchFonts])

  // Always lazy-load full styles for currently selected font
  useEffect(() => {
    if (primaryCurrent && !isSystemOrGenericFont(primaryCurrent)) {
      loadGoogleFontStyles([primaryCurrent], [400, 500, 600, 700, 800])
    }
  }, [primaryCurrent])

  // Find or synthesize preserved current font if absent from catalog
  const currentFontItem = useMemo(() => {
    if (!primaryCurrent) return null
    const lower = primaryCurrent.toLowerCase()
    return catalogFonts.find((f) => f.family.toLowerCase() === lower) || null
  }, [catalogFonts, primaryCurrent])

  const isCurrentVietnamese = useMemo(() => {
    if (!primaryCurrent) return false
    return hasVietnameseSupport(primaryCurrent, currentFontItem || undefined)
  }, [primaryCurrent, currentFontItem])

  // Combine catalog fonts and preserve selected font even if absent
  const allFonts = useMemo(() => {
    const list: CatalogFontItem[] = [...catalogFonts]

    if (primaryCurrent && !currentFontItem) {
      // Synthesize preserved item for custom/unlisted font
      list.unshift({
        family: primaryCurrent,
        category: 'other',
        weights: [400, 700],
        subsets: hasVietnameseSupport(primaryCurrent) ? ['vietnamese', 'latin'] : ['latin'],
        variable: false,
        isCustom: true,
      })
    }

    return list
  }, [catalogFonts, primaryCurrent, currentFontItem])

  // Filter fonts by search query
  const filteredFonts = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allFonts
    return allFonts.filter(
      (f) => f.family.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
    )
  }, [allFonts, search])

  // When search changes, lazy-load preview styles for matching slice
  useEffect(() => {
    if (search.trim()) {
      const topMatches = filteredFonts.slice(0, 25).map((f) => f.family)
      loadGoogleFontStyles(topMatches, [400, 600])
    }
  }, [search, filteredFonts])

  // Sliced options for performance in DOM
  const visibleOptions = useMemo(() => {
    return filteredFonts.slice(0, PREVIEW_SLICE_LIMIT)
  }, [filteredFonts])

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
            rightSection={
              isLoading ? (
                <Loader size={12} color="teal" />
              ) : (
                <ChevronDown size={14} color="var(--mantine-color-dimmed)" />
              )
            }
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
              {primaryCurrent && (
                <Group gap={4}>
                  {isCurrentVietnamese ? (
                    <Badge
                      size="xs"
                      color="teal"
                      variant="light"
                      radius="xs"
                      style={{ fontSize: 9, height: 16 }}
                      title="Supported for Vietnamese"
                    >
                      VN
                    </Badge>
                  ) : activeLang === 'vi' ? (
                    <Badge
                      size="xs"
                      color="orange"
                      variant="light"
                      radius="xs"
                      style={{ fontSize: 9, height: 16 }}
                      title="No native Vietnamese subset detected in catalog"
                    >
                      No VN
                    </Badge>
                  ) : null}
                </Group>
              )}
            </Flex>
          </InputBase>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Search
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search fonts by name or category..."
            leftSection={<Search size={13} color="var(--mantine-color-dimmed)" />}
            size="xs"
          />

          {apiError && (
            <Flex
              align="center"
              justify="space-between"
              px="xs"
              py={4}
              bg="var(--mantine-color-orange-0, #fff9db)"
              style={{
                borderBottom: '1px solid var(--mantine-color-orange-2, #ffe066)',
              }}
            >
              <Group gap={4}>
                <AlertCircle size={12} color="var(--mantine-color-orange-8, #d9480f)" />
                <Text size="xs" c="orange.9" style={{ fontSize: 11 }}>
                  Offline catalog active
                </Text>
              </Group>
              <Button
                variant="subtle"
                color="orange"
                size="compact-xs"
                onClick={() => fetchFonts()}
                leftSection={<RefreshCw size={10} />}
              >
                Retry
              </Button>
            </Flex>
          )}

          <Combobox.Options>
            <ScrollArea.Autosize mah={220} type="scroll">
              {filteredFonts.length === 0 ? (
                <Combobox.Empty>
                  <Text size="xs" c="dimmed" p="xs">
                    {isLoading ? 'Loading catalog...' : `No fonts found matching "${search}"`}
                  </Text>
                </Combobox.Empty>
              ) : (
                <>
                  {visibleOptions.map((font) => {
                    const isSelected = primaryCurrent.toLowerCase() === font.family.toLowerCase()
                    const isVn = hasVietnameseSupport(font.family, font)

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
                            {font.isSystem && (
                              <Badge
                                size="xs"
                                color="gray"
                                variant="outline"
                                radius="xs"
                                style={{ fontSize: 9, height: 14, padding: '0 3px' }}
                              >
                                system
                              </Badge>
                            )}
                            {font.isCustom && (
                              <Badge
                                size="xs"
                                color="yellow"
                                variant="light"
                                radius="xs"
                                style={{ fontSize: 9, height: 14, padding: '0 3px' }}
                              >
                                custom
                              </Badge>
                            )}
                            {isVn ? (
                              <Badge
                                size="xs"
                                color="teal"
                                variant="light"
                                radius="xs"
                                style={{ fontSize: 9, height: 15, padding: '0 4px' }}
                                title="Vietnamese subset verified"
                              >
                                VN
                              </Badge>
                            ) : activeLang === 'vi' ? (
                              <Badge
                                size="xs"
                                color="orange"
                                variant="light"
                                radius="xs"
                                style={{ fontSize: 9, height: 15, padding: '0 4px' }}
                                title="No dedicated Vietnamese subset"
                              >
                                No VN
                              </Badge>
                            ) : null}
                          </Group>
                          {isSelected && (
                            <Check
                              size={14}
                              color="var(--mantine-color-primary, #0e6b66)"
                              strokeWidth={2.5}
                            />
                          )}
                        </Flex>
                      </Combobox.Option>
                    )
                  })}
                  {filteredFonts.length > PREVIEW_SLICE_LIMIT && (
                    <Box px="xs" py={4} bg="var(--mantine-color-gray-0, #f8f9fa)">
                      <Text size="xs" c="dimmed" style={{ fontSize: 11 }} ta="center">
                        Showing top {PREVIEW_SLICE_LIMIT} of {filteredFonts.length} fonts. Type to search all.
                      </Text>
                    </Box>
                  )}
                </>
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  )
}
