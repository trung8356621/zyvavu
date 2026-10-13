import React from 'react'

import { PublicDocument } from '@/components/frontend/PublicDocument'

export default function HomePage() {
  return (
    <PublicDocument
      path="/"
      missing={
        <section className="site-section">
          <h1>zyvavu</h1>
          <p>Chưa có trang home đã xuất bản.</p>
        </section>
      }
    />
  )
}
