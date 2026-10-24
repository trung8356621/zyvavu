'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  Puck,
  ActionBar,
  type Config,
  type Data,
  type Plugin,
  type Viewport,
  createUsePuck,
} from '@puckeditor/core'
import '@puckeditor/core/dist/index.css'
import { Alert, Box, Button, Group, LoadingOverlay, Text, Menu, ActionIcon } from '@mantine/core'
import {
  Check,
  AlertCircle,
  Palette,
  Save,
  Sliders,
  Play,
  LayoutGrid,
  Square,
  MoreHorizontal,
  Settings,
  Link as LinkIcon,
} from 'lucide-react'

import { CURRENT_BUILDER_VERSION, validateBuilderDocument } from './document'
import type { BuilderDocument } from './types'
import type { ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import {
  getComponentStyleCapabilities,
  normalizeComponentType,
} from '@/lib/style-engine/capabilities'
import { PageSettingsPanel } from '@/components/admin/theme-builder/PageSettingsPanel'
import {
  WidgetStyleContextMenu,
  computeTranslatedAnchorPosition,
} from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import {
  getStyleModalDomains,
  STYLE_MODAL_TITLES,
  type StyleModalDomain,
} from '@/lib/style-engine/domains'
import { WidgetPatternLibrary } from '@/components/admin/theme-builder/WidgetPatternLibrary'
import actionBarStyles from './WidgetActionBar.module.css'
import { ImageQuickAction } from './ImageQuickAction'
import { useToolbarBoundary } from './useToolbarBoundary'

import { AtomModal, type AtomModalRequest } from '@/components/admin/theme-builder/AtomModals'
import { ATOM_TYPES, hasThemeLibrary } from '@/lib/theme-engine/widget-contracts'

const usePuck = createUsePuck()

export const DESKTOP_ONLY_VIEWPORT: Viewport[] = [
  { width: '100%', height: 'auto', label: 'Desktop', icon: 'Monitor' },
]

export const RESPONSIVE_VIEWPORTS: Viewport[] = [
  { width: 360, height: 'auto', label: 'Mobile', icon: 'Smartphone' },
  { width: 768, height: 'auto', label: 'Tablet', icon: 'Tablet' },
  { width: '100%', height: 'auto', label: 'Desktop', icon: 'Monitor' },
]

export const MEGA_MENU_VIEWPORTS = DESKTOP_ONLY_VIEWPORT

interface PuckApi {
  canEdit: (id: string) => boolean
  dispatch: (action: any) => void
  getAppState: () => any
  findItem?: (id: string) => ReturnType<typeof findItemAndSelector>
}

type StyleMenuRequest = {
  requestNonce?: number
  domain?: StyleModalDomain
  componentType: string
  componentVariant?: string
  componentId: string
  currentStyle: WidgetSemanticStyle
  anchorEl: HTMLElement | null
  initialPosition?: { x: number; y: number }
}

type EditorBridgeValue = {
  openAtom: (request: AtomModalRequest) => void
  registerApi: (api: PuckApi) => void
  select: (id: string | undefined) => void
  openStyle: (request: StyleMenuRequest) => void
  styleComponentId?: string
  templateContext?: string
  themeConfig?: ThemeConfig
  beforeOperation: () => boolean
}

const EditorBridgeContext = React.createContext<EditorBridgeValue | null>(null)
const EMPTY_STYLE: WidgetSemanticStyle = Object.freeze({})

function StablePuckOverride({ children }: { children: React.ReactNode }) {
  const bridge = React.useContext(EditorBridgeContext)!
  return (
    <PuckBridge onRegisterApi={bridge.registerApi} onSelectionChange={bridge.select}>
      {children}
    </PuckBridge>
  )
}

function StableActionBarOverride(
  props: Omit<
    React.ComponentProps<typeof PuckActionBarBridge>,
    'onOpenStyleMenu' | 'styleMenuComponentId'
  >,
) {
  const bridge = React.useContext(EditorBridgeContext)!
  return (
    <PuckActionBarBridge
      {...props}
      onOpenStyleMenu={bridge.openStyle}
      styleMenuComponentId={bridge.styleComponentId}
    />
  )
}

function StableLibraryOverride() {
  const bridge = React.useContext(EditorBridgeContext)!
  return (
    <WidgetPatternLibrary
      context={bridge.templateContext}
      themeConfig={bridge.themeConfig}
      beforeOperation={bridge.beforeOperation}
    />
  )
}
function StableThemeLibraryOverride() {
  const bridge = React.useContext(EditorBridgeContext)!
  return <WidgetPatternLibrary context={bridge.templateContext} themeConfig={bridge.themeConfig} beforeOperation={bridge.beforeOperation} mode="theme" />
}
function StableIframeOverride({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`[data-zyvavu-motion] { animation: none !important; transition: none !important; } [data-zyvavu-motion="lift"]:is(:hover,:focus-within) { transform: none; } @media (prefers-reduced-motion: reduce) { [data-widget-style-surface] video { display: none; } }`}</style>
      {children}
    </>
  )
}
const PUCK_OVERRIDES = {
  components: StableLibraryOverride,
  iframe: StableIframeOverride,
  headerActions: () => <React.Fragment />,
  puck: StablePuckOverride,
  actionBar: StableActionBarOverride,
}

