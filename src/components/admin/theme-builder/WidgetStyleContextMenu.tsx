'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActionIcon, Box, Button, Group, Stack, Text, Tooltip } from '@mantine/core'
import { Bookmark, ChevronRight, Minimize2, Paintbrush } from 'lucide-react'
import { resolveSectionLayout, type SectionLayoutProps } from '@/lib/style-engine/effective-defaults'
import { resetResponsiveSpacing, type ResponsiveBreakpoint } from '@/lib/style-engine/responsive-style'
import {
  getStyleModalDomains,
  orderStyleToolbarDomains,
  resetStyleGroup,
  STYLE_MODAL_TITLES,
  type StyleDomainGroup,
  type StyleModalDomain,
} from '@/lib/style-engine/domains'
import {
  cancelWidgetAnimation,
  replayWidgetAnimation,
} from '@/lib/style-engine/animation-replay'
import {
  createStyleSessionSnapshot,
  getCancelRestoreStyle,
  getDomainResetStyle,
  stylesEqual,
  type StyleSessionSnapshot,
} from '@/lib/style-engine/style-session-contract'

import type { ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { SharedDraggableModal } from '@/components/admin/shared/SharedDraggableModal'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import {
  getComponentStyleCapabilities,
  normalizeComponentType,
} from '@/lib/style-engine/capabilities'
import type { GradientDef, MeshDef, StyleDomain, UniversalStyle } from '@/lib/style-engine/types'

import { TypographyStyleControl } from './style-controls/TypographyStyleControl'
import { BackgroundStyleControl } from './style-controls/BackgroundStyleControl'
import { SpacingDimensionsControl } from './style-controls/SpacingDimensionsControl'
import { BordersEffectsControl } from './style-controls/BordersEffectsControl'
import { ButtonStyleControl } from './style-controls/ButtonStyleControl'
import { AnimationPresetPicker } from '@/components/admin/shared/AnimationPresetPicker'
import { validateUniversalStyle } from '@/lib/style-engine/validation'

export function computeTranslatedAnchorPosition(
  anchor: HTMLElement | null,
  width = 360,
  height = 500,
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 340, y: 80 }

  const padding = 12
  const minTopToolbarClearance = 68

  if (!anchor) {
    const defaultX = Math.min(336, Math.max(padding, window.innerWidth - width - padding))
    const defaultY = Math.min(
      80,
      Math.max(minTopToolbarClearance, window.innerHeight - height - padding),
    )
    return { x: Math.max(padding, defaultX), y: Math.max(minTopToolbarClearance, defaultY) }
  }

  const rawRect = anchor.getBoundingClientRect()
  const doc = anchor.ownerDocument || document
  const win = doc.defaultView || window

  let rect = {
    left: rawRect.left,
    right: rawRect.right,
    top: rawRect.top,
    bottom: rawRect.bottom,
    width: rawRect.width,
    height: rawRect.height,
  }

  if (win !== window && win.frameElement) {
    const iframeRect = win.frameElement.getBoundingClientRect()
    rect = {
      left: iframeRect.left + rawRect.left,
      right: iframeRect.left + rawRect.right,
      top: iframeRect.top + rawRect.top,
      bottom: iframeRect.top + rawRect.bottom,
      width: rawRect.width,
      height: rawRect.height,
    }
  } else if (win !== window) {
    const previewFrame =
      document.querySelector('iframe#preview-frame') || document.querySelector('iframe')
    if (previewFrame) {
      const iframeRect = previewFrame.getBoundingClientRect()
      rect = {
        left: iframeRect.left + rawRect.left,
        right: iframeRect.left + rawRect.right,
        top: iframeRect.top + rawRect.top,
        bottom: iframeRect.top + rawRect.bottom,
        width: rawRect.width,
        height: rawRect.height,
      }
    }
  }

  let x = rect.right + padding
  if (x + width > window.innerWidth - padding) {
    const inwardCandidate = rect.right - width
    const leftCandidate = rect.left - width - padding
    if (inwardCandidate >= padding && inwardCandidate + width <= window.innerWidth - padding) {
      x = inwardCandidate
    } else if (leftCandidate >= padding) {
      x = leftCandidate
    } else {
      x = Math.max(padding, window.innerWidth - width - padding)
    }
  }
  x = Math.max(padding, Math.min(x, window.innerWidth - width - padding))

  let y = rect.top
  if (rect.top < minTopToolbarClearance) {
    y = Math.max(minTopToolbarClearance, rect.bottom + 8)
  }
  if (y + height > window.innerHeight - padding) {
    const topCandidate = rect.top - height - 8
    if (topCandidate >= minTopToolbarClearance) {
      y = topCandidate
    } else {
      y = Math.max(minTopToolbarClearance, window.innerHeight - height - padding)
    }
  }
  y = Math.max(minTopToolbarClearance, Math.min(y, window.innerHeight - height - padding))

  return { x, y }
}

