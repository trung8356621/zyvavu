'use client'

import React, { createContext, useContext } from 'react'
import type { ThemeTemplateDocument } from './types'
import type { LoopItemTemplateMeta } from './loop-item-templates-types'

export type LoopItemTemplatesContextValue = {
  themeId: string
  items: LoopItemTemplateMeta[]
  documents: Record<string, ThemeTemplateDocument>
  refresh?: () => void
}

const LoopItemTemplatesContext = createContext<LoopItemTemplatesContextValue>({
  themeId: 'corporate',
  items: [],
  documents: {},
})

export function LoopItemTemplatesProvider({
  value,
  children,
}: {
  value: LoopItemTemplatesContextValue
  children: React.ReactNode
}) {
  return (
    <LoopItemTemplatesContext.Provider value={value}>{children}</LoopItemTemplatesContext.Provider>
  )
}

export function useLoopItemTemplates(): LoopItemTemplatesContextValue {
  return useContext(LoopItemTemplatesContext)
}
