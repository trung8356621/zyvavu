/**
 * Zyvavu-owned Animation Selector thumbnails.
 *
 * Wix E225/E228/E235 captured 60 Button effect SVGs as REFERENCE_ONLY /
 * REDRAW_REQUIRED. This module never embeds those paths. Icons here are
 * original geometry sized to the same 72×72 tile convention for UI parity.
 */
import React from 'react'
import type { AnimationConfig } from './animation-presets'

export type AnimationThumbnailId =
  | 'none'
  | 'fade'
  | 'slide-down'
  | 'grow-in'
  | 'bounce-in'
  | 'spin-in'
  | 'float-in'
  | 'breathe'
  | 'pulse'
  | 'bounce'
  | 'spin'
  | 'wiggle'
  | 'flash'
  | 'lift'
  | 'scroll-fade'

type ThumbnailProps = {
  size?: number
  title?: string
  className?: string
}

const vb = '0 0 72 72'

function Frame({ children, size = 40, title, className }: ThumbnailProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      data-zyvavu-animation-thumb=""
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** Empty tile — no motion. Decorative by default (pass title only when standalone). */
export function AnimationThumbNone(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="16" y="16" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.45" />
      <path d="M24 24 L48 48 M48 24 L24 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    </Frame>
  )
}

/** Fade — solid tile with soft trailing ghost (opacity concept). */
export function AnimationThumbFade(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="22" y="22" width="28" height="28" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="18" y="18" width="28" height="28" rx="5" fill="currentColor" opacity="0.55" />
      <rect x="14" y="14" width="28" height="28" rx="5" fill="currentColor" />
    </Frame>
  )
}

/** Slide Down — tile entering from above. */
export function AnimationThumbSlideDown(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="20" y="12" width="32" height="24" rx="4" fill="currentColor" opacity="0.28" />
      <rect x="20" y="28" width="32" height="28" rx="5" fill="currentColor" />
      <path d="M36 22 V44 M28 36 L36 46 L44 36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

/** Pulse — concentric rings. */
export function AnimationThumbPulse(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <circle cx="36" cy="36" r="22" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <circle cx="36" cy="36" r="15" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="36" cy="36" r="8" fill="currentColor" />
    </Frame>
  )
}

/** Lift — tile rising on hover. */
export function AnimationThumbLift(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <ellipse cx="36" cy="54" rx="16" ry="4" fill="currentColor" opacity="0.2" />
      <rect x="20" y="22" width="32" height="26" rx="5" fill="currentColor" />
      <path d="M36 42 V28 M28 34 L36 24 L44 34" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

/** Scroll fade — shell-only placeholder cue. */
export function AnimationThumbScrollFade(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="22" y="12" width="28" height="48" rx="10" stroke="currentColor" strokeWidth="2.5" />
      <rect x="30" y="20" width="12" height="18" rx="3" fill="currentColor" opacity="0.35" />
      <path d="M36 44 V52 M31 48 L36 54 L41 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

export function AnimationThumbGrowIn(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="28" y="28" width="16" height="16" rx="3" fill="currentColor" opacity="0.3" />
      <rect x="18" y="18" width="36" height="36" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M36 24 V48 M24 36 H48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  )
}

export function AnimationThumbBounceIn(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <path d="M18 48 Q36 18 54 48" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="36" cy="28" r="8" fill="currentColor" />
      <path d="M28 52 H44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
    </Frame>
  )
}

export function AnimationThumbSpinIn(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <circle cx="36" cy="36" r="16" stroke="currentColor" strokeWidth="2.5" strokeDasharray="8 6" />
      <path d="M48 24 L56 20 L52 30" fill="currentColor" />
      <rect x="28" y="28" width="16" height="16" rx="3" fill="currentColor" />
    </Frame>
  )
}

export function AnimationThumbFloatIn(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="22" y="30" width="28" height="20" rx="5" fill="currentColor" opacity="0.35" />
      <rect x="22" y="18" width="28" height="20" rx="5" fill="currentColor" />
      <path d="M28 14 H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </Frame>
  )
}

