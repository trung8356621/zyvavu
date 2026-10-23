'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { DEMO_MEDIA } from '@/lib/media/demo-catalog'
import type { SelectedMedia } from './MediaSourcePicker'

export function DemoMediaGallery({
  kind,
  api,
  canImport,
  onSelect,
  useAfterImport = true,
}: {
  kind: 'image' | 'video'
  api: string
  canImport: boolean
  useAfterImport?: boolean
  onSelect: (doc: SelectedMedia) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const busyRef = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  useEffect(() => () => requestRef.current?.abort(), [])
  const [error, setError] = useState<string | null>(null)
  const assets = DEMO_MEDIA.filter((asset) => asset.kind === kind)
  const importAsset = async (id: string) => {
    if (busyRef.current || !canImport) return
    const controller = new AbortController()
    requestRef.current = controller
    busyRef.current = true
    setBusy(id)
    setError(null)
    try {
      const response = await fetch(`${api}/media/demo-import`, {
        signal: controller.signal,
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json()
      if (
        !response.ok ||
        !result.doc?.id ||
        !result.doc.url ||
        !result.doc.mimeType?.startsWith(`${kind}/`)
      )
        throw new Error(result.error || 'Import failed. Please retry.')
      if (!controller.signal.aborted) onSelect(result.doc)
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Import failed. Please retry.')
    } finally {
      busyRef.current = false
      if (!controller.signal.aborted) setBusy(null)
    }
  }
  return (
    <Stack>
      {!useAfterImport && (
        <Text size="sm" c="dimmed">
          {assets.length} demo {kind}s. Media is imported into your library only when selected.
        </Text>
      )}
      {!assets.length && (
        <Text>
          No verified demo videos are available yet. Choose My Media, upload a video, or use the
          existing URL control.
        </Text>
      )}
      {!canImport && assets.length > 0 && (
        <Text c="dimmed">Media create permission is required to import demo assets.</Text>
      )}
      {error && (
        <Alert role="alert" color="red">
          {error}
        </Alert>
      )}
      {busy && (
        <Group role="status">
          <Loader size="sm" />
          <Text>{kind === 'image' ? 'Loading image…' : 'Loading video…'}</Text>
        </Group>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
        {assets.map((asset) =>
          useAfterImport ? (
            <UnstyledButton
              key={asset.id}
              aria-label={`Use ${asset.label}`}
              disabled={!!busy || !canImport}
              aria-busy={busy === asset.id}
              onClick={() => void importAsset(asset.id)}
            >
              <Stack gap="xs">
                <Image src={asset.thumbnailURL} alt="" h={120} fit="cover" loading="lazy" />
                <Text size="sm" truncate>
                  {asset.label}
                </Text>
              </Stack>
            </UnstyledButton>
          ) : (
            <Stack key={asset.id} gap="xs">
              <Image
                src={asset.thumbnailURL}
                alt={asset.label}
                h={120}
                fit="contain"
                loading="lazy"
              />
              <Text fw={600}>{asset.label}</Text>
              <Text size="xs" c="dimmed">
                {asset.category} · {asset.credit}
              </Text>
              <Anchor href={asset.sourcePage} target="_blank" rel="noopener noreferrer" size="xs">
                Source
              </Anchor>
              <Anchor href={asset.licenseURL} target="_blank" rel="noopener noreferrer" size="xs">
                {asset.license}
              </Anchor>
              <Button
                variant="light"
                disabled={!!busy || !canImport}
                loading={busy === asset.id}
                onClick={() => void importAsset(asset.id)}
              >
                Import {useAfterImport ? 'and use' : 'to library:'} {asset.label}
              </Button>
            </Stack>
          ),
        )}
      </SimpleGrid>
    </Stack>
  )
}
