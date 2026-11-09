import React from 'react'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { resolveSpacingToken } from '@/lib/style-engine/token-resolver'
import {
  isSafeMediaHref,
  type AspectRatioValue,
  type ObjectFitValue,
} from '@/widgets/atoms/media-props'

export type GalleryItem = {
  id?: string
  src?: string
  alt?: string
  caption?: string
  href?: string
  mediaId?: string | number
}

export type GalleryProps = {
  id?: string
  columns?: 2 | 3 | 4 | number
  gapToken?: string
  aspectRatio?: AspectRatioValue
  objectFit?: ObjectFitValue
  items?: GalleryItem[]
  style?: WidgetSemanticStyle
  dataContext?: ThemeDataContext
}

export function GalleryFrontend({
  id: surfaceId,
  columns = 3,
  gapToken = 'md',
  aspectRatio = '1:1',
  objectFit = 'cover',
  items = [],
  style: semanticStyle,
}: GalleryProps) {
  const resolved = resolveWidgetStyles(semanticStyle)
  const gap = resolveSpacingToken(gapToken) || '16px'
  const cols = Math.min(4, Math.max(2, Number(columns) || 3))
  const list = Array.isArray(items) ? items.filter((item) => item?.src) : []

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-gallery"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap,
        ...resolved,
      }}
    >
      {list.length === 0 ? (
        <div
          style={{
            gridColumn: '1 / -1',
            minHeight: 120,
            display: 'grid',
            placeItems: 'center',
            border: '1px dashed var(--zyvavu-theme-border, #dfe5e2)',
            borderRadius: 'var(--zyvavu-theme-radius-md, 8px)',
            color: 'var(--zyvavu-theme-text, #17201f)',
            fontSize: 13,
          }}
        >
          Add images to this gallery
        </div>
      ) : (
        list.map((item, index) => {
          const media = (
            <img
              src={item.src}
              alt={item.alt || item.caption || ''}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                aspectRatio:
                  !aspectRatio || aspectRatio === 'auto'
                    ? undefined
                    : aspectRatio.replace(':', '/'),
                objectFit: objectFit || 'cover',
                borderRadius: 'inherit',
              }}
            />
          )
          const body = isSafeMediaHref(item.href) ? (
            <a
              href={item.href!.trim()}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            >
              {media}
            </a>
          ) : (
            media
          )
          return (
            <figure
              key={String(item.id || item.mediaId || item.src || index)}
              style={{ margin: 0, minWidth: 0, overflow: 'hidden' }}
            >
              {body}
              {item.caption ? (
                <figcaption
                  style={{
                    marginTop: 6,
                    fontSize: 'var(--zyvavu-theme-p2-size, 0.875rem)',
                    color: 'var(--zyvavu-theme-text, inherit)',
                  }}
                >
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          )
        })
      )}
    </div>,
    semanticStyle,
    surfaceId,
  )
}
