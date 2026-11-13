'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'

export type AnimatedCounterViewProps = {
  id?: string
  targetValue?: number
  durationMs?: number
  prefix?: string
  suffix?: string
  decimals?: number
  useGrouping?: boolean
  triggerOnce?: boolean
  label?: string
  style?: UniversalStyle
  /** Editor preview: animate without requiring scroll. */
  previewAnimate?: boolean
}

function formatValue(value: number, decimals: number, useGrouping: boolean) {
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    }).format(value)
  } catch {
    return value.toFixed(decimals)
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])
  return reduced
}

export function AnimatedCounterView({
  id: surfaceId,
  targetValue = 0,
  durationMs = 1600,
  prefix = '',
  suffix = '',
  decimals = 0,
  useGrouping = true,
  triggerOnce = true,
  label = '',
  style,
  previewAnimate = false,
}: AnimatedCounterViewProps) {
  const target = Number.isFinite(targetValue) ? targetValue : 0
  const reducedMotion = usePrefersReducedMotion()
  const rootRef = useRef<HTMLDivElement | null>(null)
  // SSR + hydration: animate from 0; reduced-motion renders the final value directly.
  const [display, setDisplay] = useState(0)
  const startedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const shown = reducedMotion ? target : display

  useEffect(() => {
    if (reducedMotion) return
    const el = rootRef.current
    if (!el) return
    startedRef.current = false

    const run = () => {
      if (triggerOnce && startedRef.current) return
      startedRef.current = true
      const start = performance.now()
      const from = 0
      const duration = Math.max(200, durationMs || 1600)
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(from + (target - from) * eased)
        if (t < 1) rafRef.current = requestAnimationFrame(tick)
        else setDisplay(target)
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    if (previewAnimate) {
      run()
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      run()
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run()
          if (triggerOnce) io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [durationMs, previewAnimate, reducedMotion, target, triggerOnce])

  const resolved = resolveWidgetStyles(style)
  const text = `${prefix}${formatValue(shown, Math.max(0, Math.min(4, decimals || 0)), useGrouping)}${suffix}`

  return withWidgetStyleSurface(
    <div
      ref={rootRef}
      className="zyvavu-widget-animated-counter"
      {...animationAttributes(style?.animation)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems:
          style?.typography?.align === 'left'
            ? 'flex-start'
            : style?.typography?.align === 'right'
              ? 'flex-end'
              : 'center',
        gap: 4,
        ...resolved,
      }}
    >
      <div
        className="zyvavu-widget-animated-counter__value"
        style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}
      >
        {text}
      </div>
      {label ? (
        <div
          className="zyvavu-widget-animated-counter__label"
          style={{
            fontSize: '0.875rem',
            color: 'var(--zyvavu-theme-textMuted, #6b7280)',
            textAlign:
              style?.typography?.align === 'left' ||
              style?.typography?.align === 'right' ||
              style?.typography?.align === 'center'
                ? style.typography.align
                : 'center',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>,
    style,
    surfaceId,
  )
}
