import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemLinkProps = {
  label?: string
  variant?: 'link' | 'button' | 'outline'
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemLinkFrontend({
  label = 'Xem chi tiết →',
  variant = 'link',
  className = '',
  dataContext,
}: ItemLinkProps) {
  const item = dataContext?.item
  const url = item?.url || '#'

  if (variant === 'button') {
    return (
      <Link
        href={url}
        className={`zyvavu-item-link zyvavu-item-link--btn ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          background: 'var(--zyvavu-theme-primary, #0e6b66)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </Link>
    )
  }

  if (variant === 'outline') {
    return (
      <Link
        href={url}
        className={`zyvavu-item-link zyvavu-item-link--outline ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          border: '1px solid var(--zyvavu-theme-border, #cbd5e1)',
          color: 'var(--zyvavu-theme-text, inherit)',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={url}
      className={`zyvavu-item-link ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--zyvavu-theme-primary, #0e6b66)',
        fontWeight: 600,
        fontSize: '0.9rem',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
      }}
    >
      {label}
    </Link>
  )
}
