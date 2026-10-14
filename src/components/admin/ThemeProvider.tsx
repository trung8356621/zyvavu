'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'

import { themeVariables } from '@/theme/cssVariables'
import { adminMantineTheme, getAdminDensity } from '@/theme/mantineTheme'

export function ThemeProvider({ children }: { children?: ReactNode }) {
  const density = getAdminDensity()

  useEffect(() => {
    // Sync admin design tokens to document root so portals, dialogs and drawers
    // outside .zyvavu-admin-theme inherit all theme variables
    const vars = themeVariables('admin')
    const root = document.documentElement
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }
    root.setAttribute('data-density', density)
  }, [density])

  return (
    <MantineProvider forceColorScheme="light" theme={adminMantineTheme}>
      <div
        className="zyvavu-admin-theme"
        data-density={density}
        style={themeVariables('admin') as CSSProperties}
      >
        {children}
      </div>
    </MantineProvider>
  )
}
