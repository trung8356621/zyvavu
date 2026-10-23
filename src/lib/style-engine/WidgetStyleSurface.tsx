import React from 'react'
import type { UniversalStyle } from './types'
import { animationAttributes } from './animation-presets'
import { resolveSectionLayerStyles, resolveWidgetStyles } from './serializer'

/** Shared editor/SSR surface. Typography stays on the widget's own text renderer. */
export function WidgetStyleSurface({
  id,
  style,
  children,
}: {
  id?: string
  style?: UniversalStyle
  children?: React.ReactNode
}) {
  const layers = resolveSectionLayerStyles(style, { verticalPadding: 'none' })
  const presentation = resolveWidgetStyles({
    ...style,
    typography: undefined,
    colorToken: undefined,
    align: undefined,
    background: undefined,
    backgroundToken: undefined,
  })
  return (
    <div
      data-widget-style-surface={id}
      {...animationAttributes(style?.animation)}
      style={{
        position: 'relative',
        isolation: 'isolate',
        minWidth: 0,
        boxSizing: 'border-box',
        ...presentation,
        color: layers.rootStyle.color,
        ...({
          '--zyvavu-inherited-foreground': (layers.rootStyle as Record<string, unknown>)[
            '--zyvavu-inherited-foreground'
          ],
        } as React.CSSProperties),
        ...(style?.dimensions?.contentAlign
          ? {
              display: 'flex',
              flexDirection: 'column',
              justifyContent:
                style.dimensions.contentAlign === 'stretch'
                  ? undefined
                  : style.dimensions.contentAlign,
            }
          : {}),
      }}
    >
      <div aria-hidden="true" style={layers.baseColorStyle} />
      <div aria-hidden="true" style={layers.mediaStyle}>
        {layers.videoConfig?.url && (
          <video
            muted
            playsInline
            autoPlay={layers.videoConfig.autoplay}
            loop={layers.videoConfig.loop}
            poster={layers.videoConfig.posterUrl || layers.videoConfig.fallbackImageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            src={layers.videoConfig.url}
          />
        )}
      </div>
      <div aria-hidden="true" style={layers.overlayStyle} />
      {layers.patternStyle.backgroundImage && (
        <div aria-hidden="true" style={layers.patternStyle} />
      )}
      <div style={{ position: 'relative', zIndex: 10, minWidth: 0 }}>{children}</div>
    </div>
  )
}

/** Applies global presentation to the existing native root, preserving layout/sticky/slots. */
export function withWidgetStyleSurface(
  element: React.ReactElement,
  style?: UniversalStyle,
  id?: string,
): React.ReactElement {
  if (element.type === React.Fragment)
    return (
      <WidgetStyleSurface id={id} style={style}>
        {element}
      </WidgetStyleSurface>
    )
  const props = element.props as { style?: React.CSSProperties; children?: React.ReactNode }
  const { background: nativeBackground, ...nativeStyle } = props.style || {}
  if (nativeBackground && !nativeStyle.backgroundColor && !nativeStyle.backgroundImage) {
    if (/gradient\(|url\(/.test(String(nativeBackground)))
      nativeStyle.backgroundImage = String(nativeBackground)
    else
      nativeStyle.backgroundColor =
        nativeBackground === 'none' ? 'transparent' : String(nativeBackground)
  }
  const hasBackground = Boolean(style?.background || style?.backgroundToken)
  const layers = resolveSectionLayerStyles(style, { verticalPadding: 'none' })
  const globalStyle = resolveWidgetStyles({
    ...style,
    typography: undefined,
    colorToken: undefined,
    align: undefined,
    background: undefined,
    backgroundToken: undefined,
  })
  const background = hasBackground ? (
    <>
      <span
        aria-hidden="true"
        style={{ ...layers.baseColorStyle, zIndex: -4, borderRadius: 'inherit' }}
      />
      <span
        aria-hidden="true"
        style={{ ...layers.mediaStyle, zIndex: -3, borderRadius: 'inherit' }}
      >
        {layers.videoConfig?.url && (
          <video
            muted
            playsInline
            autoPlay={layers.videoConfig.autoplay}
            loop={layers.videoConfig.loop}
            poster={layers.videoConfig.posterUrl || layers.videoConfig.fallbackImageUrl}
            src={layers.videoConfig.url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </span>
      <span
        aria-hidden="true"
        style={{ ...layers.overlayStyle, zIndex: -2, borderRadius: 'inherit' }}
      />
      {layers.patternStyle.backgroundImage && (
        <span
          aria-hidden="true"
          style={{ ...layers.patternStyle, zIndex: -1, borderRadius: 'inherit' }}
        />
      )}
    </>
  ) : null
  return React.cloneElement(
    element as React.ReactElement<Record<string, unknown>>,
    {
      'data-widget-style-surface': id || '',
      ...animationAttributes(style?.animation),
      style: {
        ...nativeStyle,
        ...globalStyle,
        ...({
          '--zyvavu-inherited-foreground': (layers.rootStyle as Record<string, unknown>)[
            '--zyvavu-inherited-foreground'
          ],
        } as React.CSSProperties),
        color: nativeStyle.color || layers.rootStyle.color,
        ...(hasBackground
          ? {
              position: props.style?.position || 'relative',
              isolation: 'isolate',
              backgroundColor: 'transparent',
              backgroundImage: 'none',
            }
          : {}),
        ...(style?.dimensions?.contentAlign &&
        !['grid', 'flex', 'inline-flex', 'inline-grid'].includes(String(props.style?.display))
          ? { display: 'flex', flexDirection: 'column' }
          : {}),
      },
    },
    background,
    props.children,
  )
}
