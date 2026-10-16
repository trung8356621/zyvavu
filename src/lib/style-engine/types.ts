export type StyleDomain =
  | 'typography'
  | 'color'
  | 'background'
  | 'border'
  | 'spacing'
  | 'dimensions'
  | 'shadow'
  | 'effects'
  | 'responsive'
  | 'section'

export type TextEffectPreset =
  | 'none'
  | 'shadow-soft'
  | 'shadow-hard'
  | 'outline'
  | 'glow'
  | 'subtle-depth'

export type LetterSpacingPreset = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider'
export type LineHeightPreset = 'compact' | 'normal' | 'relaxed' | 'loose'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface GradientStop {
  token: string
  color?: string
  position: number
  opacity?: number
}

export interface GradientDef {
  type: 'linear' | 'radial'
  angle: number
  stops: GradientStop[]
}

export interface MeshPoint {
  id: string
  token: string
  color?: string
  x: number
  y: number
  radius?: number
  opacity?: number
}

export interface MeshDef {
  points: MeshPoint[]
}

export type BackgroundMode = 'color' | 'image' | 'video'

export type PatternPreset = 'none' | 'dots' | 'grid' | 'diagonal' | 'stripes' | 'noise'

export interface BackgroundImageConfig {
  mediaId?: string | number
  url?: string
  position?: string
  size?: 'cover' | 'contain' | 'auto'
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'
  fallbackColorToken?: string
  overlay?: {
    colorToken?: string
    opacity?: number
  }
  pattern?: {
    preset?: PatternPreset
    opacity?: number
  }
}

export interface BackgroundVideoConfig {
  mediaId?: string | number
  url?: string
  posterUrl?: string
  posterMediaId?: string | number
  loop?: boolean
  muted?: boolean
  autoplay?: boolean
  fallbackImageUrl?: string
  fallbackColorToken?: string
  overlay?: {
    colorToken?: string
    opacity?: number
  }
  position?: string
}

export interface BackgroundConfig {
  mode?: BackgroundMode
  colorToken?: string
  gradient?: GradientDef
  mesh?: MeshDef
  image?: BackgroundImageConfig
  video?: BackgroundVideoConfig
}

export interface BorderConfig {
  style?: 'solid' | 'dashed' | 'dotted' | 'none'
  widthToken?: 'none' | 'thin' | 'medium' | 'thick' | string
  colorToken?: string
  side?: 'all' | 'top' | 'bottom' | 'left' | 'right'
}

export interface RadiusConfig {
  radiusToken?: 'none' | 'sm' | 'md' | 'lg' | 'pill' | string
}

export interface SpacingConfig {
  padding?: {
    token?: string
    topToken?: string
    bottomToken?: string
    leftToken?: string
    rightToken?: string
  }
  margin?: {
    token?: string
    topToken?: string
    bottomToken?: string
  }
  gapToken?: string
}

export interface DimensionsConfig {
  containerWidth?: 'containerWidth' | 'narrowWidth' | 'wideWidth' | 'full' | string
  minHeight?: 'auto' | 'screen' | 'sm' | 'md' | 'lg' | string
  align?: TextAlign
  contentAlign?: 'start' | 'center' | 'end' | 'stretch'
}

export interface ShadowConfig {
  shadowToken?: 'none' | 'shadowSoft' | 'shadowMedium' | 'shadowStrong' | 'subtle' | 'elevated' | string
}

export interface EffectsConfig {
  opacity?: number
  backdropBlur?: 'none' | 'sm' | 'md' | 'lg'
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
}

export interface ResponsiveConfig {
  hideOnMobile?: boolean
  hideOnTablet?: boolean
  hideOnDesktop?: boolean
  stackOnMobile?: boolean
}

export interface SectionPresentationConfig {
  containerWidth?: 'containerWidth' | 'narrowWidth' | 'wideWidth' | 'full' | string
  verticalPadding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  minHeight?: 'auto' | 'screen' | 'sm' | 'md' | 'lg' | string
  breakout?: boolean
}

export interface TypographyStyleConfig {
  typography?: string
  colorToken?: string
  align?: TextAlign
  effectPreset?: TextEffectPreset
  letterSpacing?: LetterSpacingPreset
  lineHeight?: LineHeightPreset
  verticalText?: boolean
}

/**
 * Universal Visual Style Schema
 * Unified storage model for all component visual presentation styling.
 * Stored in `widget.props.style`.
 */
export interface UniversalStyle {
  typography?: TypographyStyleConfig
  background?: BackgroundConfig
  border?: BorderConfig
  radius?: RadiusConfig
  spacing?: SpacingConfig
  dimensions?: DimensionsConfig
  shadow?: ShadowConfig
  effects?: EffectsConfig
  responsive?: ResponsiveConfig
  section?: SectionPresentationConfig

  // Legacy flat fields for backward compatibility
  colorToken?: string
  backgroundToken?: string
  align?: TextAlign
}
