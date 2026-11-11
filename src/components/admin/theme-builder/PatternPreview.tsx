'use client'

import { atomManifests } from '@/widgets/atoms/manifests'
import { createAtomRenderer } from '@/widgets/atoms/frontend'
import React, { useCallback, useState } from 'react'
import { Alert, Button, Modal, Stack, Text } from '@mantine/core'
import { Image, LayoutList, Play } from 'lucide-react'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { GalleryFrontend } from '@/widgets/Gallery/frontend'
import { PostTitleFrontend } from '@/widgets/PostTitle/frontend'
import { HeaderActionFrontend } from '@/widgets/HeaderAction/frontend'
import { HeaderTopBarTextFrontend } from '@/widgets/HeaderTopBarText/frontend'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import { CategoryListPatternPreview } from '@/widgets/CategoryList/pattern-preview'
import { ContactInformationFrontend } from '@/widgets/ContactInformation/frontend'
import { sampleContactEntriesWithOrder } from '@/lib/site/contact'
import type { PatternJSON } from '@/lib/theme-engine/patterns/json'
import { isComplexPattern, PATTERN_SLOTS } from '@/lib/theme-engine/patterns/json'
import { resolveSectionLayerStyles, resolveWidgetStyles } from '@/lib/style-engine/serializer'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { CURATED_DEMO_IMAGES } from '@/lib/media/demo-catalog'
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
  CategoryList: CategoryListPatternPreview,
  ContactInformation: ContactInformationFrontend,
}

const PREVIEW_CONTEXT = {
  type: 'home' as const,
  document: { title: 'Tiêu đề minh họa' },
  item: { title: 'Nội dung minh họa', excerpt: 'Nội dung mẫu', url: '#' },
  site: { contactEntries: sampleContactEntriesWithOrder() },
}