function PuckBridge({
  children,
  onRegisterApi,
  onSelectionChange,
}: {
  children: React.ReactNode
  onRegisterApi: (api: PuckApi) => void
  onSelectionChange: (id: string | undefined) => void
}) {
  const appState = usePuck((s) => s.appState)
  const dispatch = usePuck((s) => s.dispatch)
  const getItemById = usePuck((s) => s.getItemById)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const getPermissions = usePuck((s) => s.getPermissions)
  const selected = usePuck((s) => s.selectedItem)
  const selector = appState.ui?.itemSelector
  const selectedId =
    selected?.props?.id ||
    (selector
      ? selector.zone
        ? appState.data.zones?.[selector.zone]?.[selector.index]?.props?.id
        : appState.data.content?.[selector.index]?.props?.id
      : undefined)
  React.useEffect(() => {
    onSelectionChange(selectedId)
  }, [selectedId, onSelectionChange])
  const appStateRef = React.useRef(appState)
  React.useLayoutEffect(() => {
    appStateRef.current = appState
  }, [appState])

  React.useEffect(() => {
    onRegisterApi({
      canEdit: (id) => Boolean(getPermissions({ item: getItemById(id) }).edit),
      dispatch,
      getAppState: () => appStateRef.current,
      findItem: (id) => {
        const item = getItemById?.(id)
        const selector = getSelectorForId?.(id)
        return item && selector ? { item, selector } : null
      },
    })
  }, [dispatch, onRegisterApi, getItemById, getSelectorForId, getPermissions])

  return <>{children}</>
}

