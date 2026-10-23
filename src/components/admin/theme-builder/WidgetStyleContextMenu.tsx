'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Group, Stack, Modal, Text } from '@mantine/core'
import { Sliders } from 'lucide-react'
import {
  getStyleModalDomains,
  STYLE_MODAL_TITLES,
  resetStyleDomain,
  type StyleModalDomain,
} from '@/lib/style-engine/domains'
import { replayWidgetAnimation } from '@/lib/style-engine/animation-replay'

import type { ThemeConfig, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { SharedDraggableModal } from '@/components/admin/shared/SharedDraggableModal'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import { stylePreviewStore } from '@/lib/style-engine/preview-store'
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

  // If anchor is inside an iframe, translate coordinates relative to parent window
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

  // Primary horizontal position: right side of anchor
  let x = rect.right + padding

  // If overflowing right viewport boundary, try placing inward or to the left of anchor
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

  // Vertical position:
  let y = rect.top

  // If anchor top is near or under the top toolbar, position below the anchor
  if (rect.top < minTopToolbarClearance) {
    y = Math.max(minTopToolbarClearance, rect.bottom + 8)
  }

  // Vertical boundary clamping
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
  currentStyle?: WidgetSemanticStyle
  themeConfig?: ThemeConfig
  onUpdateStyle: (style: WidgetSemanticStyle) => boolean | void
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
  anchorEl,
  initialPosition,
  componentType: rawComponentType,
  componentVariant,
  componentId,
  currentStyle = EMPTY_STYLE,
  themeConfig,
  onUpdateStyle,
}: WidgetStyleContextMenuProps) {
  const componentType = normalizeComponentType(rawComponentType)

  // Transactional Style States:
  // 1. committedStyle: Snapshot of the style currently committed in Puck
  const [committedStyle, setCommittedStyle] = useState<WidgetSemanticStyle>(currentStyle || {})
  // 2. draftStyle: Temporary changes inside the Style Editor
  const [draftStyle, setDraftStyle] = useState<WidgetSemanticStyle>(() => currentStyle || {})
  const pendingDraftPreview = useRef(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [mediaPickerOpened, setMediaPickerOpened] = useState(false)
  const [animationPickerOpened, setAnimationPickerOpened] = useState(false)
  const [shellRevision, setShellRevision] = useState(0)
  // 3. prePaletteDraftRef: Snapshot before opening child Color Palette modal
  const prePaletteDraftRef = useRef<WidgetSemanticStyle | null>(null)

  // Color Modal Target: 'text' | 'background' | 'overlay' | 'border' | 'fallback' | null
  const [colorModalTarget, setColorModalTarget] = useState<
    'text' | 'background' | 'overlay' | 'border' | 'fallback' | null
  >(null)

  // Manifest and Style Capability check
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

  const [activeTab, setActiveTab] = useState<StyleModalDomain | null>(domain || null)
  const [pendingDomain, setPendingDomain] = useState<StyleModalDomain | null>(null)
  const switchDomain = (next: StyleModalDomain) => {
    if (next === activeTab) return
    if (JSON.stringify(draftStyle) !== JSON.stringify(committedStyle)) setPendingDomain(next)
    else setActiveTab(next)
  }
  const [handledRequest, setHandledRequest] = useState({ domain, requestNonce })
  if (handledRequest.domain !== domain || handledRequest.requestNonce !== requestNonce) {
    setHandledRequest({ domain, requestNonce })
    const dirty = JSON.stringify(draftStyle) !== JSON.stringify(committedStyle)
    if (domain && dirty && domain !== activeTab) setPendingDomain(domain)
    else if (!dirty) setActiveTab(domain || null)
    else if (!domain)
      setValidationError('Apply or cancel this draft before returning to style actions.')
  }
  const replayCleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => replayCleanup.current?.(), [])

  // Snapshot is captured at session mount; unrelated parent rerenders cannot erase a draft.
  useEffect(() => () => stylePreviewStore.clearPreview(componentId), [componentId])

  // Resolve coordinate position translating iframe offsets if necessary
  const resolvedPosition = useMemo(() => {
    if (initialPosition) return initialPosition
    if (anchorEl) return computeTranslatedAnchorPosition(anchorEl, 360, 500)
    return undefined
  }, [initialPosition, anchorEl])

  // Normalization helper
  const normalizeStyle = useCallback((style: WidgetSemanticStyle): UniversalStyle => {
    const s = style as UniversalStyle
    return {
      ...s,
      typography: {
        typography:
          s.typography?.typography ||
          (typeof style.typography === 'string' ? style.typography : undefined),
        colorToken: s.typography?.colorToken || style.colorToken,
        align: s.typography?.align || style.align,
        effectPreset: s.typography?.effectPreset,
        letterSpacing: s.typography?.letterSpacing,
        lineHeight: s.typography?.lineHeight,
        verticalText: s.typography?.verticalText,
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

  const normalizedDraft: UniversalStyle = useMemo(() => {
    return normalizeStyle(draftStyle)
  }, [draftStyle, normalizeStyle])

  // Real-time draft update that immediately updates the canvas preview without committing to Puck
  const updateDraft = useCallback(
    (partial: Partial<UniversalStyle>) => {
      pendingDraftPreview.current = true
      setDraftStyle((prev) => {
        const prevNorm = normalizeStyle(prev)
        const merged: WidgetSemanticStyle = {
          ...prev,
          ...prevNorm,
          ...partial,
          // Maintain legacy top-level mirrors for backward compatibility
          colorToken:
            partial.typography?.colorToken || prevNorm.typography?.colorToken || prev.colorToken,
          align: partial.typography?.align || prevNorm.typography?.align || prev.align,
          backgroundToken:
            partial.background?.colorToken ||
            prevNorm.background?.colorToken ||
            prev.backgroundToken,
        }
        return merged
      })
    },
    [normalizeStyle],
  )

  // Notify external canvas subscribers after React commits, never inside a state updater.
  useEffect(() => {
    if (!pendingDraftPreview.current) return
    pendingDraftPreview.current = false
    stylePreviewStore.setPreview(componentId, draftStyle)
  }, [componentId, draftStyle])

  // Apply Action: Commits draftStyle to Puck document in a single update
  const handleApply = useCallback(() => {
    const validation = validateUniversalStyle(draftStyle)
    if (!validation.valid) {
      setValidationError(validation.errors.join('; '))
      return
    }
    setValidationError(null)
    if (onUpdateStyle(draftStyle) === false) return
    pendingDraftPreview.current = false
    stylePreviewStore.clearPreview(componentId)
    onClose()
  }, [draftStyle, onUpdateStyle, componentId, onClose])

  // Cancel Action: Discards unapplied draft and restores canvas appearance
  const handleCancel = useCallback(() => {
    pendingDraftPreview.current = false
    stylePreviewStore.clearPreview(componentId)
    setDraftStyle(committedStyle)
    onClose()
  }, [componentId, onClose, committedStyle])

  // Palette Child Opening
  const handleOpenColorModal = (
    target: 'text' | 'background' | 'overlay' | 'border' | 'fallback',
  ) => {
    if (
      typeof document !== 'undefined' &&
      document.activeElement &&
      'blur' in document.activeElement
    ) {
      ;(document.activeElement as HTMLElement).blur()
    }
    prePaletteDraftRef.current = draftStyle
    setColorModalTarget(target)
  }

  // Palette Child Close/Cancel: Revert draft and canvas preview back to pre-palette state
  const handlePaletteCloseOrCancel = useCallback(() => {
    if (prePaletteDraftRef.current) {
      stylePreviewStore.setPreview(componentId, prePaletteDraftRef.current)
      setDraftStyle(prePaletteDraftRef.current)
    }
    setColorModalTarget(null)
  }, [componentId])

  // Helper to build draft with new token selection for live preview
  const buildCandidateDraftWithToken = useCallback(
    (target: string, tokenId: string): WidgetSemanticStyle => {
      const base = draftStyle
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
      if (target === 'border') {
        return {
          ...base,
          border: { ...baseNorm.border, colorToken: tokenId },
        }
      }
      // Background solid color
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
    [draftStyle, normalizeStyle],
  )

  const buildCandidateDraftWithGradient = useCallback(
    (gradient: GradientDef): WidgetSemanticStyle => {
      return {
        ...draftStyle,
        background: {
          ...normalizedDraft.background,
          mode: 'color',
          gradient,
          mesh: undefined,
        },
      }
    },
    [draftStyle, normalizedDraft],
  )

  const buildCandidateDraftWithMesh = useCallback(
    (mesh: MeshDef): WidgetSemanticStyle => {
      return {
        ...draftStyle,
        background: {
          ...normalizedDraft.background,
          mode: 'color',
          mesh,
          gradient: undefined,
        },
      }
    },
    [draftStyle, normalizedDraft],
  )

  if (!opened) return null

  return (
    <>
      <SharedDraggableModal
        opened={opened}
        onClose={handleCancel}
        title={
          activeTab
            ? `${STYLE_MODAL_TITLES[activeTab]}: ${manifest?.label || componentType}`
            : `Style actions: ${manifest?.label || componentType}`
        }
        subtitle="Configure presentation without handwritten CSS"
        headerExtra={<Sliders size={16} color="var(--mantine-color-teal-7, #0e6b66)" />}
        width={360}
        anchorEl={anchorEl}
        initialPosition={resolvedPosition}
        mode="floating"
        draggable={true}
        showCloseButton={true}
        closeOnClickOutside={false}
        style={{ visibility: mediaPickerOpened ? 'hidden' : undefined }}
        closeOnEscape={!mediaPickerOpened && !animationPickerOpened && !colorModalTarget && !pendingDomain}
        zIndex={ADMIN_OVERLAY_LAYERS.STYLE_MODAL}
        footer={
          activeTab ? (
            <Group justify="space-between" w="100%">
              <Text size="xs" c="dimmed" style={{ fontSize: 12 }}>
                {componentType}: {componentId}
              </Text>
              <Group gap="xs">
                <Button variant="default" size="xs" onClick={handleCancel}>
                  Hủy / Cancel
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setShellRevision((value) => value + 1)
                    const next = resetStyleDomain(draftStyle, activeTab!)
                    if (componentType === 'Section' && activeTab === 'borders') {
                      delete next.shadow
                      delete next.effects
                    }
                    setDraftStyle(next)
                    setValidationError(null)
                    stylePreviewStore.setPreview(componentId, next)
                  }}
                >
                  Reset domain
                </Button>
                <Button
                  color="teal"
                  size="xs"
                  disabled={animationPickerOpened}
                  onClick={handleApply}
                >
                  Áp dụng / Apply
                </Button>
              </Group>
            </Group>
          ) : undefined
        }
      >
        <Stack gap="xs">
          {validationError && (
            <Text c="red" role="alert">
              {validationError}
            </Text>
          )}
          {!activeTab &&
            getStyleModalDomains(componentType, componentVariant).map((item) => (
              <Button key={item} variant="default" onClick={() => switchDomain(item)}>
                {STYLE_MODAL_TITLES[item]}
              </Button>
            ))}

          {activeTab === 'button' && capabilities.includes('button') && (
            <ButtonStyleControl
              key={`${componentId}:${shellRevision}`}
              themeConfig={themeConfig}
              typography={
                <TypographyStyleControl
                  value={normalizedDraft.typography}
                  themeConfig={themeConfig}
                  onChange={(typography) => updateDraft({ typography })}
                  onOpenColorModal={() => handleOpenColorModal('text')}
                />
              }
            />
          )}
          {activeTab === 'animation' && capabilities.includes('animation') && (
            <Stack>
              <AnimationPresetPicker
                inline
                target={componentType === 'Section' ? 'section' : 'widget'}
                onOpenChange={setAnimationPickerOpened}
                value={normalizedDraft.animation}
                onChange={(animation) => updateDraft({ animation })}
              />
              <Button
                disabled={!normalizedDraft.animation || normalizedDraft.animation.preset === 'none'}
                onClick={() => {
                  replayCleanup.current?.()
                  const result = replayWidgetAnimation(componentId, normalizedDraft.animation)
                  replayCleanup.current = result.cancel
                  setValidationError(result.message || null)
                }}
              >
                Test Animation
              </Button>
            </Stack>
          )}

          {/* 1. TYPOGRAPHY DOMAIN */}
          {activeTab === 'typography' && hasTypography && (
            <TypographyStyleControl
              value={normalizedDraft.typography}
              themeConfig={themeConfig}
              onChange={(typo) => updateDraft({ typography: typo })}
              onOpenColorModal={() => handleOpenColorModal('text')}
            />
          )}

          {/* 2. BACKGROUND DOMAIN */}
          {activeTab === 'background' && hasBackground && (
            <BackgroundStyleControl
              onMediaOpenChange={setMediaPickerOpened}
              colorOnly={false}
              value={normalizedDraft.background}
              themeConfig={themeConfig}
              onChange={(bg) => updateDraft({ background: bg })}
              onOpenColorModal={(target) => handleOpenColorModal(target)}
            />
          )}

          {/* 3. SPACING & DIMENSIONS DOMAIN */}
          {activeTab === 'spacing' && hasSpacingOrDimensions && (
            <SpacingDimensionsControl
              spacing={normalizedDraft.spacing}
              dimensions={normalizedDraft.dimensions}
              showDimensions={
                capabilities.includes('dimensions') || capabilities.includes('section')
              }
              onChangeSpacing={(sp) => updateDraft({ spacing: sp })}
              onChangeDimensions={(dim) => updateDraft({ dimensions: dim })}
            />
          )}

          {/* 4. BORDERS & EFFECTS DOMAIN */}
          {['borders', 'shadow', 'effects'].includes(activeTab || '') && hasBorderOrEffects && (
            <BordersEffectsControl
              domain={
                activeTab === 'borders' && componentType === 'Section'
                  ? 'all'
                  : (activeTab as 'borders' | 'shadow' | 'effects')
              }
              themeConfig={themeConfig}
              border={normalizedDraft.border}
              radius={normalizedDraft.radius}
              shadow={normalizedDraft.shadow}
              effects={normalizedDraft.effects}
              onChangeBorder={(border) => updateDraft({ border })}
              onChangeRadius={(radius) => updateDraft({ radius })}
              onChangeShadow={(shadow) => updateDraft({ shadow })}
              onChangeEffects={(effects) => updateDraft({ effects })}
              onOpenColorModal={() => handleOpenColorModal('border')}
            />
          )}
        </Stack>
      </SharedDraggableModal>

      <Modal
        opened={Boolean(pendingDomain)}
        onClose={() => setPendingDomain(null)}
        title="Unapplied changes"
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
      >
        <Stack>
          <Text>Apply or discard the current domain before opening another.</Text>
          <Group>
            <Button variant="default" onClick={() => setPendingDomain(null)}>
              Continue editing
            </Button>
            <Button
              variant="subtle"
              onClick={() => {
                setDraftStyle(committedStyle)
                stylePreviewStore.clearPreview(componentId)
                setActiveTab(pendingDomain)
                setPendingDomain(null)
              }}
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                const result = validateUniversalStyle(draftStyle)
                if (!result.valid) {
                  setValidationError(result.errors.join('; '))
                  setPendingDomain(null)
                  return
                }
                if (onUpdateStyle(draftStyle) === false) return
                setCommittedStyle(draftStyle)
                stylePreviewStore.clearPreview(componentId)
                setActiveTab(pendingDomain)
                setPendingDomain(null)
              }}
            >
              Apply and continue
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* Unified Color / Gradient / Mesh Modal (Child Transactional Selection) */}
      {colorModalTarget && (
        <ThemeColorPaletteModal
          opened={Boolean(colorModalTarget)}
          anchorEl={anchorEl}
          title={
            colorModalTarget === 'text'
              ? 'Theme Typography Color'
              : colorModalTarget === 'overlay'
                ? 'Theme Overlay Color'
                : colorModalTarget === 'border'
                  ? 'Theme Border Color'
                  : colorModalTarget === 'fallback'
                    ? 'Theme Fallback Color'
                    : 'Theme Background & Palette'
          }
          subtitle="Select semantic theme tokens or custom gradients"
          value={
            colorModalTarget === 'text'
              ? normalizedDraft.typography?.colorToken || 'text'
              : colorModalTarget === 'overlay'
                ? (normalizedDraft.background?.mode === 'image'
                    ? normalizedDraft.background?.image?.overlay?.colorToken
                    : normalizedDraft.background?.video?.overlay?.colorToken) || 'text'
                : colorModalTarget === 'border'
                  ? normalizedDraft.border?.colorToken || 'border'
                  : colorModalTarget === 'fallback'
                    ? (normalizedDraft.background?.mode === 'image'
                        ? normalizedDraft.background?.image?.fallbackColorToken
                        : normalizedDraft.background?.video?.fallbackColorToken) || 'surface'
                    : normalizedDraft.background?.colorToken || 'surface'
          }
          tokens={themeConfig?.tokens}
          zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
          includeBackgroundTokens={true}
          supportedModes={
            colorModalTarget === 'background' ? ['solid', 'gradient', 'mesh'] : ['solid']
          }
          gradientValue={normalizedDraft.background?.gradient}
          meshValue={normalizedDraft.background?.mesh}
          onClose={handlePaletteCloseOrCancel}
          onCancel={handlePaletteCloseOrCancel}
          onSelectToken={(tokenId) => {
            if (!colorModalTarget) return
            const candidate = buildCandidateDraftWithToken(colorModalTarget, tokenId)
            setDraftStyle(candidate)
            stylePreviewStore.setPreview(componentId, candidate)
          }}
          onChangeGradient={(grad) => {
            const candidate = buildCandidateDraftWithGradient(grad)
            setDraftStyle(candidate)
            stylePreviewStore.setPreview(componentId, candidate)
          }}
          onChangeMesh={(mesh) => {
            const candidate = buildCandidateDraftWithMesh(mesh)
            setDraftStyle(candidate)
            stylePreviewStore.setPreview(componentId, candidate)
          }}
          onApplyToken={(tokenId) => {
            if (!colorModalTarget) return
            const candidate = buildCandidateDraftWithToken(colorModalTarget, tokenId)
            setDraftStyle(candidate)
            stylePreviewStore.setPreview(componentId, candidate)
            prePaletteDraftRef.current = candidate
            setColorModalTarget(null)
          }}
          onApplyGradient={(gradient: GradientDef) => {
            const candidate = buildCandidateDraftWithGradient(gradient)
            setDraftStyle(candidate)
            stylePreviewStore.setPreview(componentId, candidate)
            prePaletteDraftRef.current = candidate
            setColorModalTarget(null)
          }}
          onApplyMesh={(mesh: MeshDef) => {
            const candidate = buildCandidateDraftWithMesh(mesh)
            setDraftStyle(candidate)
            stylePreviewStore.setPreview(componentId, candidate)
            prePaletteDraftRef.current = candidate
            setColorModalTarget(null)
          }}
        />
      )}
    </>
  )
}
