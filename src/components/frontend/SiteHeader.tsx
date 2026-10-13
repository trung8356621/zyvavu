import Link from 'next/link'
import React from 'react'

import type { NavLink } from '@/lib/url/menu-links'

export function SiteHeader({ siteName, tagline, items }: { siteName: string; tagline?: string; items: NavLink[] }) {
  return (
    <header className="site-header">
      <div className="site-brand">
        <Link href="/">{siteName}</Link>
        {tagline ? <p>{tagline}</p> : null}
      </div>
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