function PuckActionBarBridge({
  label,
  children,
  parentAction,
  onOpenStyleMenu,
  styleMenuComponentId,
}: {
  label?: string
  children: React.ReactNode
  parentAction?: React.ReactNode
  styleMenuComponentId?: string
  onOpenStyleMenu: (payload: {
    domain?: StyleModalDomain
    componentType: string
    componentVariant?: string
    componentId: string
    currentStyle: WidgetSemanticStyle
    anchorEl: HTMLElement
    initialPosition: { x: number; y: number }
  }) => void
}) {
  const bridge = React.useContext(EditorBridgeContext)!
  const selectedItem = usePuck((s) => s.selectedItem)
  const toolbarRef = useToolbarBoundary()
  const itemSelector = usePuck((s) => s.appState?.ui?.itemSelector)
  const appData = usePuck((s) => s.appState?.data)
  const getItemBySelector = usePuck((s) => (s as any).getItemBySelector)

  const resolvedItem = useMemo(() => {
    if (selectedItem) return selectedItem
    if (typeof getItemBySelector === 'function' && itemSelector) {
      try {
        const item = getItemBySelector(itemSelector)
        if (item) return item
      } catch {}
    }
    if (itemSelector && appData) {
      const { index, zone } = itemSelector
      if (!zone || zone === 'root' || zone === ':root') {
        if (appData.content?.[index]) return appData.content[index]
      }
      if (zone && appData.zones?.[zone]?.[index]) {
        return appData.zones[zone][index]
      }
      if (appData.content?.[index]) {
        return appData.content[index]
      }
    }
    return null
  }, [selectedItem, itemSelector, appData, getItemBySelector])

  const rawType = resolvedItem?.type || label || ''
  const componentType = normalizeComponentType(rawType)
  const componentId = resolvedItem?.props?.id || resolvedItem?.id || ''
  const currentStyle = (resolvedItem?.props?.style as WidgetSemanticStyle) || EMPTY_STYLE

  const handleEditStyleClick = (e: React.SyntheticEvent, domain?: StyleModalDomain) => {
    e.stopPropagation()
    const anchor = e.currentTarget as HTMLElement
    const initialPos = computeTranslatedAnchorPosition(anchor, 340, 480)
    onOpenStyleMenu({
      domain,
      componentType,
      componentVariant: resolvedItem?.props?.variant,
      componentId,
      currentStyle,
      anchorEl: anchor,
      initialPosition: initialPos,
    })
  }

  return (
    <div
      ref={toolbarRef}
      className={actionBarStyles.toolbar}
      onClick={(event) => event.stopPropagation()}
      data-style-open={Boolean(componentId && styleMenuComponentId === componentId)}
    >
      {rawType === 'Image' && componentId && (
        <ImageQuickAction key={componentId} id={componentId} beforeOperation={bridge.beforeOperation} />
      )}
      <ActionBar>
        <ActionBar.Group>
          {parentAction}
          {label && <ActionBar.Label label={label} />}
        </ActionBar.Group>
        <ActionBar.Group>
          {getStyleModalDomains(componentType, resolvedItem?.props?.variant)
            .slice(0, 4)
            .map((domain, index) => {
              const Icon = [Play, Palette, LayoutGrid, Square][index]
              return (
                <span key={domain} className={actionBarStyles.styleTrigger}>
                  <ActionBar.Action
                    label={STYLE_MODAL_TITLES[domain]}
                    onClick={(event) => handleEditStyleClick(event, domain)}
                  >
                    <Icon size={20} />
                  </ActionBar.Action>
                </span>
              )
            })}
          {getStyleModalDomains(componentType, resolvedItem?.props?.variant).length > 4 && (
            <Menu withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg" aria-label="More style actions" title="More style actions">
                  <MoreHorizontal size={20} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {getStyleModalDomains(componentType, resolvedItem?.props?.variant)
                  .slice(4)
                  .map((domain) => (
                    <Menu.Item
                      key={domain}
                      onClick={(event) => handleEditStyleClick(event, domain)}
                    >
                      {STYLE_MODAL_TITLES[domain]}
                    </Menu.Item>
                  ))}
              </Menu.Dropdown>
            </Menu>
          )}
          {(ATOM_TYPES as readonly string[]).includes(componentType) && (['settings', 'link'] as const).map(kind => (
            <ActionBar.Action key={kind} label={kind === 'settings' ? 'Settings' : 'Link'} onClick={event => {
              event.stopPropagation()
              bridge.openAtom({ id: componentId, type: componentType, kind, anchor: event.currentTarget as HTMLElement })
            }}>{kind === 'settings' ? <Settings size={20} /> : <LinkIcon size={20} />}</ActionBar.Action>
          ))}
          <ActionBar.Separator />
          {children}
        </ActionBar.Group>
      </ActionBar>
    </div>
  )
}

