'use client'

import { animationAttributes } from '@/lib/style-engine/animation-presets'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { SectionProps } from './frontend'
import { resolveSectionLayerStyles } from '@/lib/style-engine/serializer'
import { usePageLayout } from '@/lib/theme-engine/page-layout-context'
import { useWidgetPreviewStyle } from '@/lib/style-engine/preview-store'

export const sectionEditor: ComponentConfig<SectionProps> = {
  label: 'Section Container',
  fields: {
    // GAP: Style Sidebar dimensions.containerWidth lacks "inherit" page/theme semantics.
    containerWidth: {
      type: 'select',
      label: 'Container Width',
      options: [
        { label: 'Inherit Page / Theme', value: 'inherit' },
        { label: 'Standard Container', value: 'containerWidth' },
        { label: 'Narrow Container', value: 'narrowWidth' },
        { label: 'Wide Container', value: 'wideWidth' },
        { label: 'Full Width', value: 'full' },
      ],
    },
    // GAP: Style Sidebar spacing.padding is all-sides; Section uses vertical-only
    // via props.verticalPadding / style.section.verticalPadding.
    verticalPadding: {
      type: 'select',
      label: 'Vertical Padding',
      options: [
        { label: 'None (0px)', value: 'none' },
        { label: 'Extra Small (xs)', value: 'xs' },
        { label: 'Small (sm)', value: 'sm' },
        { label: 'Medium (md)', value: 'md' },
        { label: 'Large (lg)', value: 'lg' },
        { label: 'Extra Large (xl)', value: 'xl' },
      ],
    },
    // minHeight → Style Sidebar (dimensions.minHeight). Prop retained for compatibility.
    content: {
      type: 'slot',
      disallow: ['Section'],
    },
  },
  defaultProps: {
    containerWidth: 'inherit',
    verticalPadding: 'md',
    minHeight: 'auto',
  },
  render: ({
    id,
    containerWidth = 'inherit',
    verticalPadding = 'md',
    minHeight = 'auto',
    style,
    content: Content,
    puck,
  }: any) => {
    const pageLayout = usePageLayout()
    const pageContainerWidth =
      pageLayout?.effectiveContainerWidth ||
      puck?.appState?.data?.root?.props?.pageSettings?.layout?.containerWidth

    const previewStyle = useWidgetPreviewStyle(id, puck?.id, puck?.componentId)
    const effectiveStyle = previewStyle || style

    const layers = resolveSectionLayerStyles(effectiveStyle, {
      containerWidth,
      pageContainerWidth,
      verticalPadding,
      minHeight,
    })

    return (
      <section
        {...animationAttributes(effectiveStyle?.animation)}
        id={id}
        className="zyvavu-widget-section zyvavu-widget-section--editor site-section"
        style={{
          ...layers.rootStyle,
          minHeight: layers.rootStyle.minHeight || '100px',
        }}
      >
        {/* 1. Base Color Layer */}
        <div className="zyvavu-section__base-color" style={layers.baseColorStyle} />

        {/* 2. Media Layer */}
        {layers.videoConfig?.url ? (
          <div
            className="zyvavu-section__media zyvavu-section__media--video"
            style={layers.mediaStyle}
          >
            <video
              autoPlay={false} // Don't autoplay inside editor to avoid canvas re-render noise
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
          <div
            className="zyvavu-section__media zyvavu-section__media--image"
            style={layers.mediaStyle}
          />
        )}

        {/* 3. Overlay Layer */}
        <div className="zyvavu-section__overlay" style={layers.overlayStyle} />

        {/* 4. Pattern Layer */}
        {layers.patternStyle.backgroundImage && (
          <div aria-hidden="true" className="zyvavu-section__pattern" style={layers.patternStyle} />
        )}

        {/* 5. Inner Container with Puck Drop Zone */}
        <div className="zyvavu-section__container" style={layers.containerStyle}>
          <div className="zyvavu-section__content" style={layers.contentStyle}>
            {Content && <Content />}
          </div>
        </div>
      </section>
    )
  },
}
