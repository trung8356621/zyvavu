import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type FeaturedMediaProps = {
  id?: string
  aspectRatio?: '16:9' | '4:3' | '21:9' | 'auto'
  rounded?: boolean
  src?: string
  alt?: string
  dataContext?: ThemeDataContext
}

export function FeaturedMediaFrontend({
  aspectRatio = '16:9',
  rounded = true,
  src: customSrc,
  alt: customAlt,
  dataContext,
}: FeaturedMediaProps) {
  const doc = dataContext?.document
  const mediaObj = doc?.featuredImage || doc?.image || doc?.media
  const src = customSrc || (typeof mediaObj === 'object' && mediaObj?.url) || (typeof mediaObj === 'string' ? mediaObj : null)
  const alt = customAlt || (typeof mediaObj === 'object' && mediaObj?.alt) || doc?.title || ''

  if (!src) return null

  return (
    <div
      className="zyvavu-widget-featured-media"
      style={{
        width: '100%',
        marginBottom: '24px',
        overflow: 'hidden',
        borderRadius: rounded ? 'var(--zyvavu-theme-radius-md, 8px)' : 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio.replace(':', '/'),
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  )
}
