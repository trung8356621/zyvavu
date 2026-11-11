'use client'

import NextImage from 'next/image'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Group,
  Image,
  Loader,
  Pagination,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Film, ImageOff } from 'lucide-react'
import { DemoMediaGallery } from './DemoMediaGallery'
import { mediaLibraryURL, type LibraryView } from './mediaLibraryQuery'
import { mediaPreviewSrc, type MediaListDoc } from './mediaThumbnail'
import { MediaLibraryNavigation } from './MediaLibraryNavigation'
import { IconLibraryBrowser } from './IconLibraryBrowser'
import type { IconRef } from '@/lib/icons'
import type { SelectedMedia } from './MediaSourcePicker'

export function MediaBrowser({
  api,
  kind,
  onSelect,
  onCancel,
  upload,
  browse,
  icons,
  canImport = false,
}: {
  api: string
  kind: 'image' | 'video'
  onSelect: (doc: SelectedMedia) => void
  onCancel: () => void
  upload?: React.ReactNode
  browse?: React.ReactNode
  icons?: { value?: IconRef | null; onSelect: (value: IconRef) => void }
  canImport?: boolean
}) {
  const [navigationOpened, setNavigationOpened] = useState(false)
  const [library, setLibrary] = useState<LibraryView | 'builtin-icons'>(
    icons && icons.value?.source !== 'media' ? 'builtin-icons' : kind,
  )
  const demo = library.startsWith('demo-')
  const builtIn = library === 'builtin-icons'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ docs: MediaListDoc[]; totalPages: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (demo || builtIn) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(mediaLibraryURL(api, kind, search, page), {
          signal: controller.signal,
          credentials: 'same-origin',
        })
        if (!response.ok) throw new Error('Unable to load media. Please retry.')
        const data = await response.json()
        if (!Array.isArray(data.docs)) throw new Error('Invalid media response.')
        if (!controller.signal.aborted) setResult(data)
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Unable to load media.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [api, kind, search, page, retry, demo, builtIn])

  return (
    <Stack className="zyvavu-media-browser">
      <Button
        hiddenFrom="sm"
        variant="default"
        aria-expanded={navigationOpened}
        onClick={() => setNavigationOpened((opened) => !opened)}
      >
        Media categories
      </Button>
      <Box className="zyvavu-media-browser__layout">
        <Box
          className="zyvavu-media-browser__navigation"
          display={{ base: navigationOpened ? 'block' : 'none', sm: 'block' }}
        >
          <MediaLibraryNavigation
            value={library}
            allowedKind={kind}
            onOpenBuiltInIcons={icons ? () => setLibrary('builtin-icons') : undefined}
            onChange={(value) => {
              if (value === library) return
              setLibrary(value)
              setLoading(true)
            }}
          />
        </Box>
        <Box className="zyvavu-media-browser__main">
          {builtIn && icons ? (
            <IconLibraryBrowser value={icons.value} onSelect={icons.onSelect} />
          ) : demo ? (
            <DemoMediaGallery kind={kind} api={api} canImport={canImport} onSelect={onSelect} />
          ) : (
            <Stack>
              <Group justify="space-between">
                <TextInput
                  label="Search media"
                  placeholder="Search filenames"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value)
                    setPage(1)
                    setLoading(true)
                  }}
                />
                {upload}
              </Group>
              {loading ? (
                <Group role="status">
                  <Loader size="sm" />
                  <Text>Loading media…</Text>
                </Group>
              ) : error ? (
                <Alert color="red" role="alert">
                  {error}
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setLoading(true)
                      setRetry((value) => value + 1)
                    }}
                  >
                    Retry
                  </Button>
                </Alert>
              ) : result?.docs.length ? (
                <>
                  <div className="zyvavu-media-masonry">
                    {result.docs
                      .filter((doc) => doc.mimeType?.startsWith(`${kind}/`))
                      .map((doc) => {
                        const candidate = mediaPreviewSrc(doc)
                        const thumbnail =
                          doc.thumbnailURL ||
                          (candidate?.startsWith('/api/media/file/') ? candidate : null)
                        return (
                          <Button
                            key={doc.id}
                            variant="default"
                            h="auto"
                            fullWidth
                            styles={{ inner: { width: '100%' }, label: { width: '100%', display: 'block' } }}
                            p="xs"
                            aria-label={`Select ${doc.filename || doc.id}`}
                            disabled={!doc.url}
                            onClick={() => {
                              if (doc.url)
                                onSelect({
                                  id: doc.id,
                                  url: doc.url,
                                  filename: doc.filename || undefined,
                                  mimeType: doc.mimeType || undefined,
                                })
                            }}
                          >
                            <Stack gap="xs" align="center" miw={0} w="100%">
                              {thumbnail ? (
                                thumbnail.startsWith('/api/media/file/') ? (
                                  <NextImage
                                    src={thumbnail}
                                    alt={doc.alt || ''}
                                    width={240}
                                    height={160}
                                    sizes="(max-width: 48em) 45vw, 180px"
                                    loading="lazy"
                                    className="zyvavu-media-masonry__image"
                                  />
                                ) : (
                                  <Image
                                    src={thumbnail}
                                    alt={doc.alt || ''}
                                    className="zyvavu-media-masonry__image"
                                    loading="lazy"
                                  />
                                )
                              ) : (
                                <Box className="zyvavu-media-masonry__placeholder">
                                  {kind === 'video' ? (
                                    <Film aria-label="Video" />
                                  ) : (
                                    <ImageOff aria-label="Image unavailable" />
                                  )}
                                </Box>
                              )}
                              <Text size="sm" truncate maw={130}>
                                {doc.filename || `Media ${doc.id}`}
                              </Text>
                            </Stack>
                          </Button>
                        )
                      })}
                  </div>
                  <Pagination
                    total={result.totalPages || 1}
                    value={page}
                    onChange={(value) => {
                      setPage(value)
                      setLoading(true)
                    }}
                  />
                </>
              ) : (
                <Text c="dimmed">
                  {search
                    ? 'No media matches your search.'
                    : `No ${kind}s yet. Upload media to get started.`}
                </Text>
              )}
            </Stack>
          )}
        </Box>
      </Box>
      <Group justify="flex-end" className="zyvavu-media-browser__footer">
        {!builtIn && browse}
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
      </Group>
    </Stack>
  )
}
