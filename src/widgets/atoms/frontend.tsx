import React from 'react'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { resolveButtonElementProps } from '@/lib/style-engine/button-style'
import '@/lib/style-engine/button-style.css'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { resolveTextRender } from '@/components/builder/inline-edit/content-model'
import { systemDescriptor, type AtomType } from '@/lib/theme-engine/widget-contracts'
import {
  isSafeMediaHref,
  MEDIA_STYLE_DEFAULTS,
  type AspectRatioValue,
  type ObjectFitValue,
  type ObjectPositionValue,
} from './media-props'

export type AtomProps = {
  id?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  text?: string
  href?: string
  newTab?: boolean
  src?: string
  alt?: string
  caption?: string
  mediaId?: string | number
  posterUrl?: string
  posterMediaId?: string | number
  aspectRatio?: AspectRatioValue
  objectFit?: ObjectFitValue
  objectPosition?: ObjectPositionValue
  controls?: boolean
  loop?: boolean
  muted?: boolean
  autoplay?: boolean
  style?: WidgetSemanticStyle
  dataContext?: ThemeDataContext
  previewOnly?: boolean
}

function renderInlineText(
  Tag: keyof React.JSX.IntrinsicElements,
  text: string | undefined,
  resolved: React.CSSProperties,
  animation: ReturnType<typeof animationAttributes>,
) {
  const render = resolveTextRender(text)
  if (render.mode === 'html') {
    return (
      <Tag style={resolved} {...animation}>
        <span dangerouslySetInnerHTML={{ __html: render.html || '' }} />
      </Tag>
    )
  }
  return (
    <Tag style={resolved} {...animation}>
      {render.plain}
    </Tag>
  )
}

function mediaBoxStyle(
  aspectRatio: AspectRatioValue | undefined,
  objectFit: ObjectFitValue | undefined,
  objectPosition: ObjectPositionValue | undefined,
): React.CSSProperties {
  return {
    width: '100%',
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    borderRadius: 'inherit',
    aspectRatio: !aspectRatio || aspectRatio === 'auto' ? undefined : aspectRatio.replace(':', '/'),
    objectFit: objectFit || MEDIA_STYLE_DEFAULTS.objectFit,
    objectPosition: objectPosition || MEDIA_STYLE_DEFAULTS.objectPosition,
  }
}

function wrapMediaLink(
  href: string | undefined,
  newTab: boolean | undefined,
  child: React.ReactNode,
) {
  if (!isSafeMediaHref(href)) return child
  return (
    <a
      href={href!.trim()}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
    >
      {child}
    </a>
  )
}