export interface WidgetStyleContextMenuProps {
  domain?: StyleModalDomain
  requestNonce?: number
  opened: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
  initialPosition?: { x: number; y: number }
  componentType: string
  componentVariant?: string
  componentId: string
  /** Semantic HTML tag from Atom Settings — independent of typography overrides. */
  htmlTag?: string | null
  currentStyle?: WidgetSemanticStyle
  sectionLayoutProps?: SectionLayoutProps
  columnGap?: string
  themeConfig?: ThemeConfig
  inWorkspace?: boolean
  /** Direct-commit into Puck document (recordHistory handled by host). */
  onUpdateStyle: (
    style: WidgetSemanticStyle,
    options?: { recordHistory?: boolean },
  ) => boolean | void
  /** Optional ActionBar-parity pattern save from the right-click domain launcher. */
  onSaveAsPattern?: () => void
}

const EMPTY_STYLE: WidgetSemanticStyle = Object.freeze({})

export function WidgetStyleContextMenu(props: WidgetStyleContextMenuProps) {
  return props.opened ? (
    <WidgetStyleSession key={`${props.componentType}:${props.componentId}`} {...props} />
  ) : null
}

function WidgetStyleSession({
  domain,
  requestNonce,
  opened,
  onClose,
  componentType: rawComponentType,
  componentVariant,
  componentId,
  htmlTag = null,
  currentStyle = EMPTY_STYLE,
  sectionLayoutProps,
  columnGap,
  themeConfig,
  inWorkspace = false,
  onUpdateStyle,
  onSaveAsPattern,
}: WidgetStyleContextMenuProps) {
  const componentType = normalizeComponentType(rawComponentType)

  const sessionRef = useRef<StyleSessionSnapshot>(
    createStyleSessionSnapshot(componentId, currentStyle, domain),
  )
  const [liveStyle, setLiveStyle] = useState<WidgetSemanticStyle>(() => currentStyle || {})
  const [spacingBreakpoint, setSpacingBreakpoint] = useState<ResponsiveBreakpoint>('desktop')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [mediaPickerOpened, setMediaPickerOpened] = useState(false)
  const [animationPickerOpened, setAnimationPickerOpened] = useState(false)
  const [shellRevision, setShellRevision] = useState(0)
  const prePaletteStyleRef = useRef<WidgetSemanticStyle | null>(null)
  /** Latest style committed during an open color picker (avoids stale keep-close). */
  const paletteLiveRef = useRef<WidgetSemanticStyle>(currentStyle || {})
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null)
  const [colorModalTarget, setColorModalTarget] = useState<
    'text' | 'background' | 'overlay' | 'border' | 'fallback' | 'pattern' | null
  >(null)
  const [borderColorSide, setBorderColorSide] = useState<'top' | 'right' | 'bottom' | 'left'>()
  /** UX V5 — collapse hides chrome but keeps session/domain/target. */
  const [designCollapsed, setDesignCollapsed] = useState(false)

  const domains = useMemo(
    () => orderStyleToolbarDomains(getStyleModalDomains(componentType, componentVariant)),
    [componentType, componentVariant],
  )
  /** Focused domain editor — never the old all-domains Accordion. */
  const [activeDomain, setActiveDomain] = useState<StyleModalDomain | null>(
    domain || null,
  )

  const [handledRequest, setHandledRequest] = useState({ domain, requestNonce })
  if (handledRequest.domain !== domain || handledRequest.requestNonce !== requestNonce) {
    setHandledRequest({ domain, requestNonce })
    if (domain) setActiveDomain(domain)
    else if (requestNonce !== handledRequest.requestNonce) setActiveDomain(null)
  }

  const focusedDomain = activeDomain && domains.includes(activeDomain) ? activeDomain : null

  // External document sync (Undo/Redo / host refresh) → panel values.
  useEffect(() => {
    if (!stylesEqual(liveStyle, currentStyle)) {
      setLiveStyle(currentStyle || {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: follow host SoT only
  }, [currentStyle])

  const replayCleanup = useRef<(() => void) | null>(null)
  const stopReplay = useCallback(() => {
    replayCleanup.current?.()
    replayCleanup.current = null
    cancelWidgetAnimation(componentId)
  }, [componentId])
  useEffect(() => () => stopReplay(), [stopReplay])

  const manifest = useMemo(() => {
    try {
      return getWidgetManifest(componentType)
    } catch {
      return null
    }
  }, [componentType])

  const capabilities: StyleDomain[] = useMemo(() => {
    return getComponentStyleCapabilities(componentType, manifest || undefined, {
      variant: componentVariant,
    })
  }, [componentType, manifest, componentVariant])

  const hasTypography = capabilities.includes('typography')
  const hasBackground = capabilities.includes('background')
  const hasSpacingOrDimensions =
    capabilities.includes('spacing') ||
    capabilities.includes('dimensions') ||
    capabilities.includes('section')
  const hasBorderOrEffects =
    capabilities.includes('border') ||
    capabilities.includes('shadow') ||
    capabilities.includes('effects')

  const normalizeStyle = useCallback((style: WidgetSemanticStyle): UniversalStyle => {
    const s = style as UniversalStyle
    const typoObject =
      s.typography && typeof s.typography === 'object'
        ? s.typography
        : typeof style.typography === 'string'
          ? { typography: style.typography }
          : {}
    return {
      ...s,
      typography: {
        ...typoObject,
        typography:
          typoObject.typography ||
          (typeof style.typography === 'string' ? style.typography : undefined),
        colorToken: typoObject.colorToken || style.colorToken,
        align: typoObject.align || style.align,
      },
      background:
        s.background ||
        (style.backgroundToken ? { mode: 'color', colorToken: style.backgroundToken } : undefined),
      spacing:
        s.spacing && typeof s.spacing === 'object'
          ? s.spacing
          : typeof style.spacing === 'string'
            ? { padding: { token: style.spacing } }
            : undefined,
      radius:
        s.radius && typeof s.radius === 'object'
          ? s.radius
          : typeof style.radius === 'string'
            ? { radiusToken: style.radius }
            : undefined,
    }
  }, [])

  const normalizedLive: UniversalStyle = useMemo(
    () => normalizeStyle(liveStyle),
    [liveStyle, normalizeStyle],
  )

  // Effect / selection changes must not leave a dangling canvas preview.
  useEffect(() => {
    stopReplay()
  }, [componentId, normalizedLive.animation?.preset, stopReplay])

  const commitStyle = useCallback(
    (next: WidgetSemanticStyle, options?: { recordHistory?: boolean }) => {
      const validation = validateUniversalStyle(next)
      if (!validation.valid) {
        setValidationError(validation.errors.join('; '))
        return false
      }
      setValidationError(null)
      paletteLiveRef.current = next
      setLiveStyle(next)
      if (onUpdateStyle(next, options) === false) return false
      return true
    },
    [onUpdateStyle],
  )

  const updatePartial = useCallback(
    (partial: Partial<UniversalStyle>) => {
      const merged: WidgetSemanticStyle & Record<string, unknown> = {
        ...liveStyle,
        ...partial,
      }
      if (partial.typography !== undefined) {
        // Typography object is the SoT; clear legacy flats when overrides are removed.
        merged.typography = partial.typography
        if (partial.typography?.colorToken) merged.colorToken = partial.typography.colorToken
        else delete merged.colorToken
        if (partial.typography?.align) merged.align = partial.typography.align
        else delete merged.align
      }
      for (const [key, value] of Object.entries(partial)) {
        if (value === undefined || (value && typeof value === 'object' && !Object.keys(value).length)) {
          delete merged[key]
        }
      }
      if (!stylesEqual(merged, liveStyle)) commitStyle(merged)
    },
    [liveStyle, commitStyle],
  )

  const handleCancelSession = useCallback(() => {
    const restore = getCancelRestoreStyle(sessionRef.current)
    if (!stylesEqual(restore, liveStyle)) {
      commitStyle(restore)
    }
    onClose()
  }, [commitStyle, liveStyle, onClose])

  const handleResetDomain = useCallback(
    (target: StyleModalDomain) => {
      if (target === 'spacing' && spacingBreakpoint !== 'desktop') {
        updatePartial({ responsive: resetResponsiveSpacing(liveStyle.responsive, spacingBreakpoint) })
        return
      }
      setShellRevision((value) => value + 1)
      const next = getDomainResetStyle(liveStyle, target, {
        sectionClearsShadowEffects: componentType === 'Section',
      })
      commitStyle(next)
    },
    [liveStyle, componentType, commitStyle, spacingBreakpoint, updatePartial],
  )

  const handleResetGroup = useCallback(
    (group: StyleDomainGroup) => {
      setShellRevision((value) => value + 1)
      commitStyle(resetStyleGroup(liveStyle, group) as WidgetSemanticStyle)
    },
    [liveStyle, commitStyle],
  )

  const handleOpenColorModal = (
    target: 'text' | 'background' | 'overlay' | 'border' | 'fallback' | 'pattern',
    anchor?: HTMLElement | null,
    side?: 'top' | 'right' | 'bottom' | 'left',
  ) => {
    if (
      typeof document !== 'undefined' &&
      document.activeElement &&
      'blur' in document.activeElement
    ) {
      ;(document.activeElement as HTMLElement).blur()
    }
    prePaletteStyleRef.current = liveStyle
    paletteLiveRef.current = liveStyle
    setColorAnchorEl(anchor || null)
    setBorderColorSide(side)
    setColorModalTarget(target)
  }

  /** Cancel / X / Escape: restore picker-open snapshot without a history step. */
  const handlePaletteCancel = useCallback(() => {
    const snapshot = prePaletteStyleRef.current
    if (snapshot && !stylesEqual(snapshot, paletteLiveRef.current)) {
      commitStyle(snapshot, { recordHistory: false })
    }
    setColorAnchorEl(null)
    setColorModalTarget(null)
  }, [commitStyle])

  /** Outside click / solid finalize: keep live value as one history step. */
  const handlePaletteKeepClose = useCallback(() => {
    commitStyle(paletteLiveRef.current, { recordHistory: true })
    setColorAnchorEl(null)
    setColorModalTarget(null)
  }, [commitStyle])

  const buildCandidateDraftWithToken = useCallback(
    (target: string, tokenId: string): WidgetSemanticStyle => {
      const base = liveStyle
      const baseNorm = normalizeStyle(base)
      if (target === 'text') {
        return {
          ...base,
          typography: { ...baseNorm.typography, colorToken: tokenId },
          colorToken: tokenId,
        }
      }
      if (target === 'overlay') {
        if (baseNorm.background?.mode === 'image') {
          return {
            ...base,
            background: {
              ...baseNorm.background,
              image: {
                ...baseNorm.background?.image,
                overlay: { ...baseNorm.background?.image?.overlay, colorToken: tokenId },
              },
            },
          }
        }
        if (baseNorm.background?.mode === 'video') {
          return {
            ...base,
            background: {
              ...baseNorm.background,
              video: {
                ...baseNorm.background?.video,
                overlay: { ...baseNorm.background?.video?.overlay, colorToken: tokenId },
              },
            },
          }
        }
      }
      if (target === 'fallback') {
        if (baseNorm.background?.mode === 'image') {
          return {
            ...base,
            background: {
              ...baseNorm.background,
              image: {
                ...baseNorm.background?.image,
                fallbackColorToken: tokenId,
              },
            },
          }
        }
        if (baseNorm.background?.mode === 'video') {
          return {
            ...base,
            background: {
              ...baseNorm.background,
              video: {
                ...baseNorm.background?.video,
                fallbackColorToken: tokenId,
              },
            },
          }
        }
      }
      if (target === 'pattern') {
        return {
          ...base,
          background: {
            ...baseNorm.background,
            pattern: {
              ...(baseNorm.background?.pattern || baseNorm.background?.image?.pattern),
              colorToken: tokenId,
            },
          },
        }
      }
      if (target === 'border') {
        if (borderColorSide) {
          return {
            ...base,
            border: {
              ...baseNorm.border,
              sides: {
                ...baseNorm.border?.sides,
                [borderColorSide]: {
                  ...baseNorm.border?.sides?.[borderColorSide],
                  colorToken: tokenId,
                },
              },
            },
          }
        }
        return {
          ...base,
          border: { ...baseNorm.border, colorToken: tokenId },
        }
      }
      return {
        ...base,
        background: {
          ...baseNorm.background,
          mode: 'color',
          colorToken: tokenId,
          gradient: undefined,
          mesh: undefined,
        },
        backgroundToken: tokenId,
      }
    },
    [liveStyle, normalizeStyle, borderColorSide],
  )

  const buildCandidateDraftWithGradient = useCallback(
    (gradient: GradientDef): WidgetSemanticStyle => ({
      ...liveStyle,
      background: {
        ...normalizedLive.background,
        mode: 'color',
        gradient,
        mesh: undefined,
      },
    }),
    [liveStyle, normalizedLive],
  )

  const buildCandidateDraftWithMesh = useCallback(
    (mesh: MeshDef): WidgetSemanticStyle => ({
      ...liveStyle,
      background: {
        ...normalizedLive.background,
        mode: 'color',
        mesh,
        gradient: undefined,
      },
    }),
    [liveStyle, normalizedLive],
  )

  const renderDomainBody = (tab: StyleModalDomain) => {
    if (tab === 'button' && capabilities.includes('button')) {
      return (
        <ButtonStyleControl
          key={`${componentId}:${shellRevision}`}
          themeConfig={themeConfig}
          value={normalizedLive.button}
          onChange={(button) => updatePartial({ button })}
          typography={
            <TypographyStyleControl
              value={normalizedLive.typography}
              themeConfig={themeConfig}
              htmlTag={htmlTag}
              widgetType={componentType}
              onChange={(typography) => updatePartial({ typography })}
              onResetDomain={() => handleResetDomain('typography')}
              onOpenColorModal={(el) => handleOpenColorModal('text', el)}
              responsive={normalizedLive.responsive}
              onChangeResponsive={(responsive) => updatePartial({ responsive })}
            />
          }
        />
      )
    }
    if (tab === 'animation' && capabilities.includes('animation')) {
      return (
        <AnimationPresetPicker
          inline
          target={componentType === 'Section' ? 'section' : 'widget'}
          onOpenChange={setAnimationPickerOpened}
          value={normalizedLive.animation}
          onChange={(animation) => {
            stopReplay()
            updatePartial({ animation })
          }}
          onTestAnimation={(animation) => {
            stopReplay()
            const result = replayWidgetAnimation(componentId, animation, { force: true })
            replayCleanup.current = result.cancel
            if (result.message?.includes('unavailable') || result.message?.includes('not available')) {
              setValidationError(result.message)
            } else {
              setValidationError(null)
            }
            return result.message
          }}
        />
      )
    }
    if (tab === 'typography' && hasTypography) {
      return (
        <TypographyStyleControl
          value={normalizedLive.typography}
          themeConfig={themeConfig}
          htmlTag={htmlTag}
          widgetType={componentType}
          onChange={(typo) => updatePartial({ typography: typo })}
          onResetDomain={() => handleResetDomain('typography')}
          onOpenColorModal={(el) => handleOpenColorModal('text', el)}
          responsive={normalizedLive.responsive}
          onChangeResponsive={(responsive) => updatePartial({ responsive })}
        />
      )
    }
    if (tab === 'background' && hasBackground) {
      return (
        <BackgroundStyleControl
          onMediaOpenChange={setMediaPickerOpened}
          colorOnly={false}
          value={normalizedLive.background}
          themeConfig={themeConfig}
          onChange={(bg) => updatePartial({ background: bg })}
          onOpenColorModal={(target, el) => handleOpenColorModal(target, el)}
          onResetGroup={handleResetGroup}
        />
      )
    }
    if (tab === 'spacing' && hasSpacingOrDimensions) {
      return (
        <SpacingDimensionsControl
          spacing={normalizedLive.spacing}
          dimensions={normalizedLive.dimensions}
          sectionLayout={componentType === 'Section' ? resolveSectionLayout(normalizedLive, sectionLayoutProps) : undefined}
          sectionOverrides={normalizedLive.section}
          columns={componentType === 'Columns'}
          columnGap={columnGap}
          activeBreakpoint={spacingBreakpoint}
          onBreakpointChange={setSpacingBreakpoint}
          showDimensions={capabilities.includes('dimensions') || capabilities.includes('section')}
          onChangeSpacing={(sp) => updatePartial({ spacing: sp })}
          onChangeDimensions={(dim, key) => {
            const section = normalizedLive.section
            if (section && (key === 'containerWidth' || key === 'minHeight')) {
              const remaining = { ...section }
              delete remaining[key]
              updatePartial({ dimensions: dim, section: remaining })
            } else {
              updatePartial({ dimensions: dim })
            }
          }}
          onResetGroup={handleResetGroup}
          responsive={normalizedLive.responsive}
          onChangeResponsive={(responsive) => updatePartial({ responsive })}
        />
      )
    }
    if (['borders', 'shadow', 'effects'].includes(tab) && hasBorderOrEffects) {
      return (
        <BordersEffectsControl
          domain={
            tab === 'borders' && componentType === 'Section'
              ? 'all'
              : (tab as 'borders' | 'shadow' | 'effects')
          }
          themeConfig={themeConfig}
          border={normalizedLive.border}
          radius={normalizedLive.radius}
          shadow={normalizedLive.shadow}
          effects={normalizedLive.effects}
          onChangeBorder={(border) => updatePartial({ border })}
          onChangeRadius={(radius) => updatePartial({ radius })}
          onChangeShadow={(shadow) => updatePartial({ shadow })}
          onChangeEffects={(effects) => updatePartial({ effects })}
          onOpenColorModal={(el, side) => handleOpenColorModal('border', el, side)}
          onResetGroup={handleResetGroup}
        />
      )
    }
    return (
      <Text size="sm" c="dimmed">
        This domain is not available for {componentType}.
      </Text>
    )
  }

  if (!opened) return null

  const widgetLabel = manifest?.label || componentType
  const domainLabel = focusedDomain ? STYLE_MODAL_TITLES[focusedDomain] : null
  const panelTitle = domainLabel ? `${domainLabel} · ${widgetLabel}` : `Design · ${widgetLabel}`
  const panelWidth = 'min(420px, calc(100vw - 24px))'

  if (designCollapsed) {
    return (
      <Box
        data-testid="design-panel-collapsed"
        style={{
          position: inWorkspace ? 'absolute' : 'fixed',
          top: '50%',
          right: 8,
          transform: 'translateY(-50%)',
          zIndex: ADMIN_OVERLAY_LAYERS.STYLE_MODAL,
          pointerEvents: 'auto',
        }}
      >
        <Tooltip label={`Restore Design · ${widgetLabel}`} position="left">
          <ActionIcon
            size="lg"
            variant="filled"
            color="teal"
            radius="md"
            aria-label="Restore Design panel"
            onClick={() => setDesignCollapsed(false)}
          >
            <ChevronRight size={18} />
          </ActionIcon>
        </Tooltip>
      </Box>
    )
  }

  return (
    <>
      <SharedDraggableModal
        opened={opened}
        onClose={handleCancelSession}
        title={panelTitle}
        subtitle={
          focusedDomain
            ? 'Live preview · Cancel restores session · Reset clears this domain'
            : 'Choose a design domain'
        }
        headerExtra={
          <Group gap={4} wrap="nowrap">
            <Paintbrush size={15} color="var(--mantine-color-teal-7, #0e6b66)" />
            <Tooltip label="Collapse Design panel">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label="Collapse Design panel"
                onClick={() => setDesignCollapsed(true)}
              >
                <Minimize2 size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        width={panelWidth}
        mode="floating"
        withinPortal={!inWorkspace}
        withBackdrop={false}
        draggable={false}
        showCloseButton={true}
        closeOnClickOutside={false}
        initialPosition={
          typeof window === 'undefined'
            ? { x: 340, y: 56 }
            : {
                x: Math.max(12, window.innerWidth - Math.min(420, window.innerWidth - 24) - 12),
                y: 56,
              }
        }
        data-testid="unified-style-modal"
        style={{
          visibility: mediaPickerOpened ? 'hidden' : undefined,
          ...(inWorkspace
            ? { position: 'absolute', top: 0, right: 0, bottom: 0, left: 'auto', maxWidth: '100%', maxHeight: '100%' }
            : { height: 'calc(100dvh - 68px)', maxHeight: 'calc(100dvh - 68px)' }),
        }}
        closeOnEscape={!mediaPickerOpened && !animationPickerOpened && !colorModalTarget}
        zIndex={ADMIN_OVERLAY_LAYERS.STYLE_MODAL}
        footer={
          <Group justify="space-between" w="100%" wrap="nowrap">
            <Text size="xs" c="dimmed" data-style-modal-target={componentType}>
              Editing {widgetLabel}
              {domainLabel ? ` · ${domainLabel}` : ''}
            </Text>
            <Group gap="xs">
              <Button variant="default" size="xs" onClick={handleCancelSession}>
                Hủy / Cancel
              </Button>
              {focusedDomain && (
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => handleResetDomain(focusedDomain)}
                >
                  Reset domain
                </Button>
              )}
            </Group>
          </Group>
        }
      >
        <Stack gap="xs">
          {validationError && (
            <Text c="red" role="alert">
              {validationError}
            </Text>
          )}
          {!focusedDomain ? (
            <Stack gap="xs" data-testid="style-domain-launcher">
              <Text size="sm" c="dimmed">
                Open one design domain at a time.
              </Text>
              {domains.map((item) => (
                <Button
                  key={item}
                  variant="light"
                  fullWidth
                  justify="space-between"
                  onClick={() => setActiveDomain(item)}
                >
                  {STYLE_MODAL_TITLES[item]}
                </Button>
              ))}
              {onSaveAsPattern && (
                <Button
                  variant="default"
                  fullWidth
                  leftSection={<Bookmark size={16} />}
                  onClick={onSaveAsPattern}
                >
                  Save as Pattern
                </Button>
              )}
            </Stack>
          ) : (
            <Stack gap="xs" data-style-domain={focusedDomain}>
              {domains.length > 1 && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setActiveDomain(null)}
                  aria-label="Back to design domains"
                >
                  Back to Design menu
                </Button>
              )}
              {renderDomainBody(focusedDomain)}
            </Stack>
          )}
        </Stack>
      </SharedDraggableModal>

      {colorModalTarget && (
        <ThemeColorPaletteModal
          opened={Boolean(colorModalTarget)}
          title={
            colorModalTarget === 'pattern'
              ? 'Theme Pattern Color'
              : colorModalTarget === 'text'
                ? 'Theme Typography Color'
                : colorModalTarget === 'overlay'
                  ? 'Theme Overlay Color'
                  : colorModalTarget === 'border'
                    ? 'Theme Border Color'
                    : colorModalTarget === 'fallback'
                      ? 'Theme Fallback Color'
                      : 'Theme Background & Palette'
          }
          subtitle="Select theme tokens · changes apply immediately · Cancel restores this picker"
          anchorEl={colorAnchorEl}
          value={
            colorModalTarget === 'pattern'
              ? normalizedLive.background?.pattern?.colorToken || 'text'
              : colorModalTarget === 'text'
                ? normalizedLive.typography?.colorToken || 'text'
                : colorModalTarget === 'overlay'
                  ? (normalizedLive.background?.mode === 'image'
                      ? normalizedLive.background?.image?.overlay?.colorToken
                      : normalizedLive.background?.video?.overlay?.colorToken) || 'text'
                  : colorModalTarget === 'border'
                    ? (borderColorSide
                      ? normalizedLive.border?.sides?.[borderColorSide]?.colorToken
                      : normalizedLive.border?.colorToken) || 'border'
                    : colorModalTarget === 'fallback'
                      ? (normalizedLive.background?.mode === 'image'
                          ? normalizedLive.background?.image?.fallbackColorToken
                          : normalizedLive.background?.video?.fallbackColorToken) || 'surface'
                      : normalizedLive.background?.colorToken || 'surface'
          }
          tokens={themeConfig?.tokens}
          zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
          includeBackgroundTokens={true}
          supportedModes={
            colorModalTarget === 'background' ? ['solid', 'gradient', 'mesh'] : ['solid']
          }
          gradientValue={normalizedLive.background?.gradient}
          meshValue={normalizedLive.background?.mesh}
          onClose={handlePaletteKeepClose}
          onCancel={handlePaletteCancel}
          onSelectToken={(tokenId) => {
            if (!colorModalTarget) return
            // Ephemeral while picker open; keep-close records one history step.
            commitStyle(buildCandidateDraftWithToken(colorModalTarget, tokenId), {
              recordHistory: false,
            })
          }}
          onChangeGradient={(grad) => {
            commitStyle(buildCandidateDraftWithGradient(grad), { recordHistory: false })
          }}
          onChangeMesh={(mesh) => {
            commitStyle(buildCandidateDraftWithMesh(mesh), { recordHistory: false })
          }}
        />
      )}
    </>
  )
}
