'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useDocumentDrawer, useField, useListDrawer } from '@payloadcms/ui'
import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
} from '@mantine/core'
import {
  AlertCircle,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react'

interface MediaDoc {
  id: number
  filename?: string
  mimeType?: string
  filesize?: number
  width?: number
  height?: number
  url?: string
  thumbnailURL?: string
  alt?: string
}

export interface MediaPickerFieldProps {
  path: string
  label?: string
  description?: string
  required?: boolean
  readOnly?: boolean
}

export function MediaPickerField({
  path,
  label,
  description,
  readOnly = false,
}: MediaPickerFieldProps) {
  const { value, setValue, errorMessage, showError } = useField<
    number | MediaDoc | { id: number } | null
  >({ path })

  const isFavicon = path.toLowerCase().includes('favicon')

  // Extract ID from value
  const mediaId = useMemo<number | null>(() => {
    if (typeof value === 'number') return value
    if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
      return value.id
    }
    return null
  }, [value])

  const [mediaDoc, setMediaDoc] = useState<MediaDoc | null>(() => {
    if (value && typeof value === 'object' && 'url' in value && typeof value.url === 'string') {
      return value as MediaDoc
    }
    return null
  })

  const [loading, setLoading] = useState(false)

  // Fetch asset details when ID is present but doc is not loaded yet
  useEffect(() => {
    if (mediaId && (!mediaDoc || mediaDoc.id !== mediaId)) {
      let isMounted = true
      setLoading(true)
      fetch(`/api/media/${mediaId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((doc) => {
          if (isMounted && doc && doc.id) {
            setMediaDoc(doc)
          }
        })
        .catch(() => {
          // ignore error
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
      return () => {
        isMounted = false
      }
    } else if (!mediaId && mediaDoc) {
      setMediaDoc(null)
    }
  }, [mediaId, mediaDoc])

  // Filter options to disallow PDFs/videos
  const filterOptions = useMemo(() => {
    if (isFavicon) {
      return {
        mimeType: {
          in: [
            'image/png',
            'image/svg+xml',
            'image/x-icon',
            'image/vnd.microsoft.icon',
            'image/webp',
            'image/jpeg',
          ],
        },
      }
    }
    return {
      mimeType: {
        contains: 'image',
      },
    }
  }, [isFavicon])

  const [ListDrawer, , { openDrawer: openListDrawer, closeDrawer: closeListDrawer }] = useListDrawer({
    collectionSlugs: ['media'],
    uploads: true,
    filterOptions,
  })

  const [DocumentDrawer, , { openDrawer: openDocDrawer, closeDrawer: closeDocDrawer }] = useDocumentDrawer({
    collectionSlug: 'media',
  })

  const handleSelect = ({ doc }: { doc: unknown }) => {
    const selected = doc as MediaDoc
    if (selected && typeof selected.id === 'number') {
      setMediaDoc(selected)
      setValue(selected.id)
      closeListDrawer()
    }
  }

  const handleSaveDoc = ({ doc }: { doc: unknown }) => {
    const created = doc as MediaDoc
    if (created && typeof created.id === 'number') {
      setMediaDoc(created)
      setValue(created.id)
      closeDocDrawer()
    }
  }

  const handleRemove = () => {
    setMediaDoc(null)
    setValue(null)
  }

  const formatDescription = isFavicon
    ? 'Browser icon: PNG, SVG, or ICO (square format, e.g. 32×32 or 512×512).'
    : 'Brand logo: PNG, SVG, or WEBP with transparent background recommended.'

  const displayDescription = description || formatDescription

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <Stack gap="xs" style={{ marginTop: '0.25rem', marginBottom: '1rem' }} id={`field-${path}`}>
      <div>
        <Text size="sm" fw={600}>
          {label || (isFavicon ? 'Site Favicon' : 'Site Logo')}
        </Text>
      </div>

      {mediaDoc ? (
        // Selected State
        <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
              <Box
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 6,
                  border: '1px solid #e9ecef',
                  backgroundColor: '#f8faf9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {mediaDoc.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaDoc.thumbnailURL || mediaDoc.url}
                    alt={mediaDoc.alt || mediaDoc.filename || 'Media'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <ImageIcon size={22} color="#adb5bd" />
                )}
              </Box>

              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate style={{ maxWidth: 280 }}>
                  {mediaDoc.filename || `Asset #${mediaDoc.id}`}
                </Text>
                <Group gap="xs" align="center">
                  {mediaDoc.mimeType && (
                    <Badge size="xs" variant="light" color="gray">
                      {mediaDoc.mimeType.replace('image/', '')}
                    </Badge>
                  )}
                  {mediaDoc.width && mediaDoc.height ? (
                    <Text size="xs" c="dimmed">
                      {mediaDoc.width} × {mediaDoc.height}
                    </Text>
                  ) : null}
                  {mediaDoc.filesize ? (
                    <Text size="xs" c="dimmed">
                      {formatFileSize(mediaDoc.filesize)}
                    </Text>
                  ) : null}
                </Group>
              </Stack>
            </Group>

            {!readOnly && (
              <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                <Button
                  size="xs"
                  variant="default"
                  onClick={openListDrawer}
                  leftSection={<RefreshCw size={13} />}
                >
                  Replace
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={handleRemove}
                  leftSection={<Trash2 size={13} />}
                >
                  Remove
                </Button>
              </Group>
            )}
          </Group>
        </Paper>
      ) : (
        // Empty State
        <Paper
          p="sm"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#fcfdfd',
            borderStyle: 'dashed',
            borderColor: '#ced4da',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm" align="center">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  backgroundColor: '#f1f3f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#868e96',
                }}
              >
                <ImageIcon size={22} strokeWidth={1.5} />
              </Box>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  {loading ? 'Loading asset details...' : displayDescription}
                </Text>
              </Stack>
            </Group>

            {!readOnly && (
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="xs"
                  variant="default"
                  onClick={openListDrawer}
                  leftSection={<FolderOpen size={13} />}
                >
                  Choose from Media
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  onClick={openDocDrawer}
                  leftSection={<UploadCloud size={13} />}
                >
                  Upload New
                </Button>
              </Group>
            )}
          </Group>
        </Paper>
      )}

      {showError && errorMessage && (
        <Group gap="xs" align="center" mt={2}>
          <AlertCircle size={14} color="#fa5252" />
          <Text size="xs" c="red">
            {errorMessage}
          </Text>
        </Group>
      )}

      {/* Render Payload Native Drawers */}
      <ListDrawer onSelect={handleSelect} />
      <DocumentDrawer onSave={handleSaveDoc} />
    </Stack>
  )
}