function MediaFigure({
  caption,
  resolved,
  animation,
  children,
}: {
  caption?: string
  resolved: React.CSSProperties
  animation: ReturnType<typeof animationAttributes>
  children: React.ReactNode
}) {
  return (
    <figure style={{ ...resolved, margin: 0 }} {...animation}>
      {children}
      {caption ? (
        <figcaption
          style={{
            marginTop: '0.5rem',
            fontSize: 'var(--zyvavu-theme-p2-size, 0.875rem)',
            lineHeight: 'var(--zyvavu-theme-p2-line-height, 1.4)',
            color: 'var(--zyvavu-theme-text, inherit)',
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

export function AtomPresentation({
  kind,
  id,
  text,
  src,
  alt,
  caption,
  aspectRatio,
  objectFit,
  objectPosition,
  posterUrl,
  style,
  primaryHeading,
  tag,
  href,
  newTab,
  controls = true,
  loop = false,
  muted = true,
  autoplay = false,
  previewOnly = false,
}: AtomProps & { kind: AtomType; primaryHeading?: boolean }) {
  const resolved = resolveWidgetStyles(style)
  const buttonProps =
    kind === 'Button' ? resolveButtonElementProps(style as any) : { className: undefined, style: {} }
  const buttonStyle = { ...resolved, ...buttonProps.style }
  const HeadingTag = (tag || (primaryHeading ? 'h1' : 'h2')) as keyof React.JSX.IntrinsicElements
  const anim = animationAttributes(style?.animation)
  const mediaStyle = mediaBoxStyle(aspectRatio, objectFit, objectPosition)

  let node: React.ReactElement
  if (kind === 'Image') {
    const image = src ? (
      <img src={src} alt={alt || ''} loading="lazy" decoding="async" style={mediaStyle} />
    ) : (
      <div
        style={{
          ...mediaStyle,
          minHeight: 96,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--zyvavu-theme-surface, #f4f7f6)',
          color: 'var(--zyvavu-theme-text, #17201f)',
          fontSize: 13,
        }}
      >
        {text || 'Image not configured'}
      </div>
    )
    node = (
      <MediaFigure caption={caption} resolved={resolved} animation={anim}>
        {wrapMediaLink(href, newTab, image)}
      </MediaFigure>
    )
  } else if (kind === 'Video') {
    const video = src ? (
      <div data-zyvavu-content-video="" style={{ position: 'relative' }}>
        {/* Poster remains when prefers-reduced-motion hides <video> globally. */}
        {(posterUrl || undefined) && (
          <img
            src={posterUrl}
            alt={alt || caption || ''}
            data-zyvavu-video-poster=""
            style={{ ...mediaStyle, position: 'absolute', inset: 0, height: '100%' }}
            aria-hidden
          />
        )}
        <video
          src={src}
          poster={posterUrl || undefined}
          controls={controls}
          loop={loop}
          muted={autoplay ? true : muted}
          autoPlay={Boolean(autoplay)}
          playsInline
          preload={autoplay ? 'metadata' : 'none'}
          style={{ ...mediaStyle, position: 'relative', zIndex: 1 }}
        />
      </div>
    ) : (
      <div
        style={{
          ...mediaStyle,
          minHeight: posterUrl ? undefined : 120,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--zyvavu-theme-surface, #f4f7f6)',
          backgroundImage: posterUrl ? `url(${posterUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'var(--zyvavu-theme-text, #17201f)',
          fontSize: 13,
        }}
      >
        {text || 'Video not configured'}
      </div>
    )
    node = (
      <MediaFigure caption={caption} resolved={resolved} animation={anim}>
        {wrapMediaLink(href, newTab, video)}
      </MediaFigure>
    )
  } else if (kind === 'Heading') {
    node = renderInlineText(HeadingTag, text, resolved, anim)
  } else if (kind === 'Button' && previewOnly) {
    node = <span className={buttonProps.className} style={buttonStyle}>{text}</span>
  } else if (kind === 'Button' && href && isSafeMediaHref(href)) {
    node = (
      <a
        href={href}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        className={buttonProps.className}
        style={buttonStyle}
        {...anim}
      >
        {text}
      </a>
    )
  } else if (kind === 'Button') {
    node = (
      <button type="button" className={buttonProps.className} style={buttonStyle} {...anim}>
        {text}
      </button>
    )
  } else {
    node = renderInlineText('p', text, resolved, anim)
  }

  return withWidgetStyleSurface(node, style, id)
}

export function createAtomRenderer(type: string) {
  return function AtomRenderer(props: AtomProps) {
    const descriptor = systemDescriptor(type)
    if (!descriptor) return <AtomPresentation {...props} kind={type as AtomType} />
    const doc = props.dataContext?.document
    const archive = props.dataContext?.archive
    let text = ''
    let src: string | undefined
    let alt = ''
    switch (descriptor.binding) {
      case 'document.title':
        text = doc?.title || ''
        break
      case 'document.date': {
        const value = doc?.updatedAt || doc?.createdAt
        const date = value ? new Date(value) : null
        text = date && !isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : ''
        break
      }
      case 'document.categories':
        text = (Array.isArray(doc?.categories) ? doc.categories : [])
          .map((c: unknown) => (typeof c === 'object' && c && 'title' in c ? String(c.title) : ''))
          .filter(Boolean)
          .join(', ')
        break
      case 'archive.title':
        text = archive?.title || ''
        break
      case 'archive.description':
        text = archive?.description || ''
        break
      case 'document.featuredMedia': {
        const media = doc?.featuredImage || doc?.image || doc?.media
        src =
          typeof media === 'object' && media
            ? media.url
            : typeof media === 'string'
              ? media
              : undefined
        alt = typeof media === 'object' && media ? media.alt || '' : ''
        break
      }
    }
    if (descriptor.atom === 'Image' && !src) return null
    return (
      <AtomPresentation
        id={props.id}
        style={props.style}
        kind={descriptor.atom}
        primaryHeading={descriptor.role === 'document.title' || descriptor.role === 'archive.title'}
        tag={props.tag}
        text={text}
        src={src}
        alt={alt}
        href={props.href}
        newTab={props.newTab}
        aspectRatio={props.aspectRatio}
        objectFit={props.objectFit}
        objectPosition={props.objectPosition}
        caption={props.caption}
      />
    )
  }
}