const MEDIA_PREVIEWS: Record<string, { photo: string; ratio: number }> = {
  'image-landscape': { photo: '1470770841072-f978cf4d019e', ratio: 16 / 9 },
  'image-square': { photo: '1495474472287-4d71bcdd2085', ratio: 1 },
  'image-portrait': { photo: '1511818966892-d7d671e672a2', ratio: 3 / 4 },
  'image-rounded': { photo: '1540189549336-e6e99c3679fe', ratio: 4 / 3 },
  'image-banner': { photo: '1518837695005-2083093ee35b', ratio: 21 / 9 },
  'image-framed': { photo: '1518770660439-4636190af475', ratio: 16 / 9 },
  'video-standard': { photo: '1496062031456-07b8f162a322', ratio: 16 / 9 },
  'video-square': { photo: '1441974231531-c6227db76b6e', ratio: 1 },
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
      <Component {...node.props} previewOnly={node.type === 'Button' || undefined} dataContext={PREVIEW_CONTEXT} />
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
export function LivePatternPreview({ record, basic = false }: { record: PatternJSON; basic?: boolean }) {
  const [failedRecord, setFailedRecord] = useState<PatternJSON | null>(null)
  const root = record.payload.content[0]
  if (!root) return <NeutralPreview kind="content" />

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
  const media = record.source === 'system' ? MEDIA_PREVIEWS[record.id] : undefined
  const sample = media && CURATED_DEMO_IMAGES.find((asset) => asset.id === `unsplash-${media.photo}`)
  const sampleProps = sample
    ? root.type === 'Video'
      ? { posterUrl: sample.thumbnailURL, text: '▶', autoplay: false }
      : { src: sample.thumbnailURL, alt: sample.label }
    : undefined
  const previewProps: Record<string, unknown> = { ...root.props, ...sampleProps }
  if (!Component || failedRecord === record) return <NeutralPreview kind={root.type} />
  if (root.type === 'Image' && (basic || !previewProps.src)) return <NeutralPreview kind="Image" />
  if (root.type === 'Video' && (basic || (!previewProps.src && !previewProps.posterUrl))) {
    return <NeutralPreview kind="Video" />
  }
  if (root.type === 'Gallery' &&
      (basic || !Array.isArray(previewProps.items) || !previewProps.items.some((item) => item?.src))) {
    return <NeutralPreview kind="Gallery" />
  }

  const imagePreview = root.type === 'Image'
  const preview = (
    <Component
      {...previewProps}
      {...(imagePreview ? { objectFit: 'contain' } : undefined)}
      previewOnly={root.type === 'Button' || undefined}
      dataContext={PREVIEW_CONTEXT}
    />
  )
  return (
    <div
      inert
      className={styles.previewRoot}
      data-library-image-preview={imagePreview || undefined}
      onErrorCapture={() => setFailedRecord(record)}
    >
      {media && !imagePreview ? (
        <div style={{ width: `min(100%, ${6 * media.ratio}rem)`, marginInline: 'auto' }}>{preview}</div>
      ) : preview}
    </div>
  )
}

function NeutralPreview({ kind }: { kind: string }) {
  if (kind === 'Gallery') {
    return (
      <div className={styles.galleryPlaceholder} data-library-placeholder="Gallery" aria-hidden>
        {[0, 1, 2].map((tile) => (
          <div key={tile} className={styles.mediaPlaceholder}><Image size={22} /></div>
        ))}
      </div>
    )
  }
  const Icon = kind === 'Video' ? Play : kind === 'Image' ? Image : LayoutList
  return (
    <div className={styles.mediaPlaceholder} data-library-placeholder={kind} aria-hidden>
      <Icon size={28} />
    </div>
  )
}

function useNearViewport(enabled: boolean) {
  const [visible, setVisible] = useState(false)
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node || !enabled || visible) return
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
  return { ref, visible: !enabled || visible }
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
  const [loaded, setLoaded] = useState<string | null>(null)
  const complex = isComplexPattern(record)
  const { ref, visible } = useNearViewport(complex && !eager)

  if (!complex) return <LivePatternPreview record={record} />

  const source = url || record.thumbnail?.url
  const showImage = visible && source && source !== failedURL
  const categoryThumbnail = record.widgetType === 'CategoryList'
  const categorySize = categoryThumbnail ? (eager ? 'full' : 'card') : undefined

  return (
    <div ref={ref} className={styles.thumbnailFrame} data-category-thumbnail={categorySize}>
      {(!showImage || loaded !== source) && <LivePatternPreview record={record} />}
      {showImage && (
        <img
          key={source}
          src={source}
          alt={record.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority="low"
          className={styles.thumbnailImage}
          data-loading={loaded !== source || undefined}
          onLoad={() => setLoaded(source)}
          onError={() => setFailedURL(source)}
        />
      )}
    </div>
  )
}

export function PatternPreviewModal({
  record,
  url,
  previewKey,
  onClose,
  onCaptured,
}: {
  record: PatternJSON
  url?: string | null
  previewKey: string
  onClose: () => void
  onCaptured?: () => void
}) {
  const [live, setLive] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [captureError, setCaptureError] = useState(false)
  const [captureRevision, setCaptureRevision] = useState(0)
  const captureUrl = record.source === 'system' && record.widgetType === 'CategoryList'
    ? record.thumbnail?.url
    : undefined

  const captureThumbnail = async () => {
    if (!captureUrl) return
    setCapturing(true)
    setCaptureError(false)
    try {
      const response = await fetch(`${captureUrl}?capture=1`, { cache: 'no-store' })
      if (!response.ok) {
        setCaptureError(true)
        return
      }
      await response.blob()
      setCaptureRevision((revision) => revision + 1)
      onCaptured?.()
    } catch {
      setCaptureError(true)
    } finally {
      setCapturing(false)
    }
  }
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
            <PatternThumbnail key={captureRevision} record={record} url={url} eager />
            {captureUrl && (
              <Button variant="default" loading={capturing} onClick={captureThumbnail}>
                Generate thumbnail
              </Button>
            )}
            {captureError && <Alert color="red" role="alert">Thumbnail capture failed. Try again.</Alert>}
            <Button onClick={() => setLive(true)}>View with active theme</Button>
            <Alert>Live preview loads only when requested. It does not open another editor.</Alert>
          </>
        )}
      </Stack>
    </Modal>
  )
}
