'use client'

import { atomManifests } from '@/widgets/atoms/manifests'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Loader, Modal, Stack, Text } from '@mantine/core'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { GalleryFrontend } from '@/widgets/Gallery/frontend'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { HeaderActionFrontend } from '@/widgets/HeaderAction/frontend'
import { HeaderTopBarTextFrontend } from '@/widgets/HeaderTopBarText/frontend'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import type { PatternJSON } from '@/lib/theme-engine/patterns/json'
import { isComplexPattern, PATTERN_SLOTS } from '@/lib/theme-engine/patterns/json'
import { resolveSectionLayerStyles, resolveWidgetStyles } from '@/lib/style-engine/serializer'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import styles from './PatternPreview.module.css'

const SIMPLE: Record<string, React.ComponentType<any>> = {
  ...Object.fromEntries(Object.keys(atomManifests).map((type) => [type, createAtomRenderer(type)])),
  // Library previews never autoplay Video — atom defaults keep autoplay false.
  TextBlock: TextBlockFrontend,
  Gallery: GalleryFrontend,
  PostTitle: PostTitleFrontend,
  HeaderAction: HeaderActionFrontend,
  HeaderTopBarText: HeaderTopBarTextFrontend,
  ItemTitle: ItemTitleFrontend,
  ItemExcerpt: ItemExcerptFrontend,
  ItemLink: ItemLinkFrontend,
}

const PREVIEW_CONTEXT = {
  type: 'home' as const,
  document: { title: 'Tiêu đề minh họa' },
  item: { title: 'Nội dung minh họa', excerpt: 'Nội dung mẫu', url: '#' },
}

const COLUMN_TEMPLATES: Record<string, string> = {
  '1': '1fr',
  'equal-2': '1fr 1fr',
  '2:1': '2fr 1fr',
  '1:2': '1fr 2fr',
  '1:1:1': 'repeat(3, 1fr)',
  '1:1:1:1': 'repeat(4, 1fr)',
}

function previewNode(
  node: { type: string; props?: Record<string, unknown> },
  key: string,
): React.ReactNode {
  if (node.type === 'Columns') {
    return <ColumnsStructurePreview key={key} props={node.props || {}} />
  }
  if (node.type === 'Section') {
    return <SectionStructurePreview key={key} props={node.props || {}} nested />
  }
  const Component = SIMPLE[node.type]
  if (!Component) {
    return (
      <div key={key} className={styles.slotPlaceholder} aria-hidden>
        {node.type}
      </div>
    )
  }
  return (
    <div key={key} className={styles.atomScale}>
      <Component {...node.props} dataContext={PREVIEW_CONTEXT} />
    </div>
  )
}

function ColumnsStructurePreview({ props }: { props: Record<string, unknown> }) {
  const distribution = String(props.distribution || 'equal-2')
  const template = COLUMN_TEMPLATES[distribution] || COLUMN_TEMPLATES['equal-2']
  const style = props.style as UniversalStyle | undefined
  const slots = (['column1', 'column2', 'column3', 'column4'] as const)
    .map((slot) => ({ slot, children: props[slot] }))
    .filter((entry) => Array.isArray(entry.children) && entry.children.length > 0)

  const count =
    distribution === '1:1:1:1'
      ? 4
      : distribution === '1:1:1'
        ? 3
        : distribution === '1'
          ? 1
          : 2

  const columns = Array.from({ length: count }, (_, index) => {
    const found = slots[index]
    return found?.children as Array<{ type: string; props?: Record<string, unknown> }> | undefined
  })

  return (
    <div
      className={styles.columnsPreview}
      style={{
        gridTemplateColumns: template,
        ...resolveWidgetStyles(style),
        margin: 0,
        gap: 6,
      }}
    >
      {columns.map((children, index) => (
        <div key={`col-${index}`} className={styles.columnCell}>
          {children?.length
            ? children.slice(0, 2).map((child, childIndex) => previewNode(child, `${index}-${childIndex}`))
            : (
                <div className={styles.slotPlaceholder} aria-hidden />
              )}
        </div>
      ))}
    </div>
  )
}

