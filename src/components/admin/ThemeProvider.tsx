import type { CSSProperties, ReactNode } from 'react'

import { themeVariables } from '@/theme/cssVariables'

export function ThemeProvider({ children }: { children?: ReactNode }) {
  return (
    <div className="zyvavu-admin-theme" style={themeVariables('admin') as CSSProperties}>
      {children}
    </div>
  )
}