export function AnimationThumbBreathe(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="24" y="34" width="24" height="18" rx="4" fill="currentColor" opacity="0.35" />
      <rect x="24" y="18" width="24" height="18" rx="4" fill="currentColor" />
      <path d="M36 52 V58 M32 55 L36 60 L40 55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

export function AnimationThumbBounce(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <circle cx="36" cy="24" r="9" fill="currentColor" />
      <circle cx="36" cy="42" r="9" fill="currentColor" opacity="0.35" />
      <path d="M24 56 H48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  )
}

export function AnimationThumbSpin(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <circle cx="36" cy="36" r="18" stroke="currentColor" strokeWidth="2.5" />
      <path d="M36 18 A18 18 0 0 1 54 36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="36" cy="36" r="5" fill="currentColor" />
    </Frame>
  )
}

export function AnimationThumbWiggle(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="26" y="16" width="20" height="40" rx="5" fill="currentColor" transform="rotate(-12 36 36)" opacity="0.35" />
      <rect x="26" y="16" width="20" height="40" rx="5" fill="currentColor" transform="rotate(10 36 36)" />
    </Frame>
  )
}

export function AnimationThumbFlash(props: ThumbnailProps) {
  return (
    <Frame {...props}>
      <rect x="18" y="18" width="36" height="36" rx="5" fill="currentColor" opacity="0.25" />
      <path d="M34 16 L28 36 H36 L32 56 L46 30 H36 L40 16 Z" fill="currentColor" />
    </Frame>
  )
}

export const ANIMATION_THUMBNAILS: Record<
  AnimationThumbnailId,
  (props: ThumbnailProps) => React.ReactElement
> = {
  none: AnimationThumbNone,
  fade: AnimationThumbFade,
  'slide-down': AnimationThumbSlideDown,
  'grow-in': AnimationThumbGrowIn,
  'bounce-in': AnimationThumbBounceIn,
  'spin-in': AnimationThumbSpinIn,
  'float-in': AnimationThumbFloatIn,
  breathe: AnimationThumbBreathe,
  pulse: AnimationThumbPulse,
  bounce: AnimationThumbBounce,
  spin: AnimationThumbSpin,
  wiggle: AnimationThumbWiggle,
  flash: AnimationThumbFlash,
  lift: AnimationThumbLift,
  'scroll-fade': AnimationThumbScrollFade,
}

/** Active Zyvavu presets that ship a product thumbnail. */
export const ZYVAVU_ANIMATION_THUMBNAIL_PRESETS: readonly AnimationThumbnailId[] = [
  'none',
  'fade',
  'slide-down',
  'grow-in',
  'bounce-in',
  'spin-in',
  'float-in',
  'breathe',
  'pulse',
  'bounce',
  'spin',
  'wiggle',
  'flash',
  'lift',
  'scroll-fade',
]

export function getAnimationThumbnailId(
  preset: AnimationConfig['preset'] | AnimationThumbnailId | undefined,
): AnimationThumbnailId {
  if (preset && preset in ANIMATION_THUMBNAILS) return preset as AnimationThumbnailId
  return 'none'
}

export function AnimationPresetThumbnail({
  preset,
  size = 40,
  className,
}: {
  preset: AnimationConfig['preset'] | AnimationThumbnailId | undefined
  size?: number
  className?: string
}) {
  const id = getAnimationThumbnailId(preset)
  const Thumb = ANIMATION_THUMBNAILS[id]
  return <Thumb size={size} className={className} />
}

/**
 * Research inventory of Wix Button Animation thumbnails (E225 + E228 + E235).
 * All REFERENCE_ONLY / REDRAW_REQUIRED — not product assets.
 */
export type WixAnimationThumbStatus = 'REFERENCE_ONLY'

export type WixAnimationThumbSlot = {
  researchId: string
  category: 'entrance' | 'loop' | 'scroll' | 'mouse'
  wixName: string
  labelVi: string
  status: WixAnimationThumbStatus
  /** Closest Zyvavu product icon when one exists; otherwise null. */
  zyvavuEquivalent: AnimationThumbnailId | null
}

