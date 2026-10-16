'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { SectionProps } from './frontend'
import { resolveSectionLayerStyles } from '@/lib/style-engine/serializer'

export const sectionEditor: ComponentConfig<SectionProps> = {
  label: 'Section Container',
  fields: {
    containerWidth: {
      type: 'select',
      label: 'Container Width',
      options: [
        { label: 'Standard Container', value: 'containerWidth' },
        { label: 'Narrow Container', value: 'narrowWidth' },
        { label: 'Wide Container', value: 'wideWidth' },
        { label: 'Full Width', value: 'full' },
      ],
    },
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
    minHeight: {
      type: 'select',
      label: 'Minimum Height',
      options: [
        { label: 'Auto (Content Fit)', value: 'auto' },
        { label: 'Small (200px)', value: 'sm' },
        { label: 'Medium (400px)', value: 'md' },
        { label: 'Large (600px)', value: 'lg' },
        { label: 'Full Screen (100vh)', value: 'screen' },
      ],
    },
    content: { type: 'slot' },
  },
  defaultProps: {
    containerWidth: 'containerWidth',
    verticalPadding: 'md',
    minHeight: 'auto',
  },
  render: ({
    id,
    containerWidth = 'containerWidth',
    verticalPadding = 'md',
    minHeight = 'auto',
    style,
    content: Content,
  }: any) => {
    const layers = resolveSectionLayerStyles(style, {
      containerWidth,
      verticalPadding,
      minHeight,
    })

    return (
      <section
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
          <div className="zyvavu-section__media zyvavu-section__media--video" style={layers.mediaStyle}>
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
          <div className="zyvavu-section__media zyvavu-section__media--image" style={layers.mediaStyle} />
        )}

        {/* 3. Overlay Layer */}
        <div className="zyvavu-section__overlay" style={layers.overlayStyle} />

        {/* 4. Pattern Layer */}
        <div className="zyvavu-section__pattern" style={layers.patternStyle} />

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
