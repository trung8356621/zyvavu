'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { getCustomIconSvg, isCustomIconName } from './custom-icons'
import { applySvgCurrentColor, isSvgMimeType, sanitizeSvgMarkup } from './sanitize-svg'
import { IconRendererStatic } from './IconRendererStatic'
import type { IconRef, IconRenderProps } from './types'

type LucideName = React.ComponentProps<typeof DynamicIcon>['name']

const mediaSvgCache = new Map<string, string | null>()

async function fetchSanitizedSvg(url: string): Promise<string | null> {
  if (mediaSvgCache.has(url)) return mediaSvgCache.get(url) || null
  try {
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) {
      mediaSvgCache.set(url, null)
      return null
    }
    const mime = res.headers.get('content-type')
    const text = await res.text()
    if (mime && !isSvgMimeType(mime) && !/<svg[\s>]/i.test(text)) {
      mediaSvgCache.set(url, null)
      return null
    }
    const sanitized = sanitizeSvgMarkup(text)
    mediaSvgCache.set(url, sanitized)
    return sanitized
  } catch {
    mediaSvgCache.set(url, null)
    return null
  }
}

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

function MediaIcon({
  icon,
  size,
  color,
  className,
  style,
  a11y,
}: {
  icon: IconRef
  size: number
  color?: string
  className?: string
  style?: React.CSSProperties
  a11y: ReturnType<typeof a11yProps>
}) {
  const url = icon.mediaUrl
  const [markup, setMarkup] = useState<string | null>(() =>
    url && mediaSvgCache.has(url) ? mediaSvgCache.get(url) || null : null,
  )

  useEffect(() => {
    if (!url) return
    let cancelled = false
    fetchSanitizedSvg(url).then((next) => {
      if (!cancelled) setMarkup(next)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!url) return null
  if (!markup) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={a11y['aria-label'] || ''}
        width={size}
        height={size}
        className={className}
        style={{ display: 'inline-block', width: size, height: size, ...style }}
        aria-hidden={a11y['aria-hidden'] ? true : undefined}
      />
    )
  }

  return (
    <InlineSvg
      markup={markup}
      size={size}
      color={color}
      className={className}
      style={style}
      recolor={icon.recolorable !== false}
      a11y={a11y}
    />
  )
}

export function IconRenderer(props: IconRenderProps) {
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

  if (icon.source === 'media') {
    return (
      <MediaIcon
        icon={icon}
        size={numericSize}
        color={color}
        className={className}
        style={style}
        a11y={a11y}
      />
    )
  }

  if (!icon.name) return null

  return (
    <Suspense
      fallback={
        <span
          aria-hidden
          style={{ display: 'inline-block', width: numericSize, height: numericSize }}
        />
      }
    >
      <DynamicIcon
        name={icon.name as LucideName}
        size={numericSize}
        strokeWidth={strokeWidth}
        color={color || 'currentColor'}
        className={className}
        style={style}
        {...a11y}
      />
    </Suspense>
  )
}

export { IconRendererStatic }
