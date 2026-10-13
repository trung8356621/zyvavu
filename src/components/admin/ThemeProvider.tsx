'use client'

import type { CSSProperties, ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'

import { themeVariables } from '@/theme/cssVariables'
import { adminMantineTheme, getAdminDensity } from '@/theme/mantineTheme'

export function ThemeProvider({ children }: { children?: ReactNode }) {
  const density = getAdminDensity()

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
