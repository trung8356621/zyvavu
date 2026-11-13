import type { TemplateContext } from './types'

export type TemplateImportDestination = {
  themeId: string
  template: TemplateContext
  loopItemId?: string
  /** Present for Home version imports — source reference only; never the write key. */
  sourceVersionId?: string
  label: string
  mode: 'override' | 'version-create'
}

export type TemplateImportPreviewSummary = {
  destination: TemplateImportDestination
  replacesExisting: boolean
  widgetCount: number
  updatedAt?: string
}

export type TemplateImportEnvelope = {
  themeId?: string
  template?: TemplateContext
  loopItemId?: string
  /** Source Home version id for export/import correlation only. */
  versionId?: string
  document: import('./types').ThemeTemplateDocument
}
