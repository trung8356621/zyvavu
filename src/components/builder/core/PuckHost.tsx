'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { Puck, ActionBar, type Config, type Data, type Plugin, type Viewport, createUsePuck } from '@puckeditor/core'
import '@puckeditor/core/dist/index.css'
import { Alert, Box, Button, Group, LoadingOverlay, Text } from '@mantine/core'
import { Check, AlertCircle, Palette, Save, Sliders } from 'lucide-react'

import { CURRENT_BUILDER_VERSION, validateBuilderDocument } from './document'
import type { BuilderDocument } from './types'
import type { ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { normalizeComponentType } from '@/lib/style-engine/capabilities'
import { PageSettingsPanel } from '@/components/admin/theme-builder/PageSettingsPanel'
import { WidgetStyleContextMenu, computeTranslatedAnchorPosition } from '@/components/admin/theme-builder/WidgetStyleContextMenu'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
import actionBarStyles from './WidgetActionBar.module.css'

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
  dispatch: (action: any) => void
  getAppState: () => any
}

function PuckBridge({
  children,
  onRegisterApi,
}: {
  children: React.ReactNode
  onRegisterApi: (api: PuckApi) => void
}) {
  const appState = usePuck((s) => s.appState)
  const dispatch = usePuck((s) => s.dispatch)
  const appStateRef = React.useRef(appState)
  appStateRef.current = appState

  React.useEffect(() => {
    onRegisterApi({
      dispatch,
      getAppState: () => appStateRef.current,
    })
  }, [dispatch, onRegisterApi])

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
    componentType: string
    componentId: string
    currentStyle: WidgetSemanticStyle
    anchorEl: HTMLElement
    initialPosition: { x: number; y: number }
  }) => void
}) {
  const selectedItem = usePuck((s) => s.selectedItem)
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
  const currentStyle = (resolvedItem?.props?.style as WidgetSemanticStyle) || {}

  const handleEditStyleClick = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    const anchor = e.currentTarget as HTMLElement
    const initialPos = computeTranslatedAnchorPosition(anchor, 340, 480)
    onOpenStyleMenu({
      componentType,
      componentId,
      currentStyle,
      anchorEl: anchor,
      initialPosition: initialPos,
    })
  }

  return (
    <div
      className={actionBarStyles.toolbar}
      data-style-open={Boolean(componentId && styleMenuComponentId === componentId)}
    >
      <ActionBar>
        <ActionBar.Group>
          {parentAction}
          {label && <ActionBar.Label label={label} />}
        </ActionBar.Group>
        <ActionBar.Group>
          <span className={actionBarStyles.styleTrigger}>
            <ActionBar.Action label="Edit Style" onClick={handleEditStyleClick}>
              <Palette size={14} />
            </ActionBar.Action>
          </span>
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

  const pageSettingsPlugin: Plugin = useMemo(() => {
    return {
      name: 'page-settings',
      label: 'Page Settings',
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

  const [activeStyleMenu, setActiveStyleMenu] = useState<{
    opened: boolean
    componentType: string
    componentId: string
    currentStyle: WidgetSemanticStyle
    anchorEl: HTMLElement | null
    initialPosition?: { x: number; y: number }
  } | null>(null)

  const puckApiRef = React.useRef<PuckApi | null>(null)

  const handleRegisterPuckApi = useCallback((api: PuckApi) => {
    puckApiRef.current = api
  }, [])

  const handleOpenStyleMenu = useCallback(
    ({
      componentType,
      componentId,
      currentStyle,
      anchorEl,
      initialPosition,
    }: {
      componentType: string
      componentId: string
      currentStyle: WidgetSemanticStyle
      anchorEl: HTMLElement | null
      initialPosition?: { x: number; y: number }
    }) => {
      stylePreviewStore.clearPreview()
      setActiveStyleMenu({
        opened: true,
        componentType,
        componentId,
        currentStyle,
        anchorEl,
        initialPosition,
      })
    },
    [],
  )

  const handleCloseStyleMenu = useCallback(() => {
    stylePreviewStore.clearPreview()
    setActiveStyleMenu(null)
  }, [])

  const handleUpdateWidgetStyle = useCallback(
    (newStyle: WidgetSemanticStyle) => {
      stylePreviewStore.clearPreview()
      if (!activeStyleMenu) return
      const { componentId } = activeStyleMenu
      const api = puckApiRef.current

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
        return item
      }

      if (api) {
        api.dispatch({
          type: 'setData',
          data: (prev: Data) => ({
            ...prev,
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

      const current = latestDocRef.current || localDoc
      const updatedDoc: BuilderDocument = {
        ...current,
        content: (current.content || []).map(updateItem),
        zones: Object.fromEntries(
          Object.entries(current.zones || {}).map(([zoneKey, items]) => [
            zoneKey,
            (items as any[]).map(updateItem),
          ]),
        ),
      }
      latestDocRef.current = updatedDoc
      setLocalDoc(updatedDoc)
      if (onChange) {
        onChange(updatedDoc)
      }

      setActiveStyleMenu((prev) => (prev ? { ...prev, currentStyle: newStyle } : null))
    },
    [activeStyleMenu, localDoc, onChange],
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

      // Prevent native browser context menu ONLY for canvas components
      e.preventDefault()
      e.stopPropagation()

      const api = puckApiRef.current
      if (!api) return

      const appState = api.getAppState()
      const data = appState.data as Data

      const found = findItemAndSelector(data, compId)
      if (!found) return

      const { item, selector } = found

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

      setActiveStyleMenu({
        opened: true,
        componentType: item.type,
        componentId: item.props?.id || compId,
        currentStyle: (item.props?.style as WidgetSemanticStyle) || {},
        anchorEl: componentEl,
        initialPosition: initialPos,
      })
    }

    const viewportEl = typeof window !== 'undefined' ? window.document.querySelector('.zyvavu-puck-viewport') : null
    if (viewportEl) {
      viewportEl.addEventListener('contextmenu', handleContextMenu as EventListener)
    }

    const frameEl = typeof window !== 'undefined' ? (window.document.querySelector('#preview-frame') as HTMLIFrameElement | null) : null
    let frameDoc: Document | null = null
    const attachToFrame = () => {
      try {
        if (frameEl && frameEl.contentDocument) {
          frameDoc = frameEl.contentDocument
          frameDoc.addEventListener('contextmenu', handleContextMenu as EventListener)
        }
      } catch {
        // Cross-origin or not mounted
      }
    }

    if (frameEl) {
      frameEl.addEventListener('load', attachToFrame)
      attachToFrame()
    }

    return () => {
      if (viewportEl) {
        viewportEl.removeEventListener('contextmenu', handleContextMenu as EventListener)
      }
      if (frameEl) {
        frameEl.removeEventListener('load', attachToFrame)
      }
      if (frameDoc) {
        frameDoc.removeEventListener('contextmenu', handleContextMenu as EventListener)
      }
    }
  }, [])

  const puckOverrides = useMemo(() => {
    return {
      headerActions: () => <React.Fragment />,
      puck: ({ children }: { children: React.ReactNode }) => (
        <PuckBridge onRegisterApi={handleRegisterPuckApi}>
          {children}
        </PuckBridge>
      ),
      actionBar: (props: any) => (
        <PuckActionBarBridge
          {...props}
          onOpenStyleMenu={handleOpenStyleMenu}
          styleMenuComponentId={activeStyleMenu?.opened ? activeStyleMenu.componentId : undefined}
        />
      ),
    }
  }, [handleRegisterPuckApi, handleOpenStyleMenu, activeStyleMenu?.opened, activeStyleMenu?.componentId])

  return (
    <Box
      className="zyvavu-puck-host-wrapper"
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
        {(() => {
          const activeViewports = desktopOnly
            ? DESKTOP_ONLY_VIEWPORT
            : viewports || RESPONSIVE_VIEWPORTS
          const showControls = !desktopOnly

          return (
            <Puck
              config={config}
              data={puckData}
              plugins={[pageSettingsPlugin]}
              viewports={activeViewports}
              ui={{
                viewports: {
                  current: {
                    width: '100%',
                    height: 'auto',
                  },
                  options: activeViewports,
                  controlsVisible: showControls,
                },
              }}
              overrides={puckOverrides}
              onPublish={handlePublish}
              onChange={handlePuckChange}
            />
          )
        })()}
      </Box>

      {/* Stable Floating Style Context Menu (Owned outside transient Puck ActionBar) */}
      {activeStyleMenu?.opened && (
        <WidgetStyleContextMenu
          opened={activeStyleMenu.opened}
          onClose={handleCloseStyleMenu}
          anchorEl={activeStyleMenu.anchorEl}
          initialPosition={activeStyleMenu.initialPosition}
          componentType={activeStyleMenu.componentType}
          componentId={activeStyleMenu.componentId}
          currentStyle={activeStyleMenu.currentStyle}
          themeConfig={themeConfig}
          onUpdateStyle={handleUpdateWidgetStyle}
        />
      )}
    </Box>
  )
}
