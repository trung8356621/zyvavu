import React from 'react'
import './preview.css'
export default function PatternPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
