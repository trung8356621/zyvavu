import Link from 'next/link'
import React from 'react'

import type { NavLink } from '@/lib/url/menu-links'

export function SiteHeader({ siteName, items }: { siteName: string; items: NavLink[] }) {
  return (
    <header className="site-header">
      <Link href="/">{siteName}</Link>
      <nav>
        {items.map((item) => (
          <Link key={item.id || item.href} href={item.href} target={item.newTab ? '_blank' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
