import React from 'react'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { AtomPresentation } from '@/widgets/atoms/frontend'

/**
 * Document Title (legacy type `PostTitle`) — thin Heading wrapper.
 * Content is document-bound / preview-only; style + tag reuse Heading rendering.
 */
export type PostTitleProps = {
  id?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  /** @deprecated Preserved for saved data; not shown in Fields. */
  align?: 'left' | 'center' | 'right'
  /** @deprecated Preserved for saved data; not shown in Fields. */
  variant?: 'default' | 'accent' | 'subtle'
  style?: WidgetSemanticStyle
  /** Preview/editor fallback only — never a Fields Content control. */
  title?: string
  dataContext?: ThemeDataContext
}

export function PostTitleFrontend({
  id,
  tag = 'h1',
  style,
  title: customTitle,
  dataContext,
}: PostTitleProps) {
  const title = dataContext?.document?.title || customTitle || 'Untitled Document'
  return (
    <AtomPresentation
      kind="Heading"
      id={id}
      tag={tag}
      text={title}
      style={style}
      primaryHeading
    />
  )
}
