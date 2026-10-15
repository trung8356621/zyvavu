import type { ComponentConfig, Config, Data } from '@puckeditor/core'

export type BuilderComponentData = {
  type: string
  props: Record<string, any> & { id: string }
}

export type BuilderDocument<TMetadata = Record<string, any>> = {
  version: number
  root: {
    props?: Record<string, any>
  }
  content: BuilderComponentData[]
  zones?: Record<string, BuilderComponentData[]>
  metadata?: TMetadata
}

export type BuilderValidationResult = {
  valid: boolean
  errors: string[]
}

export type BuilderPresetConfig = {
  name: string
  config: Config
  createDefaultDocument: () => BuilderDocument
}
