import React from 'react'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { resolveTextRender } from '@/components/builder/inline-edit/content-model'
import { systemDescriptor, type AtomType } from '@/lib/theme-engine/widget-contracts'
export type AtomProps = {
  id?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  text?: string
  href?: string
  newTab?: boolean
  src?: string
  alt?: string
  aspectRatio?: '16:9' | '4:3' | '21:9' | 'auto'
  style?: WidgetSemanticStyle
  dataContext?: ThemeDataContext
}

function renderInlineText(
  Tag: keyof React.JSX.IntrinsicElements,
  text: string | undefined,
  resolved: React.CSSProperties,
  animation: ReturnType<typeof animationAttributes>,
) {
  const render = resolveTextRender(text)
  // Inner span keeps dangerouslySetInnerHTML off the style-surface root
  // (withWidgetStyleSurface always injects layer children onto the root).
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

export function AtomPresentation({
  kind,
  id,
  text,
  src,
  alt,
  aspectRatio,
  style,
  primaryHeading,
  tag,
  href,
  newTab,
}: AtomProps & { kind: AtomType; primaryHeading?: boolean }) {
  const resolved = resolveWidgetStyles(style)
  // Explicit HTML Tag from Fields wins; document-bound titles default to h1 (never P).
  const HeadingTag = (tag || (primaryHeading ? 'h1' : 'h2')) as keyof React.JSX.IntrinsicElements
  const anim = animationAttributes(style?.animation)
  const node =
    kind === 'Image' ? (
      <div style={resolved} {...anim}>
        {src ? (
          <img
            src={src}
            alt={alt || ''}
            style={{
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 'inherit',
              aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio?.replace(':', '/'),
              objectFit: 'cover',
            }}
          />
        ) : (
          text || 'Image not configured'
        )}
      </div>
    ) : kind === 'Heading' ? (
      renderInlineText(HeadingTag, text, resolved, anim)
    ) : kind === 'Button' && href && !/^(?:javascript|data|vbscript):/i.test(href.trim()) ? (
      <a
        href={href}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        style={resolved}
        {...anim}
      >
        {text}
      </a>
    ) : kind === 'Button' ? (
      <button type="button" style={resolved} {...anim}>
        {text}
      </button>
    ) : (
      // Legacy Text atom — keep rendering for saved documents.
      renderInlineText('p', text, resolved, anim)
    )
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
      />
    )
  }
}