function findItemAndSelector(
  data: Data,
  id: string,
): { item: any; selector: { index: number; zone?: string } } | null {
  if (!data) return null

  const content = data.content || []
  const contentIndex = content.findIndex(
    (item: any) => item?.props?.id === id || item?._id === id || item?.id === id,
  )
  if (contentIndex !== -1) {
    return {
      item: content[contentIndex],
      selector: { index: contentIndex },
    }
  }

  for (const [zoneKey, items] of Object.entries(data.zones || {})) {
    const zoneIndex = (items as any[]).findIndex(
      (item: any) => item?.props?.id === id || item?._id === id || item?.id === id,
    )
    if (zoneIndex !== -1) {
      return {
        item: items[zoneIndex],
        selector: { index: zoneIndex, zone: zoneKey },
      }
    }
  }

  return null
}

export type PuckHostProps = {
  config: Config
  document: BuilderDocument
  onSave: (doc: BuilderDocument) => Promise<void> | void
  onChange?: (doc: BuilderDocument) => void
  isSaving?: boolean
  isLoading?: boolean
  error?: string | null
  headerActions?: React.ReactNode
  hideTopBar?: boolean
  height?: string | number
  viewports?: Viewport[]
  desktopOnly?: boolean
  themeConfig?: ThemeConfig
  templateContext?: string
}

