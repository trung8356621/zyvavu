'use client'

import React from 'react'
import type { ThemeConfig } from '@/lib/theme-engine/types'

/**
 * Thin chrome context for Puck Field custom controls (theme tokens, etc.).
 * Document edits still flow through Puck field onChange / Style Sidebar commits.
 */
export type BuilderChromeValue = {
  themeConfig?: ThemeConfig
}

const BuilderChromeContext = React.createContext<BuilderChromeValue>({})

export function BuilderChromeProvider({
  themeConfig,
  children,
}: {
  themeConfig?: ThemeConfig
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ themeConfig }), [themeConfig])
  return <BuilderChromeContext.Provider value={value}>{children}</BuilderChromeContext.Provider>
}

export function useBuilderChrome(): BuilderChromeValue {
  return React.useContext(BuilderChromeContext)
}
