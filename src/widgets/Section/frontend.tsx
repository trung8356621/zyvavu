import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveSectionLayerStyles } from '@/lib/style-engine/serializer'
import { usePageLayout } from '@/lib/theme-engine/page-settings'

export interface SectionProps {
  id?: string
  containerWidth?: 'inherit' | 'containerWidth' | 'narrowWidth' | 'wideWidth' | 'full' | string
  verticalPadding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  minHeight?: 'auto' | 'screen' | 'sm' | 'md' | 'lg' | string
  style?: UniversalStyle
  content?: React.ReactNode
  children?: React.ReactNode
  dataContext?: ThemeDataContext
}

export function SectionFrontend({
  id,
  containerWidth = 'inherit',
  verticalPadding = 'md',
  minHeight = 'auto',
  style,
  content,
  children,
  dataContext,
}: SectionProps) {
  const pageLayout = usePageLayout()
  const pageContainerWidth =
    pageLayout?.effectiveContainerWidth ||
    (dataContext as any)?.pageSettings?.layout?.containerWidth

  const layers = resolveSectionLayerStyles(style, {
    containerWidth,
    pageContainerWidth,
    verticalPadding,
    minHeight,
  })

  return (
    <section
      id={id}
      className="zyvavu-widget-section site-section"
      style={layers.rootStyle}
    >
      {/* 1. Base Color Layer */}
      <div className="zyvavu-section__base-color" style={layers.baseColorStyle} />

      {/* 2. Background Media (Image or Video) */}
      {layers.videoConfig?.url ? (
        <div className="zyvavu-section__media zyvavu-section__media--video" style={layers.mediaStyle}>
          <video
            autoPlay={layers.videoConfig.autoplay !== false}
            muted={true}
            loop={layers.videoConfig.loop !== false}
            playsInline
            poster={layers.videoConfig.posterUrl || layers.videoConfig.fallbackImageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          >
            <source src={layers.videoConfig.url} />
          </video>
        </div>
      ) : (
        <div className="zyvavu-section__media zyvavu-section__media--image" style={layers.mediaStyle} />
      )}

      {/* 3. Overlay Layer */}
      <div className="zyvavu-section__overlay" style={layers.overlayStyle} />

      {/* 4. Pattern Layer */}
      <div className="zyvavu-section__pattern" style={layers.patternStyle} />

      {/* 5. Container & Content */}
      <div className="zyvavu-section__container" style={layers.containerStyle}>
        <div className="zyvavu-section__content" style={layers.contentStyle}>
          {content || children}
        </div>
      </div>
    </section>
  )
}
