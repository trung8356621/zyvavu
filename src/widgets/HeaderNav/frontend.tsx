import React from 'react'
import Link from 'next/link'
import type { NavLink } from '@/lib/url/menu-links'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderNavProps = {
  id?: string
  dropdownEffect?: 'none' | 'fade' | 'slide-down'
  items?: NavLink[]
  dataContext?: ThemeDataContext
}

export function HeaderNavFrontend({
  dropdownEffect = 'fade',
  items: customItems,
  dataContext,
}: HeaderNavProps) {
  const items: NavLink[] = customItems || dataContext?.site?.menuItems || []

  if (!items.length) {
    return (
      <nav className="site-nav" style={{ display: 'flex', gap: '20px' }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}>
          Trang chủ
        </Link>
      </nav>
    )
  }

  return (
    <nav
      className={`site-nav site-nav--effect-${dropdownEffect}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      {items.map((item) => (
        <Link
          key={item.id || item.href}
          href={item.href}
          target={item.newTab ? '_blank' : undefined}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 500,
            transition: 'color 0.2s ease',
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
