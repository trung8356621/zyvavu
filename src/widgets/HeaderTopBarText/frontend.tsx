import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderTopBarTextProps = {
  id?: string
  text?: string
  dataContext?: ThemeDataContext
}

export function HeaderTopBarTextFrontend({
  text = 'Cổng thông tin doanh nghiệp B2B — Hotline: 0900.000.000',
}: HeaderTopBarTextProps) {
  if (!text) return null
  return (
    <div className="zyvavu-widget-topbar-text" style={{ fontSize: '13px', color: 'var(--zyvavu-theme-text-muted, #5f7370)' }}>
      {text}
    </div>
  )
}
