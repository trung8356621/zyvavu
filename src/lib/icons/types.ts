import type { CSSProperties } from 'react'

export type IconSource = 'lucide' | 'custom' | 'media'

export type IconRef = {
  source: IconSource
  /** Lucide / custom icon id */
  name?: string
  /** Payload Media id for My Icons (SVG) */
  mediaId?: string | number
  /** Resolved media URL (persisted for SSR without extra fetch) */
  mediaUrl?: string
  /** Optional original filename for picker display */
  mediaFilename?: string
  /** When false, renderer preserves original SVG fills/strokes */
  recolorable?: boolean
}

export type IconCatalogEntry = {
  name: string
  tags: string[]
  categories: string[]
  source?: 'lucide' | 'custom'
  label?: string
}

export type IconCatalog = {
  source: string
  version: string
  generatedAt?: string
  categories: string[]
  icons: IconCatalogEntry[]
}

export type IconRenderProps = {
  icon?: IconRef | null
  size?: number | string
  strokeWidth?: number
  color?: string
  className?: string
  style?: CSSProperties
  /** Decorative = aria-hidden; meaningful requires label */
  decorative?: boolean
  label?: string
  title?: string
}
