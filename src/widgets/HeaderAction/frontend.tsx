import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderActionProps = {
  id?: string
  label?: string
  url?: string
  newTab?: boolean
  variant?: 'solid' | 'outline'
  dataContext?: ThemeDataContext
}

export function HeaderActionFrontend({
  label = 'Liên hệ',
  url = '/contact',
  newTab = false,
  variant = 'solid',
}: HeaderActionProps) {
  if (!label || !url) return null

  const isOutline = variant === 'outline'

  return (
    <div className="zyvavu-widget-header-action" style={{ display: 'inline-block' }}>
      <Link
        href={url}
        target={newTab ? '_blank' : undefined}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          backgroundColor: isOutline ? 'transparent' : 'var(--zyvavu-theme-primary, #0e6b66)',
          color: isOutline ? 'var(--zyvavu-theme-primary, #0e6b66)' : '#ffffff',
          border: isOutline ? '1px solid var(--zyvavu-theme-primary, #0e6b66)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </Link>
    </div>
  )
}
