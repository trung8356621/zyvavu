export const dynamic = 'force-dynamic'

import React from 'react'
import type { Metadata } from 'next'

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
      <head>
        {/* Shared with standalone HTML responses from the XML route handlers. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/sitemap-view.css" />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
