'use client'
import React, { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Group,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
  Tooltip,
} from '@mantine/core'
import { createUsePuck } from '@puckeditor/core'
import {
  Columns3,
  Image,
  LayoutGrid,
  MousePointer2,
  Type,
  Layers,
  Database,
  MoreHorizontal,
  Bookmark,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import type { TemplateContext, ThemeConfig } from '@/lib/theme-engine/types'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import {
  getWidgetDesignPatterns,
  instantiatePattern,
  insertWidgetPattern,
  applyWidgetPattern,
  canApplyWidgetPattern,
  validatePatternOperation,
  walkPatternDocument,
  designPatternFromJSON,
  type WidgetDesignPattern,
} from '@/lib/theme-engine/widget-patterns'
import {
  isComplexPattern,
  serializeSelectedPattern,
  validatePatternJSON,
  type PatternJSON,
} from '@/lib/theme-engine/patterns/json'
import { LivePatternPreview, PatternThumbnail, PatternPreviewModal } from './PatternPreview'
import { useMyPatterns, type MyPatternDocument } from './useMyPatterns'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import styles from './WidgetPatternLibrary.module.css'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import {
  atomPriorityIndex,
  isAtomWidgetType,
  isSectionPatternCategory,
  sortAtomTypesFirst,
  sortLibraryCategories,
} from '@/lib/theme-engine/patterns/atom-presets'
const usePuck = createUsePuck()

const OVERLAY_WIDTH_KEY = 'zyvavu.builder.libraryOverlayWidth'
const OVERLAY_DEFAULT = 440
const OVERLAY_MIN = 320
const OVERLAY_MAX = 650
function readOverlayWidth() {
  if (typeof window === 'undefined') return OVERLAY_DEFAULT
  const raw = Number(window.localStorage.getItem(OVERLAY_WIDTH_KEY))
  if (!Number.isFinite(raw)) return OVERLAY_DEFAULT
  return Math.min(OVERLAY_MAX, Math.max(OVERLAY_MIN, Math.round(raw)))
}
function clampOverlayWidth(
  width: number,
  viewport = typeof window !== 'undefined' ? window.innerWidth : 1280,
) {
  const maxByViewport = Math.max(OVERLAY_MIN, Math.min(OVERLAY_MAX, viewport - 120))
  return Math.min(maxByViewport, Math.max(OVERLAY_MIN, Math.round(width)))
}
export function widgetLibraryCategory(type: string) {
  const manifest = getWidgetManifest(type)
  if (
    manifest?.capabilities.some((capability) =>
      /^(document|archive|item|site|product)\./.test(capability),
    )
  )
    return 'dynamic'
  if (type === 'Section') return 'sections'
  if (type === 'Columns') return 'layout'
  if (['Heading', 'Text', 'TextBlock'].includes(type)) return 'text'
  if (type === 'Image') return 'images'
  if (type === 'Button') return 'buttons'
  return manifest?.category || 'general'
}
const LABELS: Record<string, string> = {
  sections: 'Sections',
  layout: 'Layout',
  text: 'Text',
  images: 'Images',
  buttons: 'Buttons',
  general: 'Widgets',
  dynamic: 'Nội dung động',
}
const ICONS: Record<string, React.ElementType> = {
  sections: Layers,
  layout: Columns3,
  text: Type,
  images: Image,
  buttons: MousePointer2,
  dynamic: Database,
}
export function WidgetPatternLibrary({
  context,
  themeConfig,
  beforeOperation,
  mode = 'blocks',
}: {
  mode?: 'blocks' | 'theme' | 'user'
  context?: string
  themeConfig?: ThemeConfig
  beforeOperation: () => boolean
}) {
  const config = usePuck((state) => state.config)
  const data = usePuck((state) => state.appState.data)
  const selected = usePuck((state) => state.selectedItem)
  const dispatch = usePuck((state) => state.dispatch)
  const getPermissions = usePuck((state) => state.getPermissions)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const source = mode === 'user' ? 'user' : mode === 'theme' ? 'theme' : 'system'
  const [myOpened, setMyOpened] = useState(false)
  const overlayLayout = mode !== 'user'
  const [expanded, setExpanded] = useState(true)
  const [overlayWidth, setOverlayWidth] = useState(OVERLAY_DEFAULT)
  const [widgetFilter, setWidgetFilter] = useState<string | null>(null)
  const [destination, setDestination] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<{
    record: PatternJSON
    url?: string | null
    key: string
  } | null>(null)
  const [editor, setEditor] = useState<{ record: PatternJSON; doc?: MyPatternDocument } | null>(
    null,
  )
  const [confirm, setConfirm] = useState<{
    kind: 'delete' | 'update'
    doc: MyPatternDocument
  } | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const my = useMyPatterns(search, source === 'user')
  const types = Object.keys(config.components).filter(
    (type) =>
      mode === 'user' ||
      (mode === 'theme'
        ? !!systemDescriptor(type) || type === 'PostContent' || type === 'CollectionLoop'
        : !systemDescriptor(type) &&
          !['PostTitle', 'PostContent', 'PostMeta', 'FeaturedMedia', 'CategoryHeader'].includes(
            type,
          )),
  )
  const categoryFor = (type: string) =>
    mode === 'theme'
      ? systemDescriptor(type)?.role ||
        (type === 'PostContent' ? 'document.content' : 'archive.content')
      : widgetLibraryCategory(type)
  const categories = sortLibraryCategories([...new Set(types.map(categoryFor))])
  const active = categories.find((item) => item === category) || categories[0]
  const matches = (text: string) => text.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  const searching = search.trim().length > 0
  const available = sortAtomTypesFirst(
    types.filter((type) => categoryFor(type) === active),
  )
  const eligible = (record: PatternJSON) =>
    types.includes(record.widgetType) &&
    categoryFor(record.widgetType) === active &&
    (!widgetFilter || record.widgetType === widgetFilter) &&
    matches(`${record.name} ${record.description} ${record.category} ${record.widgetType}`)
  const patterns = (
    source === 'user'
      ? my.docs
          .map((doc) => ({ pattern: designPatternFromJSON(doc.record), doc }))
          .filter(({ pattern }) => eligible(pattern.canonical!))
      : getWidgetDesignPatterns()
          .filter(
            (pattern) =>
              pattern.canonical &&
              (mode === 'theme' ? true : pattern.canonical.source === source) &&
              eligible(pattern.canonical),
          )
          .map((pattern) => ({ pattern, doc: undefined as MyPatternDocument | undefined }))
  ).slice()
  // Atom-first only for default browse; Patterns/layout categories and search keep natural order.
  if (!searching && !isSectionPatternCategory(active) && mode !== 'theme') {
    patterns.sort((a, b) => {
      const aType = a.pattern.widgetType
      const bType = b.pattern.widgetType
      const ai = isAtomWidgetType(aType) ? atomPriorityIndex(aType) : 100
      const bi = isAtomWidgetType(bType) ? atomPriorityIndex(bType) : 100
      if (ai !== bi) return ai - bi
      return a.pattern.name.localeCompare(b.pattern.name)
    })
  }
  const basicTypes = available.filter(
    (type) =>
      (!widgetFilter || widgetFilter === type) &&
      matches(
        `${config.components[type].label || ''} ${getWidgetManifest(type)?.label || ''} ${type}`,
      ),
  )
  // Prefer atoms when opening a mixed category; section/layout browse stays pattern-led.
  const orderedBasics =
    searching || isSectionPatternCategory(active) ? basicTypes : sortAtomTypesFirst(basicTypes)
  const slots = selected
    ? Object.entries(config.components[selected.type]?.fields || {})
        .filter(([, field]) => field.type === 'slot')
        .map(([key]) => key)
    : []
  const effectiveDestination = slots.includes(destination || '') ? destination : slots[0] || null
  const tokenStyle = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(themeConfig?.tokens.colors || {})
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [`--zyvavu-theme-${key}`, value]),
      ) as React.CSSProperties,
    [themeConfig],
  )

  React.useEffect(() => {
    setOverlayWidth(readOverlayWidth())
  }, [])
  React.useEffect(() => {
    if (!overlayLayout || !expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlayLayout, expanded])
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = overlayWidth
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const onMove = (move: PointerEvent) => {
      const next = clampOverlayWidth(startWidth + (move.clientX - startX))
      setOverlayWidth(next)
    }
    const onUp = (up: PointerEvent) => {
      target.releasePointerCapture(up.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setOverlayWidth((current) => {
        const next = clampOverlayWidth(current)
        window.localStorage.setItem(OVERLAY_WIDTH_KEY, String(next))
        return next
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const hoverId = React.useRef<string | null>(null)
  const clearHover = () => {
    if (hoverId.current) stylePreviewStore.clearPreview(hoverId.current)
    hoverId.current = null
  }
  React.useEffect(
    () => () => {
      if (hoverId.current) stylePreviewStore.clearPreview(hoverId.current)
    },
    [selected?.props.id],
  )
  const hover = (pattern: WidgetDesignPattern) => {
    clearHover()
    if (
      selected &&
      getPermissions({ item: selected }).edit &&
      canApplyWidgetPattern(pattern, selected) &&
      beforeOperation()
    ) {
      hoverId.current = selected.props.id
      stylePreviewStore.setPreview(selected.props.id, {
        ...selected.props.style,
        ...pattern.props.style,
      })
    }
  }
  const run = (
    pattern: WidgetDesignPattern,
    apply = !!selected && canApplyWidgetPattern(pattern, selected),
  ) => {
    clearHover()
    setMessage(null)
    setSuccess(null)
    if (!context) {
      setMessage('Pattern insertion is available in Theme Builder templates.')
      return
    }
    if (!beforeOperation()) {
      setMessage('Apply or cancel the active style draft first.')
      return
    }
    try {
      if (apply && (!selected || !getPermissions({ item: selected }).edit))
        throw new Error('The selected widget cannot be edited')
      if (!apply && !getPermissions({ type: pattern.widgetType }).insert)
        throw new Error('This widget cannot be inserted')
      if (
        !apply &&
        selected &&
        effectiveDestination &&
        (!getPermissions({ item: selected }).edit || selected.props.lock?.canEditProps === false)
      )
        throw new Error('The selected container is locked')
      const newId = () => crypto.randomUUID()
      const item = apply ? undefined : instantiatePattern(pattern, config, newId)
      if (item) {
        walkPatternDocument({ root: data.root, content: [item] }, config, (node) => {
          if (!getPermissions({ type: node.type }).insert)
            throw new Error('A nested widget cannot be inserted')
        })
        if (
          !effectiveDestination &&
          item.type !== 'Section' &&
          config.components.Section &&
          !getPermissions({ type: 'Section' }).insert
        )
          throw new Error('Section insertion is not permitted')
      }
      const next = apply
        ? applyWidgetPattern(data, pattern, selected!.props.id, config)
        : insertWidgetPattern(
            data,
            item,
            context as TemplateContext,
            config,
            selected && effectiveDestination && item.type !== 'Section'
              ? { ownerId: selected.props.id, slot: effectiveDestination }
              : undefined,
            newId,
          )
      validatePatternOperation(next, data, context as TemplateContext, config)
      dispatch({ type: 'setData', data: next })
      setSelectedCard(pattern.id)
      setSuccess(
        apply
          ? 'Pattern applied. Undo restores the previous design.'
          : 'Widget inserted. Undo removes this insertion.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pattern could not be applied')
    }
  }

  const defaultPattern = (type: string): WidgetDesignPattern =>
    type === 'TextBlock'
      ? getWidgetDesignPatterns().find((record) => record.id === 'text-editorial')!
      : {
          id: `default:${type}`,
          version: 1,
          compatibility: { builderVersion: 1, widgetTypes: [type] },
          widgetType: type,
          name: config.components[type].label || type,
          category: widgetLibraryCategory(type),
          preview: { kind: 'text', label: type },
          props: {},
          tokenReferences: [],
        }
  const captureSelected = (metadata?: PatternJSON) => {
    if (!selected || !beforeOperation())
      throw new Error('Select a widget and apply or cancel any style draft first.')
    return serializeSelectedPattern(data, selected.props.id, {
      id: metadata?.id || `user-${crypto.randomUUID()}`,
      name: metadata?.name || `${config.components[selected.type]?.label || 'Widget'} pattern`,
      description: metadata?.description || '',
      category: metadata?.category || LABELS[widgetLibraryCategory(selected.type)] || 'Widgets',
      ...(context ? { context: context as TemplateContext } : {}),
    })
  }
  const save = async () => {
    if (!editor || busy) return
    setBusy(true)
    setMessage(null)
    try {
      validatePatternJSON(editor.record)
      const doc = await my.save(editor.record, editor.doc?.id)
      setEditor(null)
      setSuccess('Pattern saved to My Patterns.')
      await my.thumbnail(doc)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const confirmAction = async () => {
    if (!confirm || busy) return
    setBusy(true)
    setMessage(null)
    try {
      if (confirm.kind === 'delete') {
        await my.remove(confirm.doc.id)
        setSuccess('Pattern deleted. Existing page instances are unchanged.')
      } else {
        const record = captureSelected(confirm.doc.record)
        const doc = await my.save(record, confirm.doc.id)
        setConfirm(null)
        setSuccess('Pattern JSON updated. Existing page instances are unchanged.')
        await my.thumbnail(doc)
      }
      setConfirm(null)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className={styles.library}
      style={tokenStyle}
      data-widget-pattern-library
      data-layout={overlayLayout ? 'overlay' : 'flat'}
      data-expanded={overlayLayout && expanded ? 'true' : undefined}
    >
      {overlayLayout ? (
        <>
          <div className={styles.rail}>
          <nav className={styles.categories} aria-label="Widget categories">
            {categories.map((name) => {
              const Icon = ICONS[name] || LayoutGrid
              const label =
                mode === 'theme'
                  ? config.components[types.find((type) => categoryFor(type) === name) || '']
                      ?.label || name
                  : LABELS[name] || 'Widgets'
              return (
                <React.Fragment key={name}>
                  {name === 'dynamic' && <Divider className={styles.categoryDivider} />}
                  <Tooltip
                    label={label}
                    position="right"
                    withinPortal
                    zIndex={ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN}
                    events={{ hover: true, focus: true, touch: false }}
                  >
                    <ActionIcon
                      size="xl"
                      variant={active === name ? 'light' : 'subtle'}
                      aria-label={label}
                      aria-pressed={active === name}
                      className={styles.categoryTile}
                      onClick={() => {
                        setCategory(name)
                        setWidgetFilter(null)
                        if (overlayLayout) setExpanded(true)
                      }}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </ActionIcon>
                  </Tooltip>
                </React.Fragment>
              )
            })}
          </nav>

          {mode === 'blocks' && (
            <Tooltip
              label="My Patterns"
              position="right"
              withinPortal
              zIndex={ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN}
            >
              <ActionIcon
                size="xl"
                variant="subtle"
                aria-label="My Patterns"
                onClick={() => setMyOpened(true)}
              >
                <Bookmark size={22} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip
            label={expanded ? 'Collapse library' : 'Expand library'}
            position="right"
            withinPortal
            zIndex={ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN}
          >
            <ActionIcon
              size="xl"
              variant="subtle"
              aria-label={expanded ? 'Collapse library' : 'Expand library'}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <PanelLeftClose size={22} aria-hidden="true" />
              ) : (
                <PanelLeftOpen size={22} aria-hidden="true" />
              )}
            </ActionIcon>
          </Tooltip>
          </div>
          {expanded && (
            <div
              className={styles.overlay}
              style={{ width: overlayWidth }}
              role="region"
              aria-label="Widget library"
            >
              <div className={styles.overlayHeader}>
                <Text fw={600} size="sm">
                  {LABELS[active] || active}
                </Text>
                <ActionIcon
                  variant="subtle"
                  aria-label="Collapse library"
                  onClick={() => setExpanded(false)}
                >
                  <PanelLeftClose size={18} aria-hidden="true" />
                </ActionIcon>
              </div>
              <div className={styles.overlayBody}>
          <TextInput
            aria-label="Search widgets and patterns"
            placeholder="Search widgets and patterns"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {message && (
            <Alert color="red" role="alert">
              {message}
            </Alert>
          )}
          {success && <Alert role="status">{success}</Alert>}
          {source === 'user' && my.error && (
            <Alert color="red" role="alert">
              My Patterns could not be loaded. {my.error}
              <Button variant="subtle" size="sm" onClick={my.reload}>
                Retry
              </Button>
            </Alert>
          )}
          {slots.length > 0 && (
            <Select
              label="Insert into selected container"
              value={effectiveDestination}
              data={slots}
              onChange={setDestination}
            />
          )}
            <div className={styles.results}>
              <Stack gap="sm">
                {active === 'dynamic' && (
                  <Text fw={600} size="sm">
                    Dynamic Content / Nội dung động
                  </Text>
                )}
                {available.length > 1 && (
                  <Select
                    aria-label="Filter widget type"
                    placeholder="All widget types"
                    clearable
                    value={widgetFilter}
                    onChange={setWidgetFilter}
                    data={available.map((type) => ({
                      value: type,
                      label:
                        config.components[type].label || getWidgetManifest(type)?.label || 'Widget',
                    }))}
                  />
                )}
                {source === 'user' && my.loading && (
                  <Group gap="xs" role="status">
                    <Loader size="sm" />
                    <Text size="xs">Loading My Patterns…</Text>
                  </Group>
                )}
                {(() => {
                  const isTextLibrary = active === 'text'
                  const renderBasicCard = (type: string) => {
                    const label =
                      config.components[type].label || getWidgetManifest(type)?.label || type
                    const pattern = defaultPattern(type)
                    const record =
                      pattern.canonical ||
                      ({
                        schemaVersion: 1,
                        id: pattern.id,
                        name: pattern.name,
                        description: '',
                        category: pattern.category,
                        widgetType: type,
                        source: 'system',
                        version: 1,
                        payload: {
                          content: [
                            {
                              type,
                              props: {
                                id: `${pattern.id}-root`,
                                ...structuredClone(config.components[type].defaultProps || {}),
                                ...(pattern.props.style ? { style: pattern.props.style } : {}),
                              },
                            },
                          ],
                          zones: {},
                        },
                        theme: { tokens: [] },
                      } satisfies PatternJSON)
                    const cardId = pattern.id
                    // Card UI is preview-only; name stays on aria-label for a11y/search.
                    return (
                      <div
                        key={cardId}
                        className={styles.card}
                        data-selected={selectedCard === cardId || undefined}
                      >
                        <UnstyledButton
                          className={styles.insertTile}
                          aria-label={`Insert ${label}`}
                          title={label}
                          onClick={() => run(pattern, false)}
                        >
                          <div className={styles.preview}>
                            {isComplexPattern(record) ? (
                              <Text size="sm" c="dimmed">
                                {label} container
                              </Text>
                            ) : (
                              <LivePatternPreview record={record} />
                            )}
                          </div>
                        </UnstyledButton>
                      </div>
                    )
                  }

                  // Text library: one continuous Heading+Text list (no Basic / Styled split).
                  if (isTextLibrary) {
                    return (
                      <>
                        <Text className={styles.groupLabel} fw={600} size="sm">
                          Text
                        </Text>
                        <div className={styles.cards}>
                          {orderedBasics.map((type) => renderBasicCard(type))}
                          {patterns.map(({ pattern, doc }) => {
                            const record = pattern.canonical!
                            const thumbnailRecord = doc
                              ? {
                                  ...record,
                                  thumbnail: {
                                    version: record.version,
                                    status:
                                      doc.thumbnailStatus === 'ready'
                                        ? ('ready' as const)
                                        : doc.thumbnailStatus === 'failed'
                                          ? ('failed' as const)
                                          : ('pending' as const),
                                  },
                                }
                              : record
                            const cardId = doc ? `user-${doc.id}` : pattern.id
                            return (
                              <div
                                key={cardId}
                                className={styles.card}
                                data-selected={selectedCard === pattern.id || undefined}
                                onMouseEnter={() => hover(pattern)}
                                onMouseLeave={clearHover}
                              >
                                <UnstyledButton
                                  className={styles.insertTile}
                                  aria-label={`Insert ${pattern.name}`}
                                  title={pattern.name}
                                  onClick={() => run(pattern)}
                                >
                                  <div className={styles.preview}>
                                    <PatternThumbnail record={thumbnailRecord} url={doc?.url} />
                                  </div>
                                </UnstyledButton>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )
                  }

                  return (
                    <>
                      {orderedBasics.length > 0 && (
                        <>
                          <Text className={styles.groupLabel} fw={600} size="sm">
                            Basic
                          </Text>
                          <div className={styles.cards}>
                            {orderedBasics.map((type) => renderBasicCard(type))}
                          </div>
                        </>
                      )}
                      <Text className={styles.groupLabel} fw={600} size="sm">
                        Styled Presets
                      </Text>
                      <div className={styles.cards}>
                        {patterns.map(({ pattern, doc }) => {
                    const record = pattern.canonical!
                    const thumbnailRecord = doc
                      ? {
                          ...record,
                          thumbnail: {
                            version: record.version,
                            status:
                              doc.thumbnailStatus === 'ready'
                                ? ('ready' as const)
                                : doc.thumbnailStatus === 'failed'
                                  ? ('failed' as const)
                                  : ('pending' as const),
                          },
                        }
                      : record
                    const cardId = doc ? `user-${doc.id}` : pattern.id
                    return (
                      <div
                        key={cardId}
                        className={styles.card}
                        data-selected={selectedCard === pattern.id || undefined}
                        onMouseEnter={() => hover(pattern)}
                        onMouseLeave={clearHover}
                      >
                        <UnstyledButton
                          className={styles.insertTile}
                          aria-label={`Insert ${pattern.name}`}
                          title={pattern.name}
                          onClick={() => run(pattern)}
                        >
                          <div className={styles.preview}>
                            <PatternThumbnail record={thumbnailRecord} url={doc?.url} />
                          </div>
                        </UnstyledButton>
                        {doc && (
                          <div className={styles.management}>
                            <ActionIcon
                              variant="default"
                              aria-label={`Preview ${pattern.name}`}
                              onClick={() =>
                                setPreview({
                                  record: thumbnailRecord,
                                  url: doc?.url,
                                  key: cardId,
                                })
                              }
                            >
                              <Eye size={18} />
                            </ActionIcon>
                            <Menu withinPortal zIndex={ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN}>
                              <Menu.Target>
                                <ActionIcon
                                  variant="default"
                                  aria-label={`More actions for ${pattern.name}`}
                                >
                                  <MoreHorizontal size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  disabled={
                                    !selected ||
                                    !canApplyWidgetPattern(pattern, selected) ||
                                    selected.props.lock?.canEditProps === false
                                  }
                                  onClick={() => run(pattern, true)}
                                >
                                  Apply design to selected
                                </Menu.Item>
                                <Menu.Item
                                  disabled={busy}
                                  onClick={() => setEditor({ record: doc.record, doc })}
                                >
                                  Edit metadata / Rename
                                </Menu.Item>
                                <Menu.Item
                                  disabled={busy || !selected}
                                  onClick={() => setConfirm({ kind: 'update', doc })}
                                >
                                  Update from selected widget
                                </Menu.Item>
                                <Menu.Item
                                  disabled={busy}
                                  onClick={() => {
                                    setBusy(true)
                                    void my.thumbnail(doc).finally(() => setBusy(false))
                                  }}
                                >
                                  Retry thumbnail
                                </Menu.Item>
                                <Menu.Item
                                  color="red"
                                  disabled={busy}
                                  onClick={() => setConfirm({ kind: 'delete', doc })}
                                >
                                  Delete
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </div>
                        )}
                      </div>
                    )
                  })}
                      </div>
                    </>
                  )
                })()}
                {!patterns.length && !(source === 'user' && my.loading) && (
                  <Text size="sm" c="dimmed">
                    {source === 'user'
                      ? 'No saved patterns match this category. Select a widget and use Save as Pattern from the ActionBar menu.'
                      : source === 'theme'
                        ? 'This theme has no patterns in this category.'
                        : 'No styled presets match this filter.'}
                  </Text>
                )}
                {source === 'user' && my.page < my.totalPages && (
                  <Button
                    variant="default"
                    onClick={() => {
                      void my.loadMore().catch((error) => setMessage(error.message))
                    }}
                  >
                    Load more patterns
                  </Button>
                )}
                <Text size="xs" c="dimmed">
                  Click a card to insert. Choose a container Slot, or add a new Section at page root.
                </Text>
              </Stack>
            </div>
              </div>
              <div
                className={styles.resizeHandle}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize library"
                aria-valuemin={OVERLAY_MIN}
                aria-valuemax={OVERLAY_MAX}
                aria-valuenow={overlayWidth}
                tabIndex={0}
                onPointerDown={startResize}
              />
            </div>
          )}
          {mode === 'blocks' && (
            <Modal
              opened={myOpened}
              onClose={() => setMyOpened(false)}
              title="My Patterns"
              size="xl"
              zIndex={ADMIN_OVERLAY_LAYERS.STYLE_MODAL}
              styles={{ body: { minHeight: 420 } }}
            >
              {myOpened && (
                <WidgetPatternLibrary
                  context={context}
                  themeConfig={themeConfig}
                  beforeOperation={beforeOperation}
                  mode="user"
                />
              )}
            </Modal>
          )}
        </>
      ) : (
        <>
        <TextInput
          aria-label="Search widgets and patterns"
          placeholder="Search widgets and patterns"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        {message && (
          <Alert color="red" role="alert">
            {message}
          </Alert>
        )}
        {success && <Alert role="status">{success}</Alert>}
        {source === 'user' && my.error && (
          <Alert color="red" role="alert">
            My Patterns could not be loaded. {my.error}
            <Button variant="subtle" size="sm" onClick={my.reload}>
              Retry
            </Button>
          </Alert>
        )}
        {slots.length > 0 && (
          <Select
            label="Insert into selected container"
            value={effectiveDestination}
            data={slots}
            onChange={setDestination}
          />
        )}
          <div className={styles.columns}>
          <nav className={styles.categories} aria-label="Widget categories">
            {categories.map((name) => {
              const Icon = ICONS[name] || LayoutGrid
              const label = LABELS[name] || 'Widgets'
              return (
                <React.Fragment key={name}>
                  {name === 'dynamic' && <Divider className={styles.categoryDivider} />}
                  <Tooltip
                    label={label}
                    position="right"
                    withinPortal
                    zIndex={ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN}
                    events={{ hover: true, focus: true, touch: false }}
                  >
                    <ActionIcon
                      size="xl"
                      variant={active === name ? 'light' : 'subtle'}
                      aria-label={label}
                      aria-pressed={active === name}
                      className={styles.categoryTile}
                      onClick={() => {
                        setCategory(name)
                        setWidgetFilter(null)
                      }}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </ActionIcon>
                  </Tooltip>
                </React.Fragment>
              )
            })}
          </nav>
          <div className={styles.results}>
            <Stack gap="sm">
              {active === 'dynamic' && (
                <Text fw={600} size="sm">
                  Dynamic Content / Nội dung động
                </Text>
              )}
              {available.length > 1 && (
                <Select
                  aria-label="Filter widget type"
                  placeholder="All widget types"
                  clearable
                  value={widgetFilter}
                  onChange={setWidgetFilter}
                  data={available.map((type) => ({
                    value: type,
                    label:
                      config.components[type].label || getWidgetManifest(type)?.label || 'Widget',
                  }))}
                />
              )}
              {source === 'user' && my.loading && (
                <Group gap="xs" role="status">
                  <Loader size="sm" />
                  <Text size="xs">Loading My Patterns…</Text>
                </Group>
              )}
              {(() => {
                const isTextLibrary = active === 'text'
                const renderBasicCard = (type: string) => {
                  const label =
                    config.components[type].label || getWidgetManifest(type)?.label || type
                  const pattern = defaultPattern(type)
                  const record =
                    pattern.canonical ||
                    ({
                      schemaVersion: 1,
                      id: pattern.id,
                      name: pattern.name,
                      description: '',
                      category: pattern.category,
                      widgetType: type,
                      source: 'system',
                      version: 1,
                      payload: {
                        content: [
                          {
                            type,
                            props: {
                              id: `${pattern.id}-root`,
                              ...structuredClone(config.components[type].defaultProps || {}),
                              ...(pattern.props.style ? { style: pattern.props.style } : {}),
                            },
                          },
                        ],
                        zones: {},
                      },
                      theme: { tokens: [] },
                    } satisfies PatternJSON)
                  const cardId = pattern.id
                  // Card UI is preview-only; name stays on aria-label for a11y/search.
                  return (
                    <div
                      key={cardId}
                      className={styles.card}
                      data-selected={selectedCard === cardId || undefined}
                    >
                      <UnstyledButton
                        className={styles.insertTile}
                        aria-label={`Insert ${label}`}
                        title={label}
                        onClick={() => run(pattern, false)}
                      >
                        <div className={styles.preview}>
                          {isComplexPattern(record) ? (
                            <Text size="sm" c="dimmed">
                              {label} container
                            </Text>
                          ) : (
                            <LivePatternPreview record={record} />
                          )}
                        </div>
                      </UnstyledButton>
                    </div>
                  )
                }

                // Text library: one continuous Heading+Text list (no Basic / Styled split).
                if (isTextLibrary) {
                  return (
                    <>
                      <Text className={styles.groupLabel} fw={600} size="sm">
                        Text
                      </Text>
                      <div className={styles.cards}>
                        {orderedBasics.map((type) => renderBasicCard(type))}
                        {patterns.map(({ pattern, doc }) => {
                          const record = pattern.canonical!
                          const thumbnailRecord = doc
                            ? {
                                ...record,
                                thumbnail: {
                                  version: record.version,
                                  status:
                                    doc.thumbnailStatus === 'ready'
                                      ? ('ready' as const)
                                      : doc.thumbnailStatus === 'failed'
                                        ? ('failed' as const)
                                        : ('pending' as const),
                                },
                              }
                            : record
                          const cardId = doc ? `user-${doc.id}` : pattern.id
                          return (
                            <div
                              key={cardId}
                              className={styles.card}
                              data-selected={selectedCard === pattern.id || undefined}
                              onMouseEnter={() => hover(pattern)}
                              onMouseLeave={clearHover}
                            >
                              <UnstyledButton
                                className={styles.insertTile}
                                aria-label={`Insert ${pattern.name}`}
                                title={pattern.name}
                                onClick={() => run(pattern)}
                              >
                                <div className={styles.preview}>
                                  <PatternThumbnail record={thumbnailRecord} url={doc?.url} />
                                </div>
                              </UnstyledButton>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                }

                return (
                  <>
                    {orderedBasics.length > 0 && (
                      <>
                        <Text className={styles.groupLabel} fw={600} size="sm">
                          Basic
                        </Text>
                        <div className={styles.cards}>
                          {orderedBasics.map((type) => renderBasicCard(type))}
                        </div>
                      </>
                    )}
                    <Text className={styles.groupLabel} fw={600} size="sm">
                      Styled Presets
                    </Text>
                    <div className={styles.cards}>
                      {patterns.map(({ pattern, doc }) => {
                  const record = pattern.canonical!
                  const thumbnailRecord = doc
                    ? {
                        ...record,
                        thumbnail: {
                          version: record.version,
                          status:
                            doc.thumbnailStatus === 'ready'
                              ? ('ready' as const)
                              : doc.thumbnailStatus === 'failed'
                                ? ('failed' as const)
                                : ('pending' as const),
                        },
                      }
                    : record
                  const cardId = doc ? `user-${doc.id}` : pattern.id
                  return (
                    <div
                      key={cardId}
                      className={styles.card}
                      data-selected={selectedCard === pattern.id || undefined}
                      onMouseEnter={() => hover(pattern)}
                      onMouseLeave={clearHover}
                    >
                      <UnstyledButton
                        className={styles.insertTile}
                        aria-label={`Insert ${pattern.name}`}
                        title={pattern.name}
                        onClick={() => run(pattern)}
                      >
                        <div className={styles.preview}>
                          <PatternThumbnail record={thumbnailRecord} url={doc?.url} />
                        </div>
                      </UnstyledButton>
                      {doc && (
                        <div className={styles.management}>
                          <ActionIcon
                            variant="default"
                            aria-label={`Preview ${pattern.name}`}
                            onClick={() =>
                              setPreview({
                                record: thumbnailRecord,
                                url: doc?.url,
                                key: cardId,
                              })
                            }
                          >
                            <Eye size={18} />
                          </ActionIcon>
                          <Menu withinPortal zIndex={ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN}>
                            <Menu.Target>
                              <ActionIcon
                                variant="default"
                                aria-label={`More actions for ${pattern.name}`}
                              >
                                <MoreHorizontal size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                disabled={
                                  !selected ||
                                  !canApplyWidgetPattern(pattern, selected) ||
                                  selected.props.lock?.canEditProps === false
                                }
                                onClick={() => run(pattern, true)}
                              >
                                Apply design to selected
                              </Menu.Item>
                              <Menu.Item
                                disabled={busy}
                                onClick={() => setEditor({ record: doc.record, doc })}
                              >
                                Edit metadata / Rename
                              </Menu.Item>
                              <Menu.Item
                                disabled={busy || !selected}
                                onClick={() => setConfirm({ kind: 'update', doc })}
                              >
                                Update from selected widget
                              </Menu.Item>
                              <Menu.Item
                                disabled={busy}
                                onClick={() => {
                                  setBusy(true)
                                  void my.thumbnail(doc).finally(() => setBusy(false))
                                }}
                              >
                                Retry thumbnail
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                disabled={busy}
                                onClick={() => setConfirm({ kind: 'delete', doc })}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </div>
                      )}
                    </div>
                  )
                })}
                    </div>
                  </>
                )
              })()}
              {!patterns.length && !(source === 'user' && my.loading) && (
                <Text size="sm" c="dimmed">
                  {source === 'user'
                    ? 'No saved patterns match this category. Select a widget and use Save as Pattern from the ActionBar menu.'
                    : source === 'theme'
                      ? 'This theme has no patterns in this category.'
                      : 'No styled presets match this filter.'}
                </Text>
              )}
              {source === 'user' && my.page < my.totalPages && (
                <Button
                  variant="default"
                  onClick={() => {
                    void my.loadMore().catch((error) => setMessage(error.message))
                  }}
                >
                  Load more patterns
                </Button>
              )}
              <Text size="xs" c="dimmed">
                Click a card to insert. Choose a container Slot, or add a new Section at page root.
              </Text>
            </Stack>
          </div>
          </div>
        </>
      )}
      {preview && (
        <PatternPreviewModal
          key={preview.key}
          record={preview.record}
          url={preview.url}
          previewKey={preview.key}
          onClose={() => setPreview(null)}
        />
      )}
      <Modal
        opened={!!editor}
        onClose={() => {
          if (!busy) setEditor(null)
        }}
        title={editor?.doc ? 'Edit pattern metadata' : 'Save as Pattern'}
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
      >
        {editor && (
          <Stack>
            <TextInput
              label="Pattern name"
              required
              maxLength={120}
              value={editor.record.name}
              onChange={(event) => {
                const name = event.currentTarget.value
                setEditor({ ...editor, record: { ...editor.record, name } })
              }}
            />
            <TextInput
              label="Category"
              maxLength={80}
              value={editor.record.category}
              onChange={(event) => {
                const category = event.currentTarget.value
                setEditor({ ...editor, record: { ...editor.record, category } })
              }}
            />
            <Textarea
              label="Description"
              maxLength={1000}
              value={editor.record.description}
              onChange={(event) => {
                const description = event.currentTarget.value
                setEditor({ ...editor, record: { ...editor.record, description } })
              }}
            />
            <Group justify="flex-end">
              <Button variant="default" disabled={busy} onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                disabled={!editor.record.name.trim()}
                onClick={() => {
                  void save()
                }}
              >
                Save pattern JSON
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      <Modal
        opened={!!confirm}
        onClose={() => {
          if (!busy) setConfirm(null)
        }}
        title={
          confirm?.kind === 'delete' ? 'Delete pattern?' : 'Update pattern from selected widget?'
        }
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
      >
        <Stack>
          <Text>
            {confirm?.kind === 'delete'
              ? 'Delete this saved pattern? Existing page instances will remain unchanged.'
              : 'Replace the saved subtree with the currently selected widget and its Slots? Existing page instances will remain unchanged.'}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              color={confirm?.kind === 'delete' ? 'red' : undefined}
              loading={busy}
              onClick={() => {
                void confirmAction()
              }}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}
