'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Puck,
  ActionBar,
  type Config,
  type Data,
  type Plugin,
  type Viewport,
  createUsePuck,
  fieldsPlugin,
} from '@puckeditor/core'
import '@puckeditor/core/dist/index.css'
import { ActionIcon, Alert, Box, Button, Group, LoadingOverlay, Text, Menu, Tooltip } from '@mantine/core'
import {
  Check,
  AlertCircle,
  Palette,
  Blocks,
  ListTree,
  Eye,
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
  Settings2,
  Paintbrush,
  CornerLeftUp,
  CopyPlus,
  Copy,
  X,
  type LucideIcon,
} from 'lucide-react'
import { findWidgetPath, formatWidgetPath } from '@/lib/theme-engine/widget-ids'
import { generateThemeCss } from '@/lib/theme-engine/styles'
import { getGoogleFontUrl } from '@/lib/theme-engine/fonts'

import { CURRENT_BUILDER_VERSION, validateBuilderDocument } from './document'
import type { BuilderDocument } from './types'
import type { TemplateContext, ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { canonicalizeZonesToSlots } from '@/lib/theme-engine/document-slots'
import {
  getComponentStyleCapabilities,
  normalizeComponentType,
} from '@/lib/style-engine/capabilities'
import { PageSettingsPanel } from '@/components/admin/theme-builder/PageSettingsPanel'
import { resolveEffectivePageLayout } from '@/lib/theme-engine/page-settings'
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
import workspaceStyles from './EditorWorkspace.module.css'
import { ImageQuickAction } from './ImageQuickAction'
import { AtomWidgetLinkHost } from '@/components/builder/inline-edit/AtomWidgetLinkHost'
import { BuilderTemplateProvider } from '@/components/builder/core/BuilderTemplateContext'
import { useToolbarBoundary } from './useToolbarBoundary'
import {
  ATOM_SETTINGS_DICTIONARY,
  ATOM_SETTINGS_PANEL_ATTR,
  focusAtomSettingsPanel,
  planBuilderPanelNavigation,
  planStyleSelectionLock,
} from './atom-settings'
import { BuilderChromeProvider, useBuilderChrome } from './editor-bridge'
import { hasThemeLibrary } from '@/lib/theme-engine/widget-contracts'
import {
  getBannerActiveSlide,
  subscribeBannerActiveSlide,
} from '@/widgets/BannerSlider/active-slide-store'
import {
  duplicateBannerSlide,
  findEnclosingBannerSlide,
} from '@/widgets/BannerSlider/banner-slide-ops'
import { stripSlideItemMargin } from '@/widgets/BannerSlider/style-targets'

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
  listPresentation?: import('@/lib/style-engine/list-presentation').ListPresentationConfig
  controlsStyle?: import('@/widgets/BannerSlider/style-targets').BannerSliderControlsStyle
  bannerItemId?: string
  bannerItemStyle?: WidgetSemanticStyle
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
  themeId?: string
  homeVersionId?: string | null
  libraryLanguage?: string
  themeConfig?: ThemeConfig
  previewControlTarget?: HTMLElement | null
  beforeOperation: () => boolean
  getDocument: () => Data | null
}

const EditorBridgeContext = React.createContext<EditorBridgeValue | null>(null)
const EMPTY_STYLE: WidgetSemanticStyle = Object.freeze({})

function StablePuckOverride({ children }: { children: React.ReactNode }) {
  const bridge = React.useContext(EditorBridgeContext)!
  return (
    <PuckBridge onRegisterApi={bridge.registerApi} onSelectionChange={bridge.select}>
      {bridge.templateContext ? <ThemeWorkspace>{children}</ThemeWorkspace> : children}
      <SaveAsPatternDialog
        opened={bridge.saveAsPatternOpened}
        onClose={bridge.closeSaveAsPattern}
        context={bridge.templateContext}
        beforeOperation={bridge.beforeOperation}
      />
    </PuckBridge>
  )
}

