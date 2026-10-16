import type { Config } from '@puckeditor/core'

export type TemplateContext =
  | 'single'
  | 'page'
  | 'home'
  | 'header'
  | 'footer'
  | 'category'
  | 'product'

export type TemplateEditorMode = 'document' | 'free' | 'structured-header'

export type WidgetCapability =
  | 'document.title'
  | 'document.content'
  | 'document.meta'
  | 'document.media'
  | 'site.navigation'
  | 'site.brand'
  | 'site.header'
  | 'site.footer'
  | 'archive.list'
  | 'archive.header'
  | 'layout.container'
  | 'layout.columns'
  | 'layout.text'
  | 'product.title'
  | 'product.price'
  | 'product.variants'
  | 'product.purchase'
  | string

export type WidgetInstanceLock = {
  canDelete?: boolean
  canMove?: boolean
  canEditProps?: boolean
}

export type WidgetManifest = {
  id: string
  version: number
  label: string
  category: 'document' | 'layout' | 'header' | 'navigation' | 'archive' | 'commerce' | 'general'
  capabilities: WidgetCapability[]
  supportedContexts: (TemplateContext | '*')[]
  requiredData?: string[]
  defaultProps: Record<string, any>
  styleSlots?: string[]
}

export type ThemeComponentData = {
  type: string
  props: Record<string, any> & {
    id: string
    lock?: WidgetInstanceLock
  }
}

export type ThemeTemplateDocument = {
  version: number
  template: TemplateContext
  root?: {
    props?: Record<string, any>
  }
  content: ThemeComponentData[]
  zones?: Record<string, ThemeComponentData[]>
  metadata?: Record<string, any>
  updatedAt?: string
}

export type TemplatePolicy = {
  context: TemplateContext
  mode: TemplateEditorMode
  allowedWidgets: string[]
  requiredWidgets?: string[]
  requiredCapabilities?: WidgetCapability[]
  uniqueWidgets?: string[]
  uniqueCapabilities?: WidgetCapability[]
  allowedRegions?: string[]
  description?: string
}

export type ThemeTokens = {
  colors: {
    primary: string
    primaryHover?: string
    background: string
    surface: string
    text: string
    textMuted?: string
    border: string
    accent?: string
    [key: string]: string | undefined
  }
  typography: {
    fontFamily: string
    fontFamilyHeading?: string
    baseFontSize?: string
    baseLineHeight?: string
    h1?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    h2?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    h3?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    h4?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    h5?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    h6?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    p1?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    p2?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    p3?: { size: string; lineHeight?: string; weight?: string; letterSpacing?: string }
    [key: string]: any
  }
  spacing: {
    xs?: string
    sm?: string
    md?: string
    lg?: string
    xl?: string
    xxl?: string
    [key: string]: string | undefined
  }
  layout: {
    containerWidth: string
    narrowWidth?: string
    wideWidth?: string
    [key: string]: string | undefined
  }
  radius: {
    sm?: string
    md?: string
    lg?: string
    pill?: string
    [key: string]: string | undefined
  }
}

export type ColorPreset = {
  id: string
  name: string
  description?: string
  isCustom?: boolean
  colors: ThemeTokens['colors']
}

export type TypographyPreset = {
  id: string
  name: string
  description?: string
  isCustom?: boolean
  typography: ThemeTokens['typography']
}

export type CustomPresetsStore = {
  colors: ColorPreset[]
  typography: TypographyPreset[]
}

export type ThemeConfig = {
  name: string
  version: number
  label?: string
  tokens: ThemeTokens
  slots?: Record<string, Record<string, string>>
}

export type ThemeCustomizerState = {
  bundled: ThemeConfig
  published: ThemeConfig
  draft: ThemeConfig
  customPresets: CustomPresetsStore
}

export type LoopItemRecord = {
  id?: string | number
  title: string
  slug?: string
  url?: string
  excerpt?: string
  date?: string
  category?: string
  image?: {
    url?: string
    alt?: string
    width?: number
    height?: number
  }
  raw?: any
}

export type ThemeDataContext = {
  type: TemplateContext
  document?: Record<string, any>
  item?: LoopItemRecord
  archive?: {
    taxonomyType?: 'category' | 'tag'
    title?: string
    description?: string
    posts?: any[]
    total?: number
    page?: number
    totalPages?: number
  }
  site?: {
    siteName?: string
    tagline?: string
    logoUrl?: string
    logoAlt?: string
    menuItems?: any[]
    menuTree?: any[]
    menuDoc?: any
  }
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
}
