import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type PostTitleProps = {
  id?: string
  tag?: 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center' | 'right'
  variant?: 'default' | 'accent' | 'subtle'
  title?: string
  dataContext?: ThemeDataContext
}

export function PostTitleFrontend({
  tag = 'h1',
  align = 'left',
  variant = 'default',
  title: customTitle,
  dataContext,
}: PostTitleProps) {
  const title = customTitle || dataContext?.document?.title || 'Untitled Document'
  const HeadingTag = tag

  return (
    <div
      className={`zyvavu-widget-post-title zyvavu-widget-post-title--${variant}`}
      style={{
        textAlign: align,
        marginBottom: '1.5rem',
      }}
    >
      <HeadingTag
        className="zyvavu-widget-post-title__heading"
        style={{
          margin: 0,
          color: variant === 'accent' ? 'var(--zyvavu-theme-primary, var(--zyvavu-primary))' : 'inherit',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </HeadingTag>
    </div>
  )
}