function WorkspacePanel({
  title,
  onClose,
  children,
  library = false,
}: {
  title: string
  onClose?: () => void
  children: React.ReactNode
  library?: boolean
}) {
  return (
    <>
      <div className={workspaceStyles.fieldsHeader}>
        <span className={workspaceStyles.fieldsTitle}>{title}</span>
        {onClose && (
          <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Close ${title}`} onClick={onClose}>
            <X size={15} aria-hidden />
          </ActionIcon>
        )}
      </div>
      <div className={library ? workspaceStyles.libraryBody : workspaceStyles.fieldsBody}>{children}</div>
    </>
  )
}

function ThemeWorkspace({ children }: { children: React.ReactNode }) {
  const bridge = React.useContext(EditorBridgeContext)!
  const [panel, setPanel] = useState<'blocks' | 'outline' | 'page' | 'theme' | null>(null)
  const panelRef = React.useRef<HTMLElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const panelId = React.useId()
  const previewMode = usePuck((state) => state.appState.ui.previewMode)
  const dispatch = usePuck((state) => state.dispatch)
  const previewing = previewMode === 'interactive'
  const tools = [
    { id: 'blocks', title: 'Widget Library', icon: Blocks },
    { id: 'outline', title: 'Outline', icon: ListTree },
    { id: 'page', title: bridge.templateContext === 'header' ? 'Header Settings' : 'Page Settings', icon: Sliders },
    ...(hasThemeLibrary(bridge.templateContext) ? [{ id: 'theme', title: 'Theme Settings', icon: Palette } as const] : []),
  ] as const
  const active = tools.find((tool) => tool.id === panel)

  React.useEffect(() => {
    if (panel) panelRef.current?.focus()
  }, [panel])

  const closePanel = () => {
    setPanel(null)
    triggerRef.current?.focus()
  }

  return (
    <div className={workspaceStyles.themeWorkspace}>
      {bridge.previewControlTarget && createPortal(
        <Tooltip label={previewing ? 'Return to editing' : 'Preview'}>
          <ActionIcon
            size="sm"
            variant={previewing ? 'light' : 'subtle'}
            aria-label="Preview"
            aria-pressed={previewing}
            disabled={Boolean(bridge.styleComponentId)}
            onClick={() => {
              setPanel(null)
              dispatch({
                type: 'setUi',
                ui: { previewMode: previewing ? 'edit' : 'interactive', rightSideBarVisible: false },
              })
            }}
          >
            <Eye size={16} aria-hidden />
          </ActionIcon>
        </Tooltip>,
        bridge.previewControlTarget,
      )}
      <nav className={workspaceStyles.toolRail} aria-label="Editor tools">
        {tools.map(({ id, title, icon: Icon }) => (
          <Tooltip key={id} label={title} position="right" withinPortal events={{ hover: true, focus: true, touch: false }}>
            <ActionIcon
              size="md"
              variant={panel === id ? 'light' : 'subtle'}
              aria-label={title}
              aria-expanded={panel === id}
              disabled={previewing}
              aria-controls={panel === id ? panelId : undefined}
              onClick={(event) => {
                triggerRef.current = event.currentTarget
                setPanel(panel === id ? null : id)
              }}
            >
              <Icon size={18} aria-hidden />
            </ActionIcon>
          </Tooltip>
        ))}
      </nav>
      {children}
      {active && !previewing && (
        <section
          id={panelId}
          ref={panelRef}
          className={workspaceStyles.toolPanel}
          aria-label={active.title}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return
            event.stopPropagation()
            closePanel()
          }}
        >
          <WorkspacePanel title={active.title} onClose={closePanel} library={panel === 'blocks' || panel === 'theme'}>
            {(panel === 'blocks' || panel === 'theme') && (
              <WidgetPatternLibrary
                language={bridge.libraryLanguage}
                key={panel}
                context={bridge.templateContext}
                themeConfig={bridge.themeConfig}
                beforeOperation={bridge.beforeOperation}
                mode={panel}
                embedded
              />
            )}
            {panel === 'outline' && <Puck.Outline />}
            {panel === 'page' && <PageSettingsPanel themeConfig={bridge.themeConfig} templateName={bridge.templateContext} />}
          </WorkspacePanel>
        </section>
      )}
    </div>
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
      language={bridge.libraryLanguage}
      context={bridge.templateContext}
      themeConfig={bridge.themeConfig}
      beforeOperation={bridge.beforeOperation}
    />
  )
}
function StableIframeOverride({ children }: { children: React.ReactNode }) {
  // Content theme tokens live only in the canvas iframe document — Admin chrome stays on Mantine/Admin vars.
  const { themeConfig } = useBuilderChrome()
  const themeCss = useMemo(() => generateThemeCss(themeConfig), [themeConfig])
  const fontUrl = useMemo(() => {
    const families = [
      themeConfig?.tokens?.typography?.fontFamily,
      themeConfig?.tokens?.typography?.fontFamilyHeading,
    ]
    return getGoogleFontUrl(families)
  }, [themeConfig])

  return (
    <>
      {fontUrl ? <link rel="stylesheet" href={fontUrl} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <style>{`[data-zyvavu-motion] { animation: none !important; transition: none !important; } [data-zyvavu-motion="lift"]:is(:hover,:focus-within) { transform: none; } @media (prefers-reduced-motion: reduce) { [data-widget-style-surface] video { display: none; } }`}</style>
      {children}
    </>
  )
}

/** Real Puck Fields hosted in a floating panel chrome (no duplicate form). */
function StableFieldsOverride({
  children,
  isLoading,
}: {
  children: React.ReactNode
  isLoading?: boolean
  itemSelector?: unknown
}) {
  const selectedItem = usePuck((s) => s.selectedItem)
  const rawType = selectedItem?.type || 'Widget'
  const label =
    typeof selectedItem?.props?.label === 'string' && selectedItem.props.label.trim()
      ? selectedItem.props.label
      : rawType

  if (rawType === 'Button') return <></>

  return (
    <div
      {...{ [ATOM_SETTINGS_PANEL_ATTR]: 'true' }}
      tabIndex={-1}
      className={workspaceStyles.fieldsPanel}
      data-fields-loading={isLoading ? 'true' : undefined}
    >
      <WorkspacePanel title={`${label} settings`}>
        {children}
      </WorkspacePanel>
    </div>
  )
}

const EmptyPlugin = () => <></>
const THEME_WORKSPACE_PLUGINS: Plugin[] = [
  { name: 'blocks', render: EmptyPlugin },
  { name: 'outline', render: EmptyPlugin },
  { ...fieldsPlugin(), render: EmptyPlugin },
]

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
  const appStateRef = React.useRef(appState)
  React.useLayoutEffect(() => {
    appStateRef.current = appState
  }, [appState])

  React.useEffect(() => {
    const safeGetItemById = (id: string) => {
      if (!id || !getItemById) return null
      try {
        return getItemById(id) ?? null
      } catch {
        return null
      }
    }
    onRegisterApi({
      canEdit: (id) => {
        const item = safeGetItemById(id)
        return Boolean(item && getPermissions({ item }).edit)
      },
      dispatch,
      getAppState: () => appStateRef.current,
      getHistory: () => history,
      findItem: (id) => {
        if (!id) return null
        const data = appStateRef.current?.data as Data | undefined
        const fromTree = data ? findItemAndSelector(data, id) : null
        const item = safeGetItemById(id) || fromTree?.item
        const selector = getSelectorForId?.(id) || fromTree?.selector
        return item && selector ? { item, selector } : fromTree
      },
    })
  }, [dispatch, history, onRegisterApi, getItemById, getSelectorForId, getPermissions])

  const notifySelection = React.useEffectEvent(onSelectionChange)
  React.useEffect(() => {
    notifySelection(selectedId)
  }, [selectedId])

  // Stale selection after delete: Puck getItemById crashes on missing nodes — resync to a live item.
  React.useEffect(() => {
    if (!selectedId) return
    let exists = false
    try {
      exists = Boolean(getItemById?.(selectedId))
    } catch {
      exists = false
    }
    if (exists) return
    const data = appState.data as Data
    const fromTree = findItemAndSelector(data, selectedId)
    if (fromTree) return
    const slide = findEnclosingBannerSlide(data, selectedId)
    const fallbackId =
      slide?.sliderId ||
      (selected?.type === 'SlideItem'
        ? findParentItemId(data, selectedId)
        : undefined)
    if (fallbackId) {
      const selector = getSelectorForId?.(fallbackId) || findItemAndSelector(data, fallbackId)?.selector
      if (selector) {
        dispatch({ type: 'setUi', ui: { itemSelector: selector } })
        return
      }
    }
    dispatch({ type: 'setUi', ui: { itemSelector: null } })
  }, [appState.data, dispatch, getItemById, getSelectorForId, selected, selectedId])

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
  onOpenStyleMenu: (payload: StyleMenuRequest) => void
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
  const dispatch = usePuck((s) => s.dispatch)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const bannerSlide =
    componentId && appData
      ? findEnclosingBannerSlide(appData as Data, componentId)
      : null

  const handleEditStyleClick = (e: React.SyntheticEvent, domain?: StyleModalDomain) => {
    e.stopPropagation()
    const anchor = e.currentTarget as HTMLElement
    const initialPos = computeTranslatedAnchorPosition(anchor, 340, 480)
    // SlideItem chrome has no Style panel — open Banner Slider Style Targets instead.
    if (componentType === 'SlideItem' && bannerSlide) {
      const sliderItem = findItemAndSelector(appData as Data, bannerSlide.sliderId)?.item
      onOpenStyleMenu({
        domain,
        componentType: 'BannerSlider',
        componentId: bannerSlide.sliderId,
        currentStyle: EMPTY_STYLE,
        controlsStyle: sliderItem?.props?.controlsStyle,
        bannerItemId: bannerSlide.slideId,
        bannerItemStyle: stripSlideItemMargin(
          findItemAndSelector(appData as Data, bannerSlide.slideId)?.item?.props?.style,
        ) || EMPTY_STYLE,
        anchorEl: anchor,
        initialPosition: initialPos,
      })
      return
    }
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

  const designDomains =
    componentType === 'SlideItem'
      ? orderStyleToolbarDomains(['background', 'spacing', 'borders', 'shadow', 'effects', 'animation'])
      : orderStyleToolbarDomains(
          getStyleModalDomains(componentType, resolvedItem?.props?.variant),
        )

  return (
    <div
      ref={toolbarRef}
      className={actionBarStyles.toolbar}
      onClick={(event) => event.stopPropagation()}
      data-style-open={Boolean(componentId && styleMenuComponentId === componentId)}
      data-testid="widget-actionbar-v5"
    >
      {label && <Text component="span" size="sm" fw={600} truncate>{label}</Text>}
      {componentType !== 'Button' && componentType !== 'SlideItem' && <ActionIcon
        size="sm"
        variant="subtle"
        aria-label="Settings"
        title="Settings"
        onClick={bridge.openAtomSettings}
      >
        <Settings2 size={16} aria-hidden />
      </ActionIcon>}
      {React.isValidElement<React.ComponentProps<typeof ActionBar.Action>>(parentAction) &&
        parentAction.type === ActionBar.Action &&
        !parentAction.props.disabled && (
          <Tooltip label="Chọn phần tử cha" withArrow position="top">
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Chọn phần tử cha"
              title="Chọn phần tử cha"
              data-testid="widget-select-parent"
              onClick={(event) => {
                // Image (and nested widgets) → skip SlideItem → Banner Slider.
                if (
                  bannerSlide &&
                  componentType !== 'BannerSlider' &&
                  componentType !== 'SlideItem'
                ) {
                  event.preventDefault()
                  event.stopPropagation()
                  const selector = getSelectorForId?.(bannerSlide.sliderId)
                  if (selector) {
                    dispatch({ type: 'setUi', ui: { itemSelector: selector } })
                    return
                  }
                }
                parentAction.props.onClick?.(event as any)
              }}
            >
              <CornerLeftUp size={16} aria-hidden />
            </ActionIcon>
          </Tooltip>
        )}
      {designDomains.length > 0 && (
        <Menu withinPortal={false} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              size="sm"
              variant={styleMenuComponentId === componentId ? 'light' : 'subtle'}
              aria-label="Design"
              title="Design"
              data-testid="widget-design-trigger"
            >
              <Paintbrush size={16} aria-hidden />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {designDomains.map((domain) => {
              const Icon = STYLE_DOMAIN_ICONS[domain]
              return (
                <Menu.Item key={domain} leftSection={<Icon size={16} />} onClick={(event) => handleEditStyleClick(event, domain)}>
                  {STYLE_MODAL_TITLES[domain]}
                </Menu.Item>
              )
            })}
          </Menu.Dropdown>
        </Menu>
      )}
      <Menu withinPortal={false} position="bottom-end" keepMounted>
        <Menu.Target>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="More actions"
            title="More actions"
            data-testid="widget-more-trigger"
          >
            <MoreHorizontal size={16} aria-hidden />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown data-testid="widget-more-menu">
          {React.Children.toArray(children).flatMap((action, index) => {
            if (!React.isValidElement(action)) return []
            if (action.type === React.Fragment) {
              return React.Children.toArray(
                (action.props as { children?: React.ReactNode }).children,
              ).flatMap((child, childIndex) => {
                if (!React.isValidElement(child)) return []
                if (
                  !React.isValidElement<React.ComponentProps<typeof ActionBar.Action>>(child) ||
                  child.type !== ActionBar.Action
                ) {
                  return [
                    React.cloneElement(child as React.ReactElement, {
                      key: child.key ?? `action-fragment-${index}-${childIndex}`,
                    }),
                  ]
                }
                return [
                  <Menu.Item
                    key={child.props.label ?? `action-fragment-${index}-${childIndex}`}
                    leftSection={child.props.children}
                    disabled={child.props.disabled}
                    onClick={child.props.onClick}
                  >
                    {child.props.label}
                  </Menu.Item>,
                ]
              })
            }
            if (
              !React.isValidElement<React.ComponentProps<typeof ActionBar.Action>>(action) ||
              action.type !== ActionBar.Action
            ) {
              return [
                React.cloneElement(action as React.ReactElement, {
                  key: action.key ?? `action-extra-${index}`,
                }),
              ]
            }
            return [
              <Menu.Item
                key={action.props.label ?? `puck-action-${index}`}
                leftSection={action.props.children}
                disabled={action.props.disabled}
                onClick={action.props.onClick}
              >
                {action.props.label}
              </Menu.Item>,
            ]
          })}
          {bannerSlide && componentId && (
            <Menu.Item
              leftSection={<CopyPlus size={16} />}
              onClick={() =>
                duplicateBannerSlide({
                  dispatch,
                  location: bannerSlide,
                  selectSlider: true,
                  getSelectorForId,
                })
              }
            >
              Duplicate Item
            </Menu.Item>
          )}
          {(rawType === 'Image' || rawType === 'Video') && componentId && (
            <ImageQuickAction
              key={componentId}
              id={componentId}
              kind={rawType}
              beforeOperation={bridge.beforeOperation}
              disabled={
                typeof resolvedItem?.props?.srcBinding === 'string' &&
                resolvedItem.props.srcBinding.trim().length > 0
              }
              renderTrigger={({ label: mediaLabel, disabled, onClick }) => (
                <Menu.Item disabled={disabled} onClick={onClick}>
                  {typeof resolvedItem?.props?.srcBinding === 'string' &&
                  resolvedItem.props.srcBinding.trim().length > 0
                    ? 'Source bound to item'
                    : mediaLabel}
                </Menu.Item>
              )}
            />
          )}
          {(componentType === 'Button' || componentType === 'Image' || componentType === 'Video') &&
            componentId && (
            <Menu.Item
              leftSection={<LinkIcon size={16} />}
              disabled={
                typeof resolvedItem?.props?.hrefBinding === 'string' &&
                resolvedItem.props.hrefBinding.trim().length > 0
              }
              onClick={() => bridge.openAtomLink(componentId)}
            >
              {typeof resolvedItem?.props?.hrefBinding === 'string' &&
              resolvedItem.props.hrefBinding.trim().length > 0
                ? 'Link bound to item'
                : 'Link'}
            </Menu.Item>
          )}
          {canSaveSelectedAsPattern(componentType) && (
            <Menu.Item leftSection={<Bookmark size={16} />} onClick={bridge.openSaveAsPattern}>
              Save as Pattern
            </Menu.Item>
          )}
          {componentId && (
            <Menu.Item
              leftSection={<Copy size={16} />}
              data-testid="copy-widget-id"
              onClick={() => {
                void navigator.clipboard.writeText(componentId)
              }}
            >
              Copy Widget ID
            </Menu.Item>
          )}
          {componentId && (
            <Menu.Item
              leftSection={<Copy size={16} />}
              data-testid="copy-widget-path"
              onClick={() => {
                const doc = bridge.getDocument()
                if (!doc) return
                const path = findWidgetPath(doc as any, componentId)
                if (!path) return
                void navigator.clipboard.writeText(
                  formatWidgetPath({
                    themeId: bridge.themeId || 'theme',
                    template: bridge.templateContext || 'template',
                    versionId: bridge.homeVersionId,
                    path,
                  }),
                )
              }}
            >
              Copy Widget Path
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
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

  // Slot-canonical trees keep nested widgets on props.* arrays.
  let found: { item: any; selector: { index: number; zone?: string } } | null = null
  const walk = (items: any[], zone?: string) => {
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      if (!item) continue
      if (item.props?.id === id || item._id === id || item.id === id) {
        found = { item, selector: zone ? { index, zone } : { index } }
        return
      }
      for (const value of Object.values(item.props || {})) {
        if (Array.isArray(value) && value.some((child) => child?.type && child?.props)) {
          walk(value, zone)
          if (found) return
        }
      }
    }
  }
  walk(content)
  if (!found) {
    for (const [zoneKey, items] of Object.entries(data.zones || {})) {
      walk(items as any[], zoneKey)
      if (found) break
    }
  }
  return found
}

function findParentItemId(data: Data, childId: string): string | null {
  for (const [zoneKey, items] of Object.entries(data.zones || {})) {
    if ((items as any[]).some((item) => item?.props?.id === childId)) {
      const sep = zoneKey.lastIndexOf(':')
      return sep > 0 ? zoneKey.slice(0, sep) : null
    }
  }
  let parentId: string | null = null
  const walk = (items: any[], parent?: string) => {
    for (const item of items) {
      if (!item?.props?.id) continue
      if (item.props.id === childId) {
        parentId = parent || null
        return
      }
      for (const value of Object.values(item.props || {})) {
        if (Array.isArray(value) && value.some((child) => child?.type && child?.props)) {
          walk(value, item.props.id)
          if (parentId) return
        }
      }
    }
  }
  walk(data.content || [])
  return parentId
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
  themeId?: string
  homeVersionId?: string | null
  libraryLanguage?: string
  previewControlTarget?: HTMLElement | null
  /** Lift Puck history undo/redo into the Theme Builder one-row header (UX V5). */
  onHistoryReady?: (history: ReturnType<typeof createPuckHistoryCoordinator>) => void
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
  themeId,
  homeVersionId,
  libraryLanguage,
  previewControlTarget,
  onHistoryReady,
}: PuckHostProps) {
  const [localDoc, setLocalDoc] = useState<BuilderDocument>(() =>
    document ? (canonicalizeZonesToSlots(document) as BuilderDocument) : document,
  )
  const [documentProp, setDocumentProp] = useState(document)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const latestDocRef = React.useRef<BuilderDocument>(localDoc)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  // Sync external document prop → local editor state (zones → slots) during render.
  if (document !== documentProp) {
    setDocumentProp(document)
    const canonical = document
      ? (canonicalizeZonesToSlots(document) as BuilderDocument)
      : document
    setLocalDoc(canonical)
  }
  React.useLayoutEffect(() => {
    latestDocRef.current = localDoc
  }, [localDoc])

  const pageSettingsPlugin: Plugin = useMemo(() => {
    return {
      name: 'page-settings',
      label: templateContext === 'header' ? 'Header Settings' : 'Page Settings',
      icon: <Sliders size={16} />,
      render: () => <PageSettingsPanel themeConfig={themeConfig} templateName={templateContext} />,
    }
  }, [themeConfig, templateContext])

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
      const updated = canonicalizeZonesToSlots({
        version: current.version || CURRENT_BUILDER_VERSION,
        root: data.root,
        content: data.content,
        zones: data.zones || {},
        metadata: current.metadata,
      }) as BuilderDocument
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
  const [atomLinkId, setAtomLinkId] = useState<string | null>(null)

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
    (request: StyleMenuRequest) => {
      const {
        domain,
        componentType,
        componentVariant,
        componentId,
        htmlTag,
        currentStyle,
        controlsStyle,
        bannerItemId,
        bannerItemStyle,
        anchorEl,
        initialPosition,
      } = request
      // Same widget: the dock establishes a new baseline when the domain changes.
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
      const resolvedBannerItemId =
        bannerItemId ||
        (componentType === 'BannerSlider' ? getBannerActiveSlide(componentId)?.slideId : undefined)
      const resolvedBannerItemStyle =
        bannerItemStyle ||
        (componentType === 'BannerSlider' && resolvedBannerItemId
          ? stripSlideItemMargin(
              puckApiRef.current?.findItem?.(resolvedBannerItemId)?.item?.props?.style,
            ) || EMPTY_STYLE
          : undefined)
      setActiveStyleMenu({
        opened: true,
        domain,
        componentType,
        componentVariant,
        componentId,
        htmlTag: resolvedTag,
        currentStyle:
          (item?.props?.style as WidgetSemanticStyle) || currentStyle || EMPTY_STYLE,
        listPresentation: item?.props?.listPresentation,
        controlsStyle: controlsStyle || item?.props?.controlsStyle,
        bannerItemId: resolvedBannerItemId,
        bannerItemStyle: resolvedBannerItemStyle,
        anchorEl,
        initialPosition,
      })
    },
    [activeStyleMenu, setAtomLinkId, setPuckRightSidebar],
  )

  React.useEffect(() => {
    if (!activeStyleMenu?.opened || activeStyleMenu.componentType !== 'BannerSlider') return
    return subscribeBannerActiveSlide((sliderId, state) => {
      if (sliderId !== activeStyleMenu.componentId) return
      // Only refresh Style Target payload when the viewed Banner Item changes (Next/Prev).
      // Style edits already update activeStyleMenu via handleUpdateBannerItemStyle — re-pushing
      // a new style object here caused Maximum update depth exceeded.
      setActiveStyleMenu((prev) => {
        if (!prev || prev.bannerItemId === state.slideId) return prev
        const slide = state.slideId ? puckApiRef.current?.findItem?.(state.slideId)?.item : null
        return {
          ...prev,
          bannerItemId: state.slideId,
          bannerItemStyle: stripSlideItemMargin(slide?.props?.style) || EMPTY_STYLE,
        }
      })
    })
  }, [activeStyleMenu?.componentId, activeStyleMenu?.componentType, activeStyleMenu?.opened])

  const handleCloseStyleMenu = useCallback(() => {
    stylePreviewStore.clearPreview()
    setActiveStyleMenu(null)
    setPuckRightSidebar(false)
  }, [setPuckRightSidebar])

  const patchWidgetPropsById = useCallback(
    (componentId: string, patch: Record<string, unknown>, options?: { recordHistory?: boolean }) => {
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
              ...patch,
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
      return true
    },
    [],
  )

  const patchActiveWidgetProps = useCallback(
    (patch: Record<string, unknown>, options?: { recordHistory?: boolean }) => {
      if (!activeStyleMenu) return false
      return patchWidgetPropsById(activeStyleMenu.componentId, patch, options)
    },
    [activeStyleMenu, patchWidgetPropsById],
  )

  const handleUpdateWidgetStyle = useCallback(
    (newStyle: WidgetSemanticStyle, options?: { recordHistory?: boolean }) => {
      if (!patchActiveWidgetProps({ style: newStyle }, options)) return false
      setActiveStyleMenu((prev) => (prev ? { ...prev, currentStyle: newStyle } : null))
      return true
    },
    [patchActiveWidgetProps],
  )

  const handleUpdateListPresentation = useCallback(
    (presentation: import('@/lib/style-engine/list-presentation').ListPresentationConfig, options?: { recordHistory?: boolean }) => {
      if (!patchActiveWidgetProps({ listPresentation: presentation }, options)) return false
      setActiveStyleMenu((prev) => (prev ? { ...prev, listPresentation: presentation } : prev))
      return true
    },
    [patchActiveWidgetProps],
  )

  const handleUpdateControlsStyle = useCallback(
    (
      presentation: import('@/widgets/BannerSlider/style-targets').BannerSliderControlsStyle,
      options?: { recordHistory?: boolean },
    ) => {
      if (!patchActiveWidgetProps({ controlsStyle: presentation }, options)) return false
      setActiveStyleMenu((prev) => (prev ? { ...prev, controlsStyle: presentation } : prev))
      return true
    },
    [patchActiveWidgetProps],
  )

  const handleUpdateBannerItemStyle = useCallback(
    (slideId: string, style: WidgetSemanticStyle, options?: { recordHistory?: boolean }) => {
      const safe = stripSlideItemMargin(style) || {}
      if (!patchWidgetPropsById(slideId, { style: safe }, options)) return false
      setActiveStyleMenu((prev) =>
        prev ? { ...prev, bannerItemId: slideId, bannerItemStyle: safe } : prev,
      )
      return true
    },
    [patchWidgetPropsById],
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

      let found = api.findItem?.(compId) || findItemAndSelector(data, compId)
      if (!found) return

      // SlideItem chrome is not a Style target — open Banner Slider Style Targets instead.
      if (found.item.type === 'SlideItem') {
        const parentId = findParentItemId(data, found.item.props.id)
        const parent = parentId
          ? api.findItem?.(parentId) || findItemAndSelector(data, parentId)
          : null
        if (!parent || parent.item.type !== 'BannerSlider') return
        found = parent
      }

      const { item, selector } = found
      // BannerSlider: root Style domains are empty (Section owns chrome); Style Targets cover
      // Banner Item / arrows / pagination via the shared Style menu.
      if (
        item.type !== 'BannerSlider' &&
        !getComponentStyleCapabilities(item.type).length
      ) {
        return
      }
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

  const handleSelectionChange = useCallback((id: string | undefined) => {
    setAtomLinkId((previous) => (previous && previous !== id ? null : previous))

    const styleOpen = Boolean(activeStyleMenu?.opened)
    const styleComponentId = activeStyleMenu?.componentId
    const selected = id ? puckApiRef.current?.findItem?.(id)?.item : undefined

    if (id && selected?.type === 'Button') {
      if (styleComponentId === id && styleOpen) return
      setPuckRightSidebar(false)
      handleOpenStyleMenu({
        domain: 'button',
        componentType: 'Button',
        componentId: id,
        currentStyle: selected.props?.style || EMPTY_STYLE,
        anchorEl: null,
      })
      return
    }

    if (id && selected && styleOpen && id !== styleComponentId) {
      stylePreviewStore.clearPreview(styleComponentId)
      setActiveStyleMenu(null)
      setPuckRightSidebar(true)
      return
    }

    if (!styleOpen) {
      // Floating Fields: open on selection, hide when cleared (no grid width either way).
      setPuckRightSidebar(Boolean(id))
      return
    }

    const targetStillExists = Boolean(
      styleComponentId && puckApiRef.current?.findItem?.(styleComponentId),
    )
    const decision = planStyleSelectionLock({
      styleOpen: true,
      styleComponentId,
      selectedId: id,
      targetStillExists,
    })

    if (decision.action === 'keep') return

    if (decision.action === 'close-missing') {
      if (styleComponentId) stylePreviewStore.clearPreview(styleComponentId)
      setActiveStyleMenu(null)
      setPuckRightSidebar(Boolean(id))
      return
    }

    const found = styleComponentId ? puckApiRef.current?.findItem?.(styleComponentId) : null
    const selector = found?.selector
    if (selector) {
      window.requestAnimationFrame(() => {
        if (!styleComponentId || !puckApiRef.current?.findItem?.(styleComponentId)) return
        puckApiRef.current?.dispatch({
          type: 'setUi',
          ui: { itemSelector: selector },
        })
      })
    }
  }, [activeStyleMenu?.opened, activeStyleMenu?.componentId, handleOpenStyleMenu, setAtomLinkId, setActiveStyleMenu, setPuckRightSidebar])

  const openAtomLink = useCallback(
    (componentId: string) => {
      stylePreviewStore.clearPreview()
      setActiveStyleMenu(null)
      setAtomLinkId(componentId)
    },
    [setActiveStyleMenu, setAtomLinkId],
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
  }, [activeStyleMenu?.opened, setActiveStyleMenu, setAtomLinkId, setPuckRightSidebar])

  const openSaveAsPattern = useCallback(() => {
    setSaveAsPatternOpened(true)
  }, [])
  const closeSaveAsPattern = useCallback(() => {
    setSaveAsPatternOpened(false)
  }, [])

  // After Undo/Redo / Fields edits, resync open Style modal from the live document.
  // If the target widget was deleted/invalidated, close safely (never retarget).
  React.useEffect(() => {
    if (!activeStyleMenu?.opened) return
    const api = puckApiRef.current
    if (!api?.findItem) return
    const found = api.findItem(activeStyleMenu.componentId)
    if (!found) {
      stylePreviewStore.clearPreview(activeStyleMenu.componentId)
      setActiveStyleMenu(null)
      setPuckRightSidebar(true)
      return
    }
    const nextStyle = (found.item?.props?.style as WidgetSemanticStyle) || EMPTY_STYLE
    const nextPresentation = found.item?.props?.listPresentation
    const nextTag =
      typeof found.item?.props?.tag === 'string' ? found.item.props.tag : null
    setActiveStyleMenu((previous) => {
      if (!previous) return previous
      const styleSame =
        JSON.stringify(previous.currentStyle || {}) === JSON.stringify(nextStyle || {})
      const tagSame = (previous.htmlTag || null) === nextTag
      const presentationSame =
        JSON.stringify(previous.listPresentation) === JSON.stringify(nextPresentation)
      if (styleSame && tagSame && presentationSame) return previous
      return { ...previous, currentStyle: nextStyle, htmlTag: nextTag, listPresentation: nextPresentation }
    })
  }, [localDoc, activeStyleMenu?.opened, activeStyleMenu?.componentId, setPuckRightSidebar])

  React.useEffect(() => {
    onHistoryReady?.(createPuckHistoryCoordinator(() => puckApiRef.current?.getHistory?.() || null))
  }, [onHistoryReady])

  const bridgeValue: EditorBridgeValue = {
    openAtomSettings,
    openAtomLink,
    openSaveAsPattern,
    closeSaveAsPattern,
    saveAsPatternOpened,
    templateContext,
    themeId,
    homeVersionId,
    libraryLanguage,
    themeConfig,
    previewControlTarget,
    beforeOperation: () => true,
    getDocument: () => latestDocRef.current as unknown as Data,
    registerApi: handleRegisterPuckApi,
    select: handleSelectionChange,
    openStyle: handleOpenStyleMenu,
    styleComponentId: activeStyleMenu?.opened ? activeStyleMenu.componentId : undefined,
  }
  const activeViewports = desktopOnly ? DESKTOP_ONLY_VIEWPORT : viewports || RESPONSIVE_VIEWPORTS
  const puckUi = useMemo(
    () => ({
      // Floating Fields start closed; selection opens them without reserving grid width.
      rightSideBarVisible: false,
      leftSideBarVisible: !templateContext,
      viewports: {
        current: { width: '100%' as const, height: 'auto' as const },
        options: activeViewports,
        controlsVisible: !desktopOnly,
      },
    }),
    [activeViewports, desktopOnly, templateContext],
  )
  const plugins = useMemo(
    () => (templateContext ? THEME_WORKSPACE_PLUGINS : [pageSettingsPlugin]),
    [pageSettingsPlugin, templateContext],
  )

  return (
    <BuilderTemplateProvider templateContext={templateContext as TemplateContext | undefined}>
    <BuilderChromeProvider themeConfig={themeConfig}>
    <EditorBridgeContext.Provider value={bridgeValue}>
      <Box
        className={[
          'zyvavu-puck-host-wrapper',
          actionBarStyles.libraryHost,
          workspaceStyles.workspaceShell,
          templateContext ? workspaceStyles.themeNavigation : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-editor-workspace="true"
        data-right-dock={activeStyleMenu?.opened ? 'style' : undefined}
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
          data-style-modal-open={activeStyleMenu?.opened ? 'true' : undefined}
          data-style-modal-component={
            activeStyleMenu?.opened ? activeStyleMenu.componentId : undefined
          }
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
            inWorkspace
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
            sectionLayoutProps={activeStyleMenu.componentType === 'Section' ? {
              ...findItemAndSelector(puckData, activeStyleMenu.componentId)?.item.props,
              pageContainerWidth: resolveEffectivePageLayout(
                localDoc.root?.props?.pageSettings,
                themeConfig?.tokens,
              ).containerWidth,
            } : undefined}
            columnGap={activeStyleMenu.componentType === 'Columns'
              ? findItemAndSelector(puckData, activeStyleMenu.componentId)?.item.props?.gap
              : undefined}
            themeConfig={themeConfig}
            listPresentation={activeStyleMenu.listPresentation}
            controlsStyle={activeStyleMenu.controlsStyle}
            bannerItemId={activeStyleMenu.bannerItemId}
            bannerItemStyle={activeStyleMenu.bannerItemStyle}
            onUpdateStyle={handleUpdateWidgetStyle}
            onUpdateListPresentation={
              activeStyleMenu.componentType === 'CategoryList'
                ? handleUpdateListPresentation
                : undefined
            }
            onUpdateControlsStyle={
              activeStyleMenu.componentType === 'BannerSlider'
                ? handleUpdateControlsStyle
                : undefined
            }
            onUpdateBannerItemStyle={
              activeStyleMenu.componentType === 'BannerSlider'
                ? handleUpdateBannerItemStyle
                : undefined
            }
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
            const item = atomLinkId ? puckApiRef.current?.findItem?.(atomLinkId)?.item : undefined
            setAtomLinkId(null)
            if (item?.type === 'Button') return
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
    </BuilderTemplateProvider>
  )
}
