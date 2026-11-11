import React from 'react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { getCustomIconSvg, isCustomIconName } from './custom-icons'
import { applySvgCurrentColor, sanitizeSvgMarkup } from './sanitize-svg'
import type { IconRenderProps } from './types'

type LucideName = React.ComponentProps<typeof DynamicIcon>['name']

function a11yProps(props: Pick<IconRenderProps, 'decorative' | 'label'>) {
  if (props.decorative || !props.label) {
    return { 'aria-hidden': true as const, focusable: false as const, role: undefined }
  }
  return {
    role: 'img' as const,
    'aria-label': props.label,
    focusable: false as const,
  }
}

function InlineSvg({
  markup,
  size,
  color,
  className,
  style,
  recolor,
  a11y,
}: {
  markup: string
  size: number
  color?: string
  className?: string
  style?: React.CSSProperties
  recolor: boolean
  a11y: ReturnType<typeof a11yProps>
}) {
  const html = recolor ? applySvgCurrentColor(markup) : markup
  return (
    <span
      className={className}
      {...a11y}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        color: color || 'currentColor',
        lineHeight: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** SSR-safe Lucide/custom/media renderer (media via safe <img>). */
export function IconRendererStatic(props: IconRenderProps) {
  const {
    icon,
    size = 24,
    strokeWidth = 2,
    color,
    className,
    style,
    decorative = true,
    label,
  } = props
  const numericSize = typeof size === 'number' ? size : Number.parseFloat(String(size)) || 24
  const a11y = a11yProps({ decorative, label })

  if (!icon) return null

  if (icon.source === 'custom' || isCustomIconName(icon.name)) {
    const svg = getCustomIconSvg(icon.name || '')
    if (!svg) return null
    return (
      <InlineSvg
        markup={sanitizeSvgMarkup(svg) || svg}
        size={numericSize}
        color={color}
        className={className}
        style={style}
        recolor={icon.recolorable !== false}
        a11y={a11y}
      />
    )
  }

  if (icon.source === 'media' && icon.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon.mediaUrl}
        alt={label && !decorative ? label : ''}
        width={numericSize}
        height={numericSize}
        className={className}
        style={{
          display: 'inline-block',
          width: numericSize,
          height: numericSize,
          ...style,
        }}
        aria-hidden={decorative || !label ? true : undefined}
      />
    )
  }

  if (!icon.name) return null

  return (
    <DynamicIcon
      name={icon.name as LucideName}
      size={numericSize}
      strokeWidth={strokeWidth}
      color={color || 'currentColor'}
      className={className}
      style={style}
      {...a11y}
    />
  )
}
