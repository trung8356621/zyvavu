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
  Type,
  Sparkles,
  Circle,
  MoreHorizontal,
  Link as LinkIcon,
  Bookmark,
  type LucideIcon,
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
  orderStyleToolbarDomains,
  STYLE_MODAL_TITLES,
  type StyleModalDomain,
} from '@/lib/style-engine/domains'

const STYLE_DOMAIN_ICONS: Record<StyleModalDomain, LucideIcon> = {
  animation: Play,
  background: Palette,
  spacing: LayoutGrid,
  borders: Square,
  typography: Type,
  shadow: Circle,
  effects: Sparkles,
  button: Sliders,
}
import {
  createPuckHistoryCoordinator,
  dispatchDocumentData,
} from '@/lib/style-engine/editor-history'
import { WidgetPatternLibrary } from '@/components/admin/theme-builder/WidgetPatternLibrary'
import {
  canSaveSelectedAsPattern,
  SaveAsPatternDialog,
} from '@/components/admin/theme-builder/SaveAsPatternDialog'
import actionBarStyles from './WidgetActionBar.module.css'
import { ImageQuickAction } from './ImageQuickAction'
import { AtomWidgetLinkHost } from '@/components/builder/inline-edit/AtomWidgetLinkHost'
import { useToolbarBoundary } from './useToolbarBoundary'
import {
  ATOM_SETTINGS_DICTIONARY,
  ATOM_SETTINGS_PANEL_ATTR,
  focusAtomSettingsPanel,
  planBuilderPanelNavigation,
} from './atom-settings'
import { BuilderChromeProvider } from './editor-bridge'
import { hasThemeLibrary } from '@/lib/theme-engine/widget-contracts'

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
  getHistory?: () => any
  findItem?: (id: string) => ReturnType<typeof findItemAndSelector>
}

type StyleMenuRequest = {
  requestNonce?: number
  domain?: StyleModalDomain
  componentType: string
  componentVariant?: string
  componentId: string
  /** Semantic HTML tag (Heading/ItemTitle/…) — independent of style.typography overrides. */
  htmlTag?: string | null
  currentStyle: WidgetSemanticStyle
  anchorEl: HTMLElement | null
  initialPosition?: { x: number; y: number }
}

type EditorBridgeValue = {
  /** Opens native Puck Fields panel (official Atom Settings). */
  openAtomSettings: () => void
  /** Opens canonical Link Editor for Button/Image widget props. */
  openAtomLink: (componentId: string) => void
  openSaveAsPattern: () => void
  closeSaveAsPattern: () => void
  saveAsPatternOpened: boolean
  registerApi: (api: PuckApi) => void
  select: (id: string | undefined) => void
  openStyle: (request: StyleMenuRequest) => void
  styleComponentId?: string
  templateContext?: string
  themeConfig?: ThemeConfig
  beforeOperation: () => boolean
  history?: ReturnType<typeof createPuckHistoryCoordinator>
}

const EditorBridgeContext = React.createContext<EditorBridgeValue | null>(null)
const EMPTY_STYLE: WidgetSemanticStyle = Object.freeze({})