export function PuckHost({
  config,
  document,
  onSave,
  onChange,
  isSaving = false,
  isLoading = false,
  error = null,
  headerActions,
  hideTopBar = false,
  height,
  viewports,
  desktopOnly = false,
  themeConfig,
  templateContext,
}: PuckHostProps) {
  const [atomModal, setAtomModal] = useState<AtomModalRequest | null>(null)
  const [localDoc, setLocalDoc] = useState<BuilderDocument>(document)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const latestDocRef = React.useRef<BuilderDocument>(localDoc)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  const pageSettingsPlugin: Plugin = useMemo(() => {
    return {
      name: 'page-settings',
      label: templateContext === 'header' ? 'Header Settings' : 'Page Settings',
      icon: <Sliders size={16} />,
      render: () => <PageSettingsPanel themeConfig={themeConfig} templateName={templateContext} />,
    }
  }, [themeConfig, templateContext])

  // Sync when initial document changes externally
  React.useEffect(() => {
    setLocalDoc(document)
    latestDocRef.current = document
  }, [document])

  const puckData: Data = useMemo(() => {
    return {
      root: localDoc?.root || { props: {} },
      content: localDoc?.content || [],
      zones: localDoc?.zones || {},
    }
  }, [localDoc])

  const handlePuckChange = useCallback(
    (data: Data) => {
      const current = latestDocRef.current || localDoc
      const updated: BuilderDocument = {
        version: current.version || CURRENT_BUILDER_VERSION,
        root: data.root,
        content: data.content,
        zones: data.zones || {},
        metadata: current.metadata,
      }
      latestDocRef.current = updated
      setLocalDoc(updated)
      setSaveSuccess(false)
      if (onChange) {
        onChange(updated)
      }
    },
    [localDoc, onChange],
  )

  const handlePublish = useCallback(
    async (data?: Data) => {
      const current = latestDocRef.current || localDoc
      const updated: BuilderDocument = data
        ? {
            version: current.version || CURRENT_BUILDER_VERSION,
            root: data.root,
            content: data.content,
            zones: data.zones || {},
            metadata: current.metadata,
          }
        : current

      const validation = validateBuilderDocument(updated)
      if (!validation.valid) {
        setValidationError(`Schema validation failed: ${validation.errors.join('; ')}`)
        return
      }

      setValidationError(null)
      try {
        await onSave(updated)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err: any) {
        setValidationError(err?.message || 'Failed to save builder document')
      }
    },
    [localDoc, onSave],
  )

  const [activeStyleMenu, setActiveStyleMenu] = useState<
    (StyleMenuRequest & { opened: boolean }) | null
  >(null)

  const puckApiRef = React.useRef<PuckApi | null>(null)

  const handleRegisterPuckApi = useCallback((api: PuckApi) => {
    puckApiRef.current = api
  }, [])

  const handleOpenStyleMenu = useCallback(
    ({
      domain,
      componentType,
      componentVariant,
      componentId,
      currentStyle,
      anchorEl,
      initialPosition,
    }: StyleMenuRequest) => {
      // Reopening the active editor must not erase its live preview.
      if (activeStyleMenu?.opened && activeStyleMenu.componentId === componentId) {
        setActiveStyleMenu((previous) =>
          previous
            ? { ...previous, domain, requestNonce: (previous.requestNonce || 0) + 1 }
            : previous,
        )
        return
      }
      if (activeStyleMenu && stylePreviewStore.getPreview(activeStyleMenu.componentId)) {
        setValidationError('Apply or cancel the active style draft before editing another widget.')
        return
      }
      const item = puckApiRef.current?.findItem?.(componentId)?.item
      if (item?.props?.lock?.canEditProps === false || !puckApiRef.current?.canEdit(componentId)) {
        setValidationError('This widget is locked against edits.')
        return
      }
      stylePreviewStore.clearPreview()
      setActiveStyleMenu({
        opened: true,
        domain,
        componentType,
        componentVariant,
        componentId,
        currentStyle,
        anchorEl,
        initialPosition,
      })
    },
    [activeStyleMenu],
  )

  const handleCloseStyleMenu = useCallback(() => {
    stylePreviewStore.clearPreview()
    setActiveStyleMenu(null)
  }, [])

  const handleUpdateWidgetStyle = useCallback(
    (newStyle: WidgetSemanticStyle) => {
      if (!activeStyleMenu) return false
      const { componentId } = activeStyleMenu
      const api = puckApiRef.current
      const current = api?.findItem?.(componentId)?.item
      if (!current || current.props?.lock?.canEditProps === false || !api?.canEdit(componentId)) {
        setValidationError('This widget is unavailable or locked against edits.')
        return false
      }
      stylePreviewStore.clearPreview()

      const updateItem = (item: any) => {
        if (
          item?.props?.id === componentId ||
          item?.id === componentId ||
          item?._id === componentId
        ) {
          return {
            ...item,
            props: {
              ...item.props,
              id: item.props?.id || componentId,
              style: newStyle,
            },
          }
        }
        if (!item?.props) return item
        let changed = false
        const props = { ...item.props }
        for (const [key, value] of Object.entries(props)) {
          if (Array.isArray(value) && value.some((child) => child?.props && child?.type)) {
            const children = value.map(updateItem)
            if (children.some((child, index) => child !== value[index])) {
              props[key] = children
              changed = true
            }
          }
        }
        return changed ? { ...item, props } : item
      }

      if (api) {
        api.dispatch({
          type: 'setData',
          data: (prev: Data) => ({
            ...prev,
            root: updateItem(prev.root),
            content: (prev.content || []).map(updateItem),
            zones: Object.fromEntries(
              Object.entries(prev.zones || {}).map(([zoneKey, items]) => [
                zoneKey,
                (items as any[]).map(updateItem),
              ]),
            ),
          }),
        })
      }

      setActiveStyleMenu((prev) => (prev ? { ...prev, currentStyle: newStyle } : null))
      return true
    },
    [activeStyleMenu],
  )

  // Native right-click on canvas widgets triggers the style context menu
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Find if right-click was on a Puck canvas component
      const componentEl = target.closest('[data-puck-component]') as HTMLElement | null
      if (!componentEl) return

      const compId = componentEl.getAttribute('data-puck-component')
      if (!compId) return

      const api = puckApiRef.current
      if (!api) return

      const appState = api.getAppState()
      const data = appState.data as Data

      const found = api.findItem?.(compId) || findItemAndSelector(data, compId)
      if (!found) return

      const { item, selector } = found
      if (!getComponentStyleCapabilities(item.type).length) return
      e.preventDefault()
      e.stopPropagation()

      if (
        activeStyleMenu &&
        activeStyleMenu.componentId !== compId &&
        stylePreviewStore.getPreview(activeStyleMenu.componentId)
      ) {
        setValidationError('Apply or cancel the active style draft before editing another widget.')
        return
      }
      // Select clicked component in Puck UI
      api.dispatch({
        type: 'setUi',
        ui: {
          itemSelector: selector,
        },
      })

      // Calculate initial position in parent window coordinates
      const win = componentEl.ownerDocument.defaultView || window
      let initialPos = { x: e.clientX + 10, y: e.clientY + 10 }
      if (win !== window && win.frameElement) {
        const iframeRect = win.frameElement.getBoundingClientRect()
        initialPos = {
          x: iframeRect.left + e.clientX + 10,
          y: iframeRect.top + e.clientY + 10,
        }
      }

      // Viewport clamping
      const width = 340
      const height = 480
      const padding = 12
      if (initialPos.x + width > window.innerWidth - padding) {
        initialPos.x = Math.max(padding, initialPos.x - width - 20)
      }
      if (initialPos.y + height > window.innerHeight - padding) {
        initialPos.y = Math.max(padding, window.innerHeight - height - padding)
      }
      initialPos.x = Math.max(padding, initialPos.x)
      initialPos.y = Math.max(68, initialPos.y)

      handleOpenStyleMenu({
        componentType: item.type,
        componentVariant: item.props?.variant,
        componentId: item.props?.id || compId,
        currentStyle: (item.props?.style as WidgetSemanticStyle) || {},
        anchorEl: componentEl,
        initialPosition: initialPos,
      })
    }

    const viewportEl = viewportRef.current
    if (!viewportEl) return
    viewportEl.addEventListener('contextmenu', handleContextMenu)
    let frame: HTMLIFrameElement | null = null
    let frameDoc: Document | null = null
    const attachDocument = () => {
      let nextDoc: Document | null = null
      try {
        nextDoc = frame?.contentDocument || null
      } catch {
        /* Cross-origin frames cannot be inspected. */
      }
      if (frameDoc === nextDoc) return
      frameDoc?.removeEventListener('contextmenu', handleContextMenu)
      frameDoc = nextDoc
      frameDoc?.addEventListener('contextmenu', handleContextMenu)
    }
    const discoverFrame = () => {
      const nextFrame = viewportEl.querySelector<HTMLIFrameElement>('iframe#preview-frame, iframe')
      if (frame !== nextFrame) {
        frame?.removeEventListener('load', attachDocument)
        frameDoc?.removeEventListener('contextmenu', handleContextMenu)
        frameDoc = null
        frame = nextFrame
        frame?.addEventListener('load', attachDocument)
      }
      attachDocument()
    }
    discoverFrame()
    const observer = new MutationObserver(discoverFrame)
    observer.observe(viewportEl, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      viewportEl.removeEventListener('contextmenu', handleContextMenu)
      frame?.removeEventListener('load', attachDocument)
      frameDoc?.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [activeStyleMenu, handleOpenStyleMenu])

  const handleSelectionChange = useCallback((id: string | undefined) => {
    setAtomModal(previous => previous && previous.id !== id ? null : previous)
    setActiveStyleMenu((previous) => {
      if (previous && previous.componentId !== id) {
        if (stylePreviewStore.getPreview(previous.componentId)) return previous
        stylePreviewStore.clearPreview(previous.componentId)
        return null
      }
      return previous
    })
  }, [])

  const bridgeValue: EditorBridgeValue = {
    openAtom: setAtomModal,
    templateContext,
    themeConfig,
    beforeOperation: () =>
      !activeStyleMenu || !stylePreviewStore.getPreview(activeStyleMenu.componentId),
    registerApi: handleRegisterPuckApi,
    select: handleSelectionChange,
    openStyle: handleOpenStyleMenu,
    styleComponentId: activeStyleMenu?.opened ? activeStyleMenu.componentId : undefined,
  }
  const activeViewports = desktopOnly ? DESKTOP_ONLY_VIEWPORT : viewports || RESPONSIVE_VIEWPORTS
  const puckUi = useMemo(
    () => ({
      viewports: {
        current: { width: '100%' as const, height: 'auto' as const },
        options: activeViewports,
        controlsVisible: !desktopOnly,
      },
    }),
    [activeViewports, desktopOnly],
  )
  const plugins = useMemo(() => [pageSettingsPlugin, ...(hasThemeLibrary(templateContext) ? [{ name: 'theme', label: 'Theme', icon: <Palette size={16} />, render: StableThemeLibraryOverride }] : [])], [pageSettingsPlugin, templateContext])

  return (
    <EditorBridgeContext.Provider value={bridgeValue}>
      <Box
        className={`zyvavu-puck-host-wrapper ${actionBarStyles.libraryHost} ${templateContext ? actionBarStyles.themeNavigation : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: height || '100%',
          width: '100%',
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          overflow: 'hidden',
        }}
      >
        <LoadingOverlay visible={isLoading || isSaving} overlayProps={{ blur: 1 }} />

        {/* Optional Builder Top Bar */}
        {!hideTopBar && (
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              borderBottom: '1px solid var(--zyvavu-border, #dfe5e2)',
              backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
              flexShrink: 0,
            }}
          >
            <Group gap="sm">
              <Text size="sm" fw={600} c="var(--zyvavu-text, #17201f)">
                Visual Layout Builder
              </Text>
              <Text size="xs" c="dimmed">
                (Puck Engine v{CURRENT_BUILDER_VERSION})
              </Text>
            </Group>

            <Group gap="sm">
              {headerActions}
              {saveSuccess && (
                <Group gap={4} style={{ color: '#0e6b66' }}>
                  <Check size={14} />
                  <Text size="xs" fw={500}>
                    Saved
                  </Text>
                </Group>
              )}
              <Button
                size="xs"
                color="#0e6b66"
                leftSection={<Save size={14} />}
                loading={isSaving}
                onClick={() => handlePublish()}
              >
                Save Layout
              </Button>
            </Group>
          </Box>
        )}

        {(error || validationError) && (
          <Alert
            icon={<AlertCircle size={16} />}
            title="Error"
            color="red"
            withCloseButton
            onClose={() => setValidationError(null)}
            m="xs"
          >
            {error || validationError}
          </Alert>
        )}

        {/* Visual Canvas Area */}
        <Box
          ref={viewportRef}
          className="zyvavu-puck-viewport"
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Puck
            config={config}
            data={puckData}
            plugins={plugins}
            viewports={activeViewports}
            ui={puckUi}
            overrides={PUCK_OVERRIDES}
            onPublish={handlePublish}
            onChange={handlePuckChange}
          />
        </Box>

        {atomModal && <AtomModal request={atomModal} onClose={() => { atomModal.anchor.focus({ preventScroll: true }); setAtomModal(null) }} />}

        {/* Stable Floating Style Context Menu (Owned outside transient Puck ActionBar) */}
        {activeStyleMenu?.opened && (
          <WidgetStyleContextMenu
            opened={activeStyleMenu.opened}
            domain={activeStyleMenu.domain}
            requestNonce={activeStyleMenu.requestNonce}
            onClose={handleCloseStyleMenu}
            anchorEl={activeStyleMenu.anchorEl}
            initialPosition={activeStyleMenu.initialPosition}
            componentType={activeStyleMenu.componentType}
            componentVariant={activeStyleMenu.componentVariant}
            componentId={activeStyleMenu.componentId}
            currentStyle={activeStyleMenu.currentStyle}
            themeConfig={themeConfig}
            onUpdateStyle={handleUpdateWidgetStyle}
          />
        )}
      </Box>
    </EditorBridgeContext.Provider>
  )
}
