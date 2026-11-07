'use client'
import { atomManifests } from '@/widgets/atoms/manifests'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Loader, Modal, Stack, Text } from '@mantine/core'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { HeaderActionFrontend } from '@/widgets/HeaderAction/frontend'
import { HeaderTopBarTextFrontend } from '@/widgets/HeaderTopBarText/frontend'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import type { PatternJSON } from '@/lib/theme-engine/patterns/json'
import { isComplexPattern } from '@/lib/theme-engine/patterns/json'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
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
  if (
    root.type === 'Section' &&
    (!Array.isArray(root.props.content) || root.props.content.length === 0)
  ) {
    return (
      <div
        inert
        style={{
          pointerEvents: 'none',
          minHeight: '4.5rem',
          ...resolveWidgetStyles(root.props.style),
        }}
      />
    )
  }
  const Component = SIMPLE[root.type]
  return Component ? (
    <div inert style={{ pointerEvents: 'none' }}>
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

function useNearViewport(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(!enabled)
  useEffect(() => {
    if (!enabled || visible) return
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px 0px', threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, visible])
  return { ref, visible }
}

export function PatternThumbnail({
  record,
  url,
  eager = false,
}: {
  record: PatternJSON
  url?: string | null
  /** When true, skip IntersectionObserver deferral (e.g. preview modal). */
  eager?: boolean
}) {
  const [failedURL, setFailedURL] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<string | null>(null)
  const complex = isComplexPattern(record)
  const { ref, visible } = useNearViewport(complex && !eager)

  if (!complex) return <LivePatternPreview record={record} />

  const base = url || record.thumbnail?.url
  const source = base ? `${base}${base.includes('?') ? '&' : '?'}retry=${attempt}` : undefined
  const showImage = visible && source && source !== failedURL

  return (
    <div
      ref={ref}
      style={{
        aspectRatio: loaded === source ? undefined : '3 / 2',
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        minHeight: '7rem',
        background: 'var(--mantine-color-gray-0)',
      }}
    >
      {showImage ? (
        <>
          {loaded !== source && (
            <div
              role="status"
              style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
            >
              <Loader size="sm" aria-label="Preparing thumbnail" />
            </div>
          )}
          <img
            key={source}
            src={source}
            alt={record.name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={1200}
            height={800}
            style={{ display: 'block', width: '100%', height: 'auto' }}
            onLoad={() => setLoaded(source)}
            onError={() => setFailedURL(source)}
          />
        </>
      ) : visible ? (
        <Stack p="sm" gap="xs" role="status">
          <Text size="sm">Thumbnail unavailable</Text>
          <Text size="xs" c="dimmed">
            {record.name} · Capture failed. Retry to load this design.
          </Text>
          {source && (
            <Button
              size="sm"
              variant="subtle"
              style={{ position: 'relative', zIndex: 1 }}
              onClick={(event) => {
                event.stopPropagation()
                setAttempt((value) => value + 1)
              }}
            >
              Retry thumbnail
            </Button>
          )}
        </Stack>
      ) : (
        <div role="status" aria-label={`${record.name} thumbnail deferred`} />
      )}
    </div>
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
            <PatternThumbnail record={record} url={url} eager />
            <Button onClick={() => setLive(true)}>View with active theme</Button>
            <Alert>Live preview loads only when requested. It does not open another editor.</Alert>
          </>
        )}
      </Stack>
    </Modal>
  )
}