function StablePuckOverride({ children }: { children: React.ReactNode }) {
  const bridge = React.useContext(EditorBridgeContext)!
  return (
    <PuckBridge onRegisterApi={bridge.registerApi} onSelectionChange={bridge.select}>
      {children}
      <SaveAsPatternDialog
        opened={bridge.saveAsPatternOpened}
        onClose={bridge.closeSaveAsPattern}
        context={bridge.templateContext}
        beforeOperation={bridge.beforeOperation}
      />
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

/** Marks native Puck Fields so Atom Settings gear can focus the real panel. */
function StableFieldsOverride({
  children,
}: {
  children: React.ReactNode
  isLoading?: boolean
  itemSelector?: unknown
}) {
  return (
    <div {...{ [ATOM_SETTINGS_PANEL_ATTR]: 'true' }} tabIndex={-1} style={{ outline: 'none' }}>
      {children}
    </div>
  )
}

const PUCK_OVERRIDES = {
  components: StableLibraryOverride,
  iframe: StableIframeOverride,
  headerActions: () => <React.Fragment />,
  puck: StablePuckOverride,
  actionBar: StableActionBarOverride,
  fields: StableFieldsOverride,
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
  const history = usePuck((s) => s.history)
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
      getHistory: () => history,
      findItem: (id) => {
        const item = getItemById?.(id)
        const selector = getSelectorForId?.(id)
        return item && selector ? { item, selector } : null
      },
    })
  }, [dispatch, history, onRegisterApi, getItemById, getSelectorForId, getPermissions])

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
    htmlTag?: string | null
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
      htmlTag: typeof resolvedItem?.props?.tag === 'string' ? resolvedItem.props.tag : null,
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
        <ImageQuickAction
          key={componentId}
          id={componentId}
          kind="Image"
          beforeOperation={bridge.beforeOperation}
        />
      )}
      {rawType === 'Video' && componentId && (
        <ImageQuickAction
          key={`video-${componentId}`}
          id={componentId}
          kind="Video"
          beforeOperation={bridge.beforeOperation}
        />
      )}
      <ActionBar>
        <ActionBar.Group>
          {parentAction}
          {label && <ActionBar.Label label={label} />}
        </ActionBar.Group>
        <ActionBar.Group>
          {orderStyleToolbarDomains(
            getStyleModalDomains(componentType, resolvedItem?.props?.variant),
          )
            .slice(0, 4)
            .map((domain) => {
              const Icon = STYLE_DOMAIN_ICONS[domain]
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
          <Menu withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label="More actions"
                title="More actions"
              >
                <MoreHorizontal size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {orderStyleToolbarDomains(
                getStyleModalDomains(componentType, resolvedItem?.props?.variant),
              )
                .slice(4)
                .map((domain) => (
                  <Menu.Item
                    key={domain}
                    onClick={(event) => handleEditStyleClick(event, domain)}
                  >
                    {STYLE_MODAL_TITLES[domain]}
                  </Menu.Item>
                ))}
              <Menu.Item
                leftSection={<Bookmark size={16} />}
                disabled={!canSaveSelectedAsPattern(componentType)}
                onClick={(event) => {
                  event.stopPropagation()
                  bridge.openSaveAsPattern()
                }}
              >
                Save as Pattern
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {/* Primary widget settings live in native Puck Fields on selection — no gear. */}
          {(componentType === 'Button' ||
            componentType === 'Image' ||
            componentType === 'Video') &&
            componentId && (
            <ActionBar.Action
              key="atom-link"
              label="Link"
              onClick={(event) => {
                event.stopPropagation()
                bridge.openAtomLink(componentId)
              }}
            >
              <LinkIcon size={20} />
            </ActionBar.Action>
          )}
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
  const [saveAsPatternOpened, setSaveAsPatternOpened] = useState(false)

  const puckApiRef = React.useRef<PuckApi | null>(null)

  const handleRegisterPuckApi = useCallback((api: PuckApi) => {
    puckApiRef.current = api
  }, [])

  const setPuckRightSidebar = useCallback((visible: boolean) => {
    puckApiRef.current?.dispatch({
      type: 'setUi',
      ui: { rightSideBarVisible: visible },
    })
  }, [])

  const handleOpenStyleMenu = useCallback(
    ({
      domain,
      componentType,
      componentVariant,
      componentId,
      htmlTag,
      currentStyle,
      anchorEl,
      initialPosition,
    }: StyleMenuRequest) => {
      // Same widget: retarget domain accordion without resetting the session baseline.
      if (activeStyleMenu?.opened && activeStyleMenu.componentId === componentId) {
        setActiveStyleMenu((previous) =>
          previous
            ? { ...previous, domain, requestNonce: (previous.requestNonce || 0) + 1 }
            : previous,
        )
        return
      }
      const item = puckApiRef.current?.findItem?.(componentId)?.item
      if (item?.props?.lock?.canEditProps === false || !puckApiRef.current?.canEdit(componentId)) {
        setValidationError('This widget is locked against edits.')
        return
      }
      // Direct-commit sessions do not hold a separate draft; clear pattern hover previews only.
      stylePreviewStore.clearPreview()
      setAtomLinkId(null)
      // Style and Atom Settings are mutually exclusive on the right edge.
      const plan = planBuilderPanelNavigation('style', {
        styleOpen: Boolean(activeStyleMenu?.opened),
        atomSettingsVisible: Boolean(puckApiRef.current?.getAppState()?.ui?.rightSideBarVisible),
      })
      setPuckRightSidebar(plan.rightSideBarVisible)
      const resolvedTag =
        typeof item?.props?.tag === 'string'
          ? item.props.tag
          : typeof htmlTag === 'string'
            ? htmlTag
            : null
      setActiveStyleMenu({
        opened: true,
        domain,
        componentType,
        componentVariant,
        componentId,
        htmlTag: resolvedTag,
        currentStyle:
          (item?.props?.style as WidgetSemanticStyle) || currentStyle || EMPTY_STYLE,
        anchorEl,
        initialPosition,
      })
    },
    [activeStyleMenu, setPuckRightSidebar],
  )

  const handleCloseStyleMenu = useCallback(() => {
    stylePreviewStore.clearPreview()
    setActiveStyleMenu(null)
    // Restore Atom Settings (Puck Fields) when leaving Style.
    setPuckRightSidebar(true)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        // Avoid the BuilderDocument prop named `document`.
        focusAtomSettingsPanel(window.document)
      })
    })
  }, [setPuckRightSidebar])

  const handleUpdateWidgetStyle = useCallback(
    (newStyle: WidgetSemanticStyle, options?: { recordHistory?: boolean }) => {
      if (!activeStyleMenu) return false
      const { componentId } = activeStyleMenu
      const api = puckApiRef.current
      const current = api?.findItem?.(componentId)?.item
      if (!current || current.props?.lock?.canEditProps === false || !api?.canEdit(componentId)) {
        setValidationError('This widget is unavailable or locked against edits.')
        return false
      }
      stylePreviewStore.clearPreview(componentId)

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
        dispatchDocumentData(
          api.dispatch,
          (prev: Data) => ({
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
          { recordHistory: options?.recordHistory !== false },
        )
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
        htmlTag: typeof item.props?.tag === 'string' ? item.props.tag : null,
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

  const [atomLinkId, setAtomLinkId] = useState<string | null>(null)

  const handleSelectionChange = useCallback((id: string | undefined) => {
    setAtomLinkId((previous) => (previous && previous !== id ? null : previous))
    setActiveStyleMenu((previous) => {
      if (previous && previous.componentId !== id) {
        stylePreviewStore.clearPreview(previous.componentId)
        return null
      }
      return previous
    })
  }, [])

  const openAtomLink = useCallback(
    (componentId: string) => {
      stylePreviewStore.clearPreview()
      setActiveStyleMenu(null)
      setAtomLinkId(componentId)
    },
    [],
  )

  const openAtomSettings = useCallback(() => {
    const api = puckApiRef.current
    const styleOpen = Boolean(activeStyleMenu?.opened)
    const atomSettingsVisible = Boolean(api?.getAppState()?.ui?.rightSideBarVisible)
    const plan = planBuilderPanelNavigation('atom-settings', {
      styleOpen,
      atomSettingsVisible,
    })

    setAtomLinkId(null)
    if (plan.closeStyle) {
      stylePreviewStore.clearPreview()
      setActiveStyleMenu(null)
    }

    const revealAndFocus = () => {
      setPuckRightSidebar(true)
      // Focus after Puck applies sidebar visibility.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusAtomSettingsPanel(window.document)
        })
      })
    }

    if (plan.pulseAtomSettings) {
      // Fields already visible: hide→show so the gear has a visible effect.
      setPuckRightSidebar(false)
      window.requestAnimationFrame(() => {
        revealAndFocus()
      })
      return
    }

    revealAndFocus()
  }, [activeStyleMenu?.opened, setPuckRightSidebar])

  const openSaveAsPattern = useCallback(() => {
    setSaveAsPatternOpened(true)
  }, [])
  const closeSaveAsPattern = useCallback(() => {
    setSaveAsPatternOpened(false)
  }, [])

  // After Undo/Redo / Fields edits, resync open Style sidebar from the live document.
  React.useEffect(() => {
    if (!activeStyleMenu?.opened) return
    const api = puckApiRef.current
    if (!api?.findItem) return
    const found = api.findItem(activeStyleMenu.componentId)
    const nextStyle = (found?.item?.props?.style as WidgetSemanticStyle) || EMPTY_STYLE
    const nextTag =
      typeof found?.item?.props?.tag === 'string' ? found.item.props.tag : null
    setActiveStyleMenu((previous) => {
      if (!previous) return previous
      const styleSame =
        JSON.stringify(previous.currentStyle || {}) === JSON.stringify(nextStyle || {})
      const tagSame = (previous.htmlTag || null) === nextTag
      if (styleSame && tagSame) return previous
      return { ...previous, currentStyle: nextStyle, htmlTag: nextTag }
    })
  }, [localDoc, activeStyleMenu?.opened, activeStyleMenu?.componentId])

  const historyCoordinator = React.useMemo(
    () => createPuckHistoryCoordinator(() => puckApiRef.current?.getHistory?.() || null),
    [],
  )

  const bridgeValue: EditorBridgeValue = {
    openAtomSettings,
    openAtomLink,
    openSaveAsPattern,
    closeSaveAsPattern,
    saveAsPatternOpened,
    templateContext,
    themeConfig,
    beforeOperation: () => true,
    registerApi: handleRegisterPuckApi,
    select: handleSelectionChange,
    openStyle: handleOpenStyleMenu,
    styleComponentId: activeStyleMenu?.opened ? activeStyleMenu.componentId : undefined,
    history: historyCoordinator,
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
    <BuilderChromeProvider themeConfig={themeConfig}>
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
            dictionary={ATOM_SETTINGS_DICTIONARY}
            overrides={PUCK_OVERRIDES}
            onPublish={handlePublish}
            onChange={handlePuckChange}
          />
        </Box>

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
            htmlTag={activeStyleMenu.htmlTag}
            currentStyle={activeStyleMenu.currentStyle}
            themeConfig={themeConfig}
            onUpdateStyle={handleUpdateWidgetStyle}
            onSaveAsPattern={
              canSaveSelectedAsPattern(activeStyleMenu.componentType)
                ? () => {
                    handleCloseStyleMenu()
                    openSaveAsPattern()
                  }
                : undefined
            }
          />
        )}
        <AtomWidgetLinkHost
          componentId={atomLinkId}
          opened={Boolean(atomLinkId)}
          onClose={() => {
            setAtomLinkId(null)
            // Restore Widget Settings after Link Editor Cancel/Apply.
            setPuckRightSidebar(true)
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                focusAtomSettingsPanel(window.document)
              })
            })
          }}
          getItem={(id) => puckApiRef.current?.findItem?.(id)?.item || null}
          getSelector={(id) => {
            const selector = puckApiRef.current?.findItem?.(id)?.selector
            if (!selector || typeof selector.zone !== 'string') return null
            return { index: selector.index, zone: selector.zone }
          }}
          dispatch={(action) => puckApiRef.current?.dispatch(action)}
        />
      </Box>
    </EditorBridgeContext.Provider>
  </BuilderChromeProvider>
  )
}
