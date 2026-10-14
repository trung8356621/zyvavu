import Link from 'next/link'
import React from 'react'

import type { NavLink } from '@/lib/url/menu-links'

export function SiteHeader({
  siteName,
  tagline,
  items,
  logoUrl,
  logoAlt,
}: {
  siteName: string
  tagline?: string
  items: NavLink[]
  logoUrl?: string
  logoAlt?: string
}) {
  return (
    <header className="site-header">
      <div className="site-brand">
        <Link href="/" className="site-brand-link">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={logoAlt || siteName}
              className="site-logo"
              style={{ maxHeight: '36px', width: 'auto', display: 'block' }}
            />
          ) : (
            siteName
          )}
        </Link>
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
