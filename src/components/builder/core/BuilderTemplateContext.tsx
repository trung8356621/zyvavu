'use client'

import React, { createContext, useContext } from 'react'
import type { TemplateContext } from '@/lib/theme-engine/types'

const BuilderTemplateContext = createContext<TemplateContext | undefined>(undefined)

export function BuilderTemplateProvider({
  templateContext,
  children,
}: {
  templateContext?: TemplateContext
  children: React.ReactNode
}) {
  return (
    <BuilderTemplateContext.Provider value={templateContext}>
      {children}
    </BuilderTemplateContext.Provider>
  )
}

export function useBuilderTemplateContext(): TemplateContext | undefined {
  return useContext(BuilderTemplateContext)
}
