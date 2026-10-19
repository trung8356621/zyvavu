'use client'
import { atomManifests } from '@/widgets/atoms/manifests'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import React, { useState } from 'react'
import { Alert, Button, Modal, Stack, Text } from '@mantine/core'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { HeaderActionFrontend } from '@/widgets/HeaderAction/frontend'
import { HeaderTopBarTextFrontend } from '@/widgets/HeaderTopBarText/frontend'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import type { PatternJSON } from '@/lib/theme-engine/patterns/json'
import { isComplexPattern } from '@/lib/theme-engine/patterns/json'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
const SIMPLE: Record<string, React.ComponentType<any>> = {
  ...Object.fromEntries(Object.keys(atomManifests).map((type) => [type, createAtomRenderer(type)])),
  TextBlock: TextBlockFrontend,
  PostTitle: PostTitleFrontend,
  HeaderAction: HeaderActionFrontend,
  HeaderTopBarText: HeaderTopBarTextFrontend,
  ItemTitle: ItemTitleFrontend,
  ItemExcerpt: ItemExcerptFrontend,
  ItemLink: ItemLinkFrontend,
}
export function LivePatternPreview({ record }: { record: PatternJSON }) {
  const root = record.payload.content[0]
  const Component = SIMPLE[root.type]
  return Component ? (
    <div style={{ pointerEvents: 'none' }}>
      <Component
        {...root.props}
        dataContext={{
          type: 'home',
          document: { title: 'Tiêu đề minh họa' },
          item: { title: 'Nội dung minh họa', excerpt: 'Nội dung mẫu', url: '#' },
        }}
      />
    </div>
  ) : (
    <Text>Live preview is available through the protected preview route.</Text>
  )
}
export function PatternThumbnail({ record, url }: { record: PatternJSON; url?: string | null }) {
  const [failedURL, setFailedURL] = useState<string | null>(null)
  if (!isComplexPattern(record)) return <LivePatternPreview record={record} />
  const source = url || record.thumbnail?.url
  return source && source !== failedURL ? (
    <img
      src={source}
      alt={record.name}
      loading="lazy"
      style={{ display: 'block', width: '100%', height: 'auto' }}
      onError={() => setFailedURL(source)}
    />
  ) : (
    <Stack p="sm" gap="xs">
      <Text fw={600}>Preview</Text>
      <Text size="xs" c="dimmed">
        {record.thumbnail?.status === 'failed' ? 'Thumbnail unavailable' : 'Thumbnail pending'}
      </Text>
      <Text size="xs">{record.description}</Text>
    </Stack>
  )
}
export function PatternPreviewModal({
  record,
  url,
  previewKey,
  onClose,
}: {
  record: PatternJSON
  url?: string | null
  previewKey: string
  onClose: () => void
}) {
  const [live, setLive] = useState(false)
  return (
    <Modal
      opened
      onClose={onClose}
      title={record.name}
      size="xl"
      zIndex={ADMIN_OVERLAY_LAYERS.STYLE_MODAL}
    >
      <Stack>
        <Text size="sm">{record.description}</Text>
        {!isComplexPattern(record) ? (
          <LivePatternPreview record={record} />
        ) : live ? (
          <iframe
            title={`${record.name} with active theme`}
            src={`/pattern-preview/${encodeURIComponent(previewKey)}`}
            style={{ width: '100%', height: 'min(65vh,50rem)', border: 0 }}
          />
        ) : (
          <>
            <PatternThumbnail record={record} url={url} />
            <Button onClick={() => setLive(true)}>View with active theme</Button>
            <Alert>Live preview loads only when requested. It does not open another editor.</Alert>
          </>
        )}
      </Stack>
    </Modal>
  )
}
