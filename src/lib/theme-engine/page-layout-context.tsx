'use client'

import React, { createContext, useContext } from 'react'
import type { PageSettings, ThemeTokens } from './types'

export type PageLayoutContextType = {
  pageSettings?: PageSettings
  themeTokens?: ThemeTokens
  effectiveContainerWidth?: string
  effectiveAlignment?: 'left' | 'center' | 'right'
  effectiveSpacing?: string
}

export const PageLayoutContext = createContext<PageLayoutContextType>({})

export function usePageLayout(): PageLayoutContextType {
  return useContext(PageLayoutContext)
}

export function PageLayoutProvider({
  value,
  children,
}: {
  value: PageLayoutContextType
  children?: React.ReactNode
}) {
  return <PageLayoutContext.Provider value={value}>{children}</PageLayoutContext.Provider>
}
