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
  | 'animation'
  | 'button'

export type TextEffectPreset =
  'none' | 'shadow-soft' | 'shadow-hard' | 'outline' | 'glow' | 'subtle-depth'

export type LetterSpacingPreset = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider'
export type LineHeightPreset = 'compact' | 'normal' | 'relaxed' | 'loose'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'
/** Theme font role; unset = inherit from HTML tag / theme CSS. */
export type FontFamilyRole = 'theme' | 'heading'
export type FontWeightToken = '300' | '400' | '500' | '600' | '700' | '800' | 'normal' | 'bold'
/** Semantic size source from theme typography tokens (not raw CSS). */
export type FontSizeToken = string
export type FontStyleToken = 'normal' | 'italic'
export type TextDecorationToken = 'none' | 'underline' | 'line-through'
export type TextTransformToken = 'none' | 'uppercase' | 'lowercase' | 'capitalize'

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

export interface BackgroundPatternConfig {
  preset?: PatternPreset
  colorToken?: string
  opacity?: number
  scale?: 'sm' | 'md' | 'lg'
}

export interface BackgroundConfig {
  pattern?: BackgroundPatternConfig
  mode?: BackgroundMode
  colorToken?: string
  gradient?: GradientDef
  mesh?: MeshDef
  image?: BackgroundImageConfig
  video?: BackgroundVideoConfig
}

export interface BorderConfig {
  linked?: boolean
  sides?: Partial<
    Record<'top' | 'right' | 'bottom' | 'left', Omit<BorderConfig, 'sides' | 'linked'>>
  >
  style?: 'solid' | 'dashed' | 'dotted' | 'none'
  widthToken?: 'none' | 'thin' | 'medium' | 'thick' | string
  colorToken?: string
  side?: 'all' | 'top' | 'bottom' | 'left' | 'right'
}

export interface RadiusConfig {
  linked?: boolean
  corners?: Partial<Record<'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', string>>
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
  layers?: string[]
  shadowToken?:
    'none' | 'shadowSoft' | 'shadowMedium' | 'shadowStrong' | 'subtle' | 'elevated' | string
}

export interface EffectsConfig {
  opacity?: number
  backdropBlur?: 'none' | 'sm' | 'md' | 'lg'
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
}

/**
 * Explicit breakpoint overrides only (never persist computed desktop defaults).
 * V1 supports typography size/line-height/align and spacing.
 * hide/stack flags are legacy visibility helpers — do not reuse for style overrides.
 */
export interface ResponsiveStyleOverride {
  typography?: Pick<TypographyStyleConfig, 'fontSize' | 'lineHeight' | 'align'>
  spacing?: SpacingConfig
  /** Legacy flat align when widgets store align outside typography. */
  align?: TextAlign
}

export interface ResponsiveConfig {
  hideOnMobile?: boolean
  hideOnTablet?: boolean
  hideOnDesktop?: boolean
  stackOnMobile?: boolean
  /** Desktop base remains root UniversalStyle fields; tablet stores overrides only. */
  tablet?: ResponsiveStyleOverride
  /** Mobile overrides win over tablet inside max-width: mobileMax. */
  mobile?: ResponsiveStyleOverride
}

export interface SectionPresentationConfig {
  containerWidth?: 'containerWidth' | 'narrowWidth' | 'wideWidth' | 'full' | string
  verticalPadding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  minHeight?: 'auto' | 'screen' | 'sm' | 'md' | 'lg' | string
  breakout?: boolean
}

export interface TypographyStyleConfig {
  /** Theme typography preset id (h1–h6, p1–p3). Unset = inherit tag/theme CSS. */
  typography?: string
  colorToken?: string
  align?: TextAlign
  effectPreset?: TextEffectPreset
  letterSpacing?: LetterSpacingPreset
  lineHeight?: LineHeightPreset
  verticalText?: boolean
  /** Explicit overrides; unset keys inherit theme / HTML tag styles. */
  fontFamily?: FontFamilyRole
  fontWeight?: FontWeightToken
  fontSize?: FontSizeToken
  fontStyle?: FontStyleToken
  textDecoration?: TextDecorationToken
  textTransform?: TextTransformToken
}

/**
 * Universal Visual Style Schema
 * Unified storage model for all component visual presentation styling.
 * Stored in `widget.props.style`.
 */
export interface UniversalStyle {
  animation?: import('./animation-presets').AnimationConfig
  button?: ButtonStyleShell
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

/** Button Design V1 — Normal/Hover appearance; Icon + Normal Layout remain shell-only. */
export interface ButtonStyleShell {
  version: 1
  normal?: ButtonShellState
  hover?: Pick<ButtonShellState, 'background' | 'shadow'> & {
    text?: Pick<TypographyStyleConfig, 'colorToken'>
    border?: Pick<BorderConfig, 'colorToken'>
    opacity?: number
    transform?: 'none' | 'lift' | 'grow'
  }
}

export interface ButtonShellState {
  preset?: 'theme' | 'outline'
  background?: BackgroundConfig
  text?: TypographyStyleConfig
  border?: BorderConfig
  radius?: RadiusConfig
  shadow?: ShadowConfig
  layout?: { spacing?: SpacingConfig; dimensions?: DimensionsConfig }
  icon?: {
    visible?: boolean
    sizeToken?: string
    colorToken?: string
    spacingToken?: string
    rotation?: number
  }
}