export const WIX_BUTTON_ANIMATION_THUMBNAIL_INVENTORY: readonly WixAnimationThumbSlot[] = [
  // Entrance 19 (E235)
  { researchId: 'E235-Entrance-1-FadeIn', category: 'entrance', wixName: 'FadeIn', labelVi: 'Mờ dần', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'fade' },
  { researchId: 'E235-Entrance-2-ShuttersIn', category: 'entrance', wixName: 'ShuttersIn', labelVi: 'Hiệu ứng đóng/mở', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-3-FoldIn', category: 'entrance', wixName: 'FoldIn', labelVi: 'Gấp', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-4-BlurIn', category: 'entrance', wixName: 'BlurIn', labelVi: 'Làm mờ', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-5-TurnIn', category: 'entrance', wixName: 'TurnIn', labelVi: 'Xoay', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-6-ExpandIn', category: 'entrance', wixName: 'ExpandIn', labelVi: 'Mở rộng', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-7-DropIn', category: 'entrance', wixName: 'DropIn', labelVi: 'Co lại', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-8-TiltIn', category: 'entrance', wixName: 'TiltIn', labelVi: 'Nghiêng', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-9-RevealIn', category: 'entrance', wixName: 'RevealIn', labelVi: 'Hiện ra', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-10-ShapeIn', category: 'entrance', wixName: 'ShapeIn', labelVi: 'Hình dạng', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-11-GlitchIn', category: 'entrance', wixName: 'GlitchIn', labelVi: 'Trượt', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-12-ArcIn', category: 'entrance', wixName: 'ArcIn', labelVi: 'Vòm', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-13-FlipIn', category: 'entrance', wixName: 'FlipIn', labelVi: 'Lật', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-14-GrowIn', category: 'entrance', wixName: 'GrowIn', labelVi: 'To ra', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'grow-in' },
  { researchId: 'E235-Entrance-15-WinkIn', category: 'entrance', wixName: 'WinkIn', labelVi: 'Nháy', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E235-Entrance-16-SlideIn', category: 'entrance', wixName: 'SlideIn', labelVi: 'Trượt', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'slide-down' },
  { researchId: 'E235-Entrance-17-SpinIn', category: 'entrance', wixName: 'SpinIn', labelVi: 'Xoay tròn', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'spin-in' },
  { researchId: 'E235-Entrance-18-BounceIn', category: 'entrance', wixName: 'BounceIn', labelVi: 'Bật nảy', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'bounce-in' },
  { researchId: 'E235-Entrance-19-FloatIn', category: 'entrance', wixName: 'FloatIn', labelVi: 'Lơ lửng', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'float-in' },
  // Loop 13 (E228)
  { researchId: 'E228-Breathe', category: 'loop', wixName: 'Breathe', labelVi: 'Thở', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'breathe' },
  { researchId: 'E228-Rubber', category: 'loop', wixName: 'Rubber', labelVi: 'Cao su', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Flip', category: 'loop', wixName: 'Flip', labelVi: 'Lật', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Poke', category: 'loop', wixName: 'Poke', labelVi: 'Chọt', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Fold', category: 'loop', wixName: 'Fold', labelVi: 'Gấp', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Pulse', category: 'loop', wixName: 'Pulse', labelVi: 'Rung', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'pulse' },
  { researchId: 'E228-Cross', category: 'loop', wixName: 'Cross', labelVi: 'Chéo', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Wiggle', category: 'loop', wixName: 'Wiggle', labelVi: 'Ngọ nguậy', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'wiggle' },
  { researchId: 'E228-Bounce', category: 'loop', wixName: 'Bounce', labelVi: 'Bật nảy', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'bounce' },
  { researchId: 'E228-Spin', category: 'loop', wixName: 'Spin', labelVi: 'Xoay tròn', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'spin' },
  { researchId: 'E228-Jello', category: 'loop', wixName: 'Jello', labelVi: 'Dẻo', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Flash', category: 'loop', wixName: 'Flash', labelVi: 'Bùng ra', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'flash' },
  { researchId: 'E228-Swing', category: 'loop', wixName: 'Swing', labelVi: 'Nhịp', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  // Scroll 19 (E228)
  { researchId: 'E228-TurnScroll', category: 'scroll', wixName: 'TurnScroll', labelVi: 'Xoay', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-TiltScroll', category: 'scroll', wixName: 'TiltScroll', labelVi: 'Nghiêng', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-ParallaxScroll', category: 'scroll', wixName: 'ParallaxScroll', labelVi: 'Thị sai', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-FadeScroll', category: 'scroll', wixName: 'FadeScroll', labelVi: 'Mờ dần', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'scroll-fade' },
  { researchId: 'E228-SkewPanScroll', category: 'scroll', wixName: 'SkewPanScroll', labelVi: 'Phi tiêu', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-PanScroll', category: 'scroll', wixName: 'PanScroll', labelVi: 'Pan', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-GrowScroll', category: 'scroll', wixName: 'GrowScroll', labelVi: 'To ra', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-ShrinkScroll', category: 'scroll', wixName: 'ShrinkScroll', labelVi: 'Co lại', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Spin3dScroll', category: 'scroll', wixName: 'Spin3dScroll', labelVi: 'Xoay 3D', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-BlurScroll', category: 'scroll', wixName: 'BlurScroll', labelVi: 'Làm mờ', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-MoveScroll', category: 'scroll', wixName: 'MoveScroll', labelVi: 'Xiên', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-ShuttersScroll', category: 'scroll', wixName: 'ShuttersScroll', labelVi: 'Hiệu ứng đóng/mở', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-StretchScroll', category: 'scroll', wixName: 'StretchScroll', labelVi: 'Kéo căng', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-RevealScroll', category: 'scroll', wixName: 'RevealScroll', labelVi: 'Hiện ra', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-SpinScroll', category: 'scroll', wixName: 'SpinScroll', labelVi: 'Xoay tròn', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-SlideScroll', category: 'scroll', wixName: 'SlideScroll', labelVi: 'Trượt', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-ShapeScroll', category: 'scroll', wixName: 'ShapeScroll', labelVi: 'Hình dạng', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-ArcScroll', category: 'scroll', wixName: 'ArcScroll', labelVi: 'Vòm', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-FlipScroll', category: 'scroll', wixName: 'FlipScroll', labelVi: 'Lật', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  // Mouse 9 (E228)
  { researchId: 'E228-Tilt3DMouse', category: 'mouse', wixName: 'Tilt3DMouse', labelVi: 'Nghiêng 3D', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-TrackMouse', category: 'mouse', wixName: 'TrackMouse', labelVi: 'Trượt theo', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-BlobMouse', category: 'mouse', wixName: 'BlobMouse', labelVi: 'Tạo giọt', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-BlurMouse', category: 'mouse', wixName: 'BlurMouse', labelVi: 'Làm mờ', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-Track3DMouse', category: 'mouse', wixName: 'Track3DMouse', labelVi: 'Trượt theo 3D', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-AiryMouse', category: 'mouse', wixName: 'AiryMouse', labelVi: 'Lơ lửng', status: 'REFERENCE_ONLY', zyvavuEquivalent: 'lift' },
  { researchId: 'E228-ScaleMouse', category: 'mouse', wixName: 'ScaleMouse', labelVi: 'Thay đổi kích cỡ', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-SkewMouse', category: 'mouse', wixName: 'SkewMouse', labelVi: 'Lệch 3D', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
  { researchId: 'E228-SwivelMouse', category: 'mouse', wixName: 'SwivelMouse', labelVi: 'Xoay', status: 'REFERENCE_ONLY', zyvavuEquivalent: null },
]

export function summarizeAnimationThumbnailAssets() {
  const wixTotal = WIX_BUTTON_ANIMATION_THUMBNAIL_INVENTORY.length
  const mapped = WIX_BUTTON_ANIMATION_THUMBNAIL_INVENTORY.filter((s) => s.zyvavuEquivalent).length
  return {
    wixInventoryTotal: wixTotal,
    wixInSource: 0,
    wixReferenceOnly: wixTotal,
    zyvavuCreated: ZYVAVU_ANIMATION_THUMBNAIL_PRESETS.length,
    zyvavuMappedFromWixConcepts: mapped,
    zyvavuMissingForActivePresets: 0,
  }
}
