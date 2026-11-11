import React from 'react'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'
import type { UniversalStyle } from '@/lib/style-engine/types'
import type { IconRef } from '@/lib/icons'
import { IconRendererStatic } from '@/lib/icons/IconRendererStatic'
import { sanitizeHref } from '@/components/builder/inline-edit/content-model'

export type IconAtomProps = {
  id?: string
  icon?: IconRef | null
  label?: string
  decorative?: boolean
  href?: string
  newTab?: boolean
  size?: number
  strokeWidth?: number
  style?: UniversalStyle
}

function IconAtomInner(props: IconAtomProps) {
  const {
    icon,
    label = '',
    decorative = true,
    href,
    newTab,
    size = 24,
    strokeWidth = 2,
    style,
  } = props

  const resolved = resolveWidgetStyles(style)
  const color =
    style?.typography?.colorToken || style?.colorToken
      ? resolveColorToken(style?.typography?.colorToken || style?.colorToken)
      : (resolved.color as string | undefined) || 'currentColor'

  const align = style?.typography?.align || style?.align || 'left'
  const meaningful = Boolean(label) && decorative === false
  const safeHref = sanitizeHref(href)

  const iconNode = icon ? (
    <IconRendererStatic
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      decorative={!meaningful}
      label={meaningful ? label : undefined}
    />
  ) : (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        border: '1px dashed var(--zyvavu-theme-border, #dfe5e2)',
        borderRadius: 4,
        opacity: 0.6,
      }}
    />
  )

  const content = safeHref ? (
    <a
      href={safeHref}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      aria-label={meaningful ? label : undefined}
      style={{
        display: 'inline-flex',
        color: 'inherit',
        textDecoration: 'none',
        lineHeight: 0,
      }}
    >
      {iconNode}
    </a>
  ) : (
    iconNode
  )

  return (
    <div
      className="zyvavu-widget-icon"
      {...animationAttributes(style?.animation)}
      style={{
        display: 'flex',
        justifyContent:
          align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        color,
        ...resolved,
      }}
    >
      {content}
    </div>
  )
}

export function IconFrontend(props: IconAtomProps) {
  return withWidgetStyleSurface(
    <IconAtomInner {...props} />,
    props.style,
    props.id,
  )
}
