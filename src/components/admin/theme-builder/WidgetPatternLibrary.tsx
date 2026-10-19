'use client'
import React, { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
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
  Plus,
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
  serializeSelectedPattern,
  validatePatternJSON,
  type PatternJSON,
} from '@/lib/theme-engine/patterns/json'
import { PatternThumbnail, PatternPreviewModal } from './PatternPreview'
import { useMyPatterns, type MyPatternDocument } from './useMyPatterns'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import styles from './WidgetPatternLibrary.module.css'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
const usePuck = createUsePuck()
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
  if (type === 'TextBlock') return 'text'
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
  const categories = [...new Set(types.map(categoryFor))].sort((a, b) =>
    a === 'dynamic' ? 1 : b === 'dynamic' ? -1 : 0,
  )
  const active = categories.find((item) => item === category) || categories[0]
  const matches = (text: string) => text.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  const available = types.filter((type) => categoryFor(type) === active)
  const eligible = (record: PatternJSON) =>
    types.includes(record.widgetType) &&
    categoryFor(record.widgetType) === active &&
    (!widgetFilter || record.widgetType === widgetFilter) &&
    matches(`${record.name} ${record.description} ${record.category}`)
  const patterns =
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
    if (selected && getPermissions({ item: selected }).edit && canApplyWidgetPattern(pattern, selected) && beforeOperation()) {
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
      setSuccess(
        apply
          ? 'Pattern applied. Undo restores the previous design.'
          : 'Widget inserted. Undo removes this insertion.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pattern could not be applied')
    }
  }

  const defaultPattern = (type: string): WidgetDesignPattern => ({
    id: `default:${type}`,
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: [type] },
    widgetType: type,
    name: config.components[type].label || type,
    category: widgetLibraryCategory(type),
    preview: { kind: 'text', label: type },
    props: {},
    tokenReferences: [],
  })
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
  const openSave = () => {
    try {
      setEditor({ record: captureSelected() })
    } catch (error) {
      setMessage((error as Error).message)
    }
  }
  const save = async () => {
    if (!editor || busy) return
    setBusy(true)
    setMessage(null)
    try {
      validatePatternJSON(editor.record)
      const doc = await my.save(editor.record, editor.doc?.id)
      setEditor(null)
      setMyOpened(true)
      setSuccess('Pattern JSON saved. Preparing thumbnail…')
      const ready = await my.thumbnail(doc)
      setSuccess(
        ready
          ? 'Pattern saved with a WebP thumbnail.'
          : 'Pattern JSON saved. Thumbnail is unavailable; you can retry from its menu.',
      )
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
    <div className={styles.library} style={tokenStyle} data-widget-pattern-library>
      <TextInput
        aria-label="Search widgets and patterns"
        placeholder="Search widgets and patterns"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {mode === 'blocks' && (
        <Button variant="default" onClick={() => setMyOpened(true)}>
          My Patterns
        </Button>
      )}
      {mode === 'blocks' && (
        <Modal opened={myOpened} onClose={() => setMyOpened(false)} title="My Patterns" size="xl">
          <WidgetPatternLibrary
            context={context}
            themeConfig={themeConfig}
            beforeOperation={beforeOperation}
            mode="user"
          />
        </Modal>
      )}
      {selected && (
        <Button
          variant="default"
          size="sm"
          leftSection={<Bookmark size={16} />}
          onClick={openSave}
          disabled={busy}
        >
          Save as Pattern
        </Button>
      )}
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
            return (
              <React.Fragment key={name}>
                {name === 'dynamic' && (
                  <Divider my="sm" label="Dynamic Content" labelPosition="center" />
                )}
                <Button
                  fullWidth
                  variant={active === name ? 'light' : 'subtle'}
                  aria-pressed={active === name}
                  classNames={{
                    root: styles.categoryTile,
                    inner: styles.categoryInner,
                    label: styles.categoryContent,
                  }}
                  onClick={() => {
                    setCategory(name)
                    setWidgetFilter(null)
                  }}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className={styles.categoryLabel}>
                    {mode === 'theme'
                      ? config.components[types.find((type) => categoryFor(type) === name) || '']
                          ?.label || name
                      : LABELS[name] || 'Widgets'}
                  </span>
                </Button>
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
                return (
                  <Paper
                    key={doc ? `user-${doc.id}` : pattern.id}
                    withBorder
                    className={styles.card}
                    onClick={event => { if (!(event.target as HTMLElement).closest('button, a, input')) run(pattern) }}
                    onMouseEnter={() => hover(pattern)}
                    onMouseLeave={clearHover}
                  >
                    <div className={styles.preview}>
                      <PatternThumbnail record={thumbnailRecord} url={doc?.url} />
                    </div>
                    <div className={styles.overlay}>
                      <ActionIcon
                        variant="filled"
                        aria-label={`Insert ${pattern.name}`}
                        onClick={() => run(pattern)}
                      >
                        <Plus size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="default"
                        aria-label={`Preview ${pattern.name}`}
                        onClick={() =>
                          setPreview({
                            record: thumbnailRecord,
                            url: doc?.url,
                            key: doc ? `user-${doc.id}` : pattern.id,
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
                          {doc && (
                            <>
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
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </div>
                    <Stack p="sm" gap="xs">
                      <Text fw={600} size="sm">
                        {pattern.name}
                      </Text>
                      <Badge variant="light" size="sm">
                        {config.components[pattern.widgetType]?.label || 'Widget'}
                      </Badge>
                    </Stack>
                  </Paper>
                )
              })}
            </div>
            {!patterns.length && !(source === 'user' && my.loading) && (
              <Text size="sm" c="dimmed">
                {source === 'user'
                  ? 'No saved patterns match this category. Select a widget and choose Save as Pattern.'
                  : source === 'theme'
                    ? 'This theme has no patterns in this category.'
                    : 'No supported design patterns for this widget type yet. Button Design remains shell-only.'}
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
            <Divider />
            <Text fw={600}>Widgets</Text>
            {available
              .filter(
                (type) =>
                  (!widgetFilter || widgetFilter === type) &&
                  matches(config.components[type].label || ''),
              )
              .map((type) => (
                <Button
                  key={type}
                  variant="default"
                  fullWidth
                  onClick={() => run(defaultPattern(type), false)}
                >
                  Add {config.components[type].label || getWidgetManifest(type)?.label || 'Widget'}
                </Button>
              ))}
            <Text size="xs" c="dimmed">
              Click to insert. Choose a container Slot, or add a new Section at page root.
            </Text>
          </Stack>
        </div>
      </div>
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
