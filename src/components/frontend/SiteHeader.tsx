import Link from 'next/link'
import React from 'react'

import { pathForPageSlug, pathForPostSlug } from '@/lib/slug'

type MenuItem = {
  id?: string | null
  label?: string
  link?: {
    type?: string
    url?: string | null
    newTab?: boolean | null
    page?: { slug?: string | null } | string | number | null
    post?: { slug?: string | null } | string | number | null
  }
}

function itemHref(item: MenuItem): string | null {
  const link = item.link
  if (!link?.type) return null
  if (link.type === 'custom') return link.url || null
  if (link.type === 'page' && link.page && typeof link.page === 'object' && link.page.slug) {
    return pathForPageSlug(link.page.slug)
  }
  if (link.type === 'post' && link.post && typeof link.post === 'object' && link.post.slug) {
    return pathForPostSlug(link.post.slug)
  }
  return null
}

export function SiteHeader({
  siteName,
  items,
}: {
  siteName: string
  items: MenuItem[]
}) {
  return (
    <header className="site-header">
      <Link href="/">{siteName}</Link>
      <nav>
        {items.map((item) => {
          const href = itemHref(item)
          if (!href || !item.label) return null
          return (
            <Link key={item.id || href} href={href} target={item.link?.newTab ? '_blank' : undefined}>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
