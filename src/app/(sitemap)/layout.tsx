export const dynamic = 'force-dynamic'

import React from 'react'
import type { Metadata } from 'next'

import './sitemap-view.css'

export const metadata: Metadata = {
  title: 'Sơ đồ trang web XML',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SitemapViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