function SectionStructurePreview({
  props,
  nested = false,
}: {
  props: Record<string, unknown>
  nested?: boolean
}) {
  const style = props.style as UniversalStyle | undefined
  const content = Array.isArray(props.content) ? props.content : []
  const layers = resolveSectionLayerStyles(style, {
    verticalPadding: 'none',
    containerWidth: 'full',
    minHeight: 'auto',
  })

  return (
    <div
      className={nested ? styles.sectionNested : styles.sectionPreview}
      style={{
        ...layers.rootStyle,
        // Compact library chrome — keep theme colors, clamp layout whitespace.
        minHeight: content.length ? undefined : 52,
        maxHeight: nested ? 72 : 110,
        padding: content.length ? '8px 10px' : '10px',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden className={styles.sectionLayer} style={layers.baseColorStyle} />
      <div aria-hidden className={styles.sectionLayer} style={layers.mediaStyle} />
      <div aria-hidden className={styles.sectionLayer} style={layers.overlayStyle} />
      {layers.patternStyle.backgroundImage ? (
        <div aria-hidden className={styles.sectionLayer} style={layers.patternStyle} />
      ) : null}
      <div className={styles.sectionContent}>
        {content.length === 0 ? (
          <div className={styles.emptySlot} aria-hidden />
        ) : (
          content
            .slice(0, 3)
            .map((child: { type: string; props?: Record<string, unknown> }, index: number) =>
              previewNode(child, `section-child-${index}`),
            )
        )}
      </div>
    </div>
  )
}

/** Faithful lightweight structure preview for library cards (not a full page capture). */
export function LivePatternPreview({ record }: { record: PatternJSON }) {
  const root = record.payload.content[0]
  if (!root) {
    return (
      <Text size="xs" c="dimmed">
        Empty pattern
      </Text>
    )
  }

  if (root.type === 'Section') {
    return (
      <div inert className={styles.previewRoot}>
        <SectionStructurePreview props={root.props || {}} />
      </div>
    )
  }

  if (root.type === 'Columns') {
    return (
      <div inert className={styles.previewRoot}>
        <ColumnsStructurePreview props={root.props || {}} />
      </div>
    )
  }

  // Nested slots on composite roots still get a structure-aware pass when possible.
  const hasNestedSlots = PATTERN_SLOTS[root.type]?.some(
    (slot) => Array.isArray(root.props?.[slot]) && root.props[slot].length,
  )
  if (hasNestedSlots && root.type !== 'TextBlock') {
    return (
      <div inert className={styles.previewRoot}>
        <div className={styles.compositeFallback}>
          {PATTERN_SLOTS[root.type]
            .flatMap((slot) => (Array.isArray(root.props?.[slot]) ? root.props[slot] : []))
            .slice(0, 3)
            .map((child: { type: string; props?: Record<string, unknown> }, index: number) =>
              previewNode(child, `slot-${index}`),
            )}
        </div>
      </div>
    )
  }

  const Component = SIMPLE[root.type]
  return Component ? (
    <div inert className={styles.previewRoot}>
      <Component {...root.props} dataContext={PREVIEW_CONTEXT} />
    </div>
  ) : (
    <Text size="xs" c="dimmed">
      Live preview unavailable for {root.type}
    </Text>
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

  // Prefer captured thumbnail when available; fall back to live structure preview.
  if (visible && (!source || source === failedURL)) {
    return (
      <div ref={ref} className={styles.thumbnailFallback}>
        <LivePatternPreview record={record} />
      </div>
    )
  }

  return (
    <div ref={ref} className={styles.thumbnailFrame}>
      {showImage ? (
        <>
          {loaded !== source && (
            <div
              role="status"
              className={styles.thumbnailLoader}
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
            className={styles.thumbnailImage}
            onLoad={() => setLoaded(source)}
            onError={() => setFailedURL(source)}
          />
        </>
      ) : (
        <div role="status" aria-label={`${record.name} thumbnail deferred`} className={styles.thumbnailDeferred} />
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
