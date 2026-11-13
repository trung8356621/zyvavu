'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import type { BannerSliderControlsStyle } from './style-targets'
import {
  clearBannerActiveSlide,
  setBannerActiveSlide,
  subscribeBannerActiveSlide,
} from './active-slide-store'
import { normalizeSlidesPerView } from './normalize-slides-per-view'

export type BannerSliderViewProps = {
  id?: string
  autoplay?: boolean
  intervalMs?: number
  loop?: boolean
  showArrows?: boolean
  showPagination?: boolean
  paginationMode?: 'dots' | 'numbers'
  /** Items visible in the viewport; missing/legacy values default to 1. */
  slidesPerView?: number
  controlsStyle?: BannerSliderControlsStyle
  /**
   * Puck slot component (editor + Render). Used as the Embla track so each
   * SlideItem is a direct flex child — wrapping `<Slides />` in an extra div
   * made the canvas stack slides vertically.
   */
  Slides?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  /** Fallback ReactNode list (tests / non-slot callers). */
  slides?: React.ReactNode | (() => React.ReactNode)
  /** Canvas editor: force nav, disable autoplay. */
  canvasMode?: boolean
  slideIds?: string[]
  className?: string
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

function asChildren(slides: BannerSliderViewProps['slides']): React.ReactNode[] {
  if (!slides) return []
  const node = typeof slides === 'function' ? slides() : slides
  return React.Children.toArray(node).filter(Boolean)
}

export function BannerSliderView({
  id,
  autoplay = true,
  intervalMs = 5000,
  loop = true,
  showArrows = true,
  showPagination = true,
  paginationMode = 'dots',
  slidesPerView: slidesPerViewProp,
  controlsStyle,
  Slides,
  slides,
  canvasMode = false,
  slideIds = [],
  className,
}: BannerSliderViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const perView = normalizeSlidesPerView(slidesPerViewProp)
  const nodeChildren = useMemo(() => (Slides ? [] : asChildren(slides)), [Slides, slides])
  const knownCount = Slides ? slideIds.length : nodeChildren.length
  const [domCount, setDomCount] = useState(knownCount)
  const count = Math.max(knownCount, domCount)
  const canScroll = count > perView
  const enableAutoplay = !canvasMode && autoplay && !reducedMotion && canScroll
  const enableLoop = loop && canScroll

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: enableLoop,
      align: 'start',
      skipSnaps: false,
      slidesToScroll: 1,
      containScroll: enableLoop ? false : 'trimSnaps',
    },
    enableAutoplay
      ? [Autoplay({ delay: Math.max(1500, intervalMs || 5000), stopOnInteraction: true })]
      : [],
  )
  const [selected, setSelected] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const sync = useCallback(() => {
    if (!emblaApi) return
    const index = emblaApi.selectedScrollSnap()
    setSelected(index)
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
    setDomCount(emblaApi.slideNodes().length)
    if (id) {
      const ids = slideIds.length ? slideIds : emblaApi.slideNodes().map((node) => node.getAttribute('data-slide-id') || '')
      setBannerActiveSlide(id, {
        index,
        slideId: ids[index] || undefined,
        slideIds: ids.filter(Boolean),
      })
    }
  }, [emblaApi, id, slideIds])

  useEffect(() => {
    if (!emblaApi) return
    const frame = requestAnimationFrame(() => {
      emblaApi.reInit()
      sync()
    })
    emblaApi.on('select', sync)
    emblaApi.on('reInit', sync)
    return () => {
      cancelAnimationFrame(frame)
      emblaApi.off('select', sync)
      emblaApi.off('reInit', sync)
    }
  }, [emblaApi, sync, perView, enableLoop, count])

  useEffect(() => {
    return () => {
      if (id) clearBannerActiveSlide(id)
    }
  }, [id])

  // Keep the editing index stable across content/style updates when possible.
  useEffect(() => {
    if (!emblaApi || !canvasMode) return
    const max = Math.max(0, emblaApi.scrollSnapList().length - 1)
    const next = Math.min(selected, max)
    if (next !== emblaApi.selectedScrollSnap()) emblaApi.scrollTo(next, true)
  }, [emblaApi, canvasMode, count, selected])

  useEffect(() => {
    if (!id || !emblaApi) return
    return subscribeBannerActiveSlide((sliderId, state) => {
      if (sliderId !== id || state.scrollToIndex == null || state.scrollRequest == null) return
      const max = Math.max(0, emblaApi.scrollSnapList().length - 1)
      emblaApi.scrollTo(Math.min(state.scrollToIndex, max))
    })
  }, [emblaApi, id])

  const arrowCss = resolveWidgetStyles(controlsStyle?.arrows as UniversalStyle | undefined)
  const paginationCss = resolveWidgetStyles(controlsStyle?.pagination as UniversalStyle | undefined)
  // Keep absolute anchors; Left/Right margin tokens then offset the arrows.
  const prevArrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: 8,
    transform: 'translateY(-50%)',
    zIndex: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--zyvavu-theme-text, #111)',
    ...arrowCss,
  }
  const nextArrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
    zIndex: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--zyvavu-theme-text, #111)',
    ...arrowCss,
  }
  const trackStyle: React.CSSProperties = {
    display: 'flex',
    touchAction: 'pan-y pinch-zoom',
    ['--banner-slides-per-view' as string]: String(perView),
  }
  const slideBasis = `calc(100% / ${perView})`

  const showEditorNav = canvasMode && count > 0
  const showPublicArrows = !canvasMode && showArrows && canScroll
  const showPublicPagination = !canvasMode && showPagination && canScroll
  const showNav = showEditorNav || showPublicArrows

  if (!count && !Slides) {
    return (
      <div
        className={`zyvavu-widget-banner-slider ${className || ''}`.trim()}
        style={{
          minHeight: 160,
          display: 'grid',
          placeItems: 'center',
          border: '1px dashed var(--zyvavu-theme-border, #dfe5e2)',
          color: 'var(--zyvavu-theme-textMuted, #6b7280)',
          fontSize: 13,
        }}
      >
        Add Slide Items to this Banner Slider
      </div>
    )
  }

  return (
    <div
      className={`zyvavu-widget-banner-slider ${className || ''}`.trim()}
      data-canvas={canvasMode || undefined}
      data-slides-per-view={perView}
      style={{ position: 'relative', width: '100%', minWidth: 0 }}
    >
      <style>{`
        .zyvavu-widget-banner-slider__track > * {
          flex: 0 0 calc(100% / var(--banner-slides-per-view, 1));
          min-width: 0;
          max-width: calc(100% / var(--banner-slides-per-view, 1));
        }
      `}</style>
      <div className="zyvavu-widget-banner-slider__viewport" ref={emblaRef} style={{ overflow: 'hidden' }}>
        {Slides ? (
          <Slides className="zyvavu-widget-banner-slider__track" style={trackStyle} />
        ) : (
          <div className="zyvavu-widget-banner-slider__track" style={trackStyle}>
            {nodeChildren.map((child, index) => (
              <div
                key={slideIds[index] || index}
                className="zyvavu-widget-banner-slider__slide"
                data-slide-id={slideIds[index]}
                style={{ flex: `0 0 ${slideBasis}`, minWidth: 0, maxWidth: slideBasis }}
              >
                {child}
              </div>
            ))}
          </div>
        )}
      </div>

      {showNav && (
        <>
          <button
            type="button"
            className="zyvavu-widget-banner-slider__arrow zyvavu-widget-banner-slider__arrow--prev"
            aria-label="Previous slide"
            disabled={!enableLoop && !canPrev}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              emblaApi?.scrollPrev()
            }}
            style={prevArrowStyle}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="zyvavu-widget-banner-slider__arrow zyvavu-widget-banner-slider__arrow--next"
            aria-label="Next slide"
            disabled={!enableLoop && !canNext}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              emblaApi?.scrollNext()
            }}
            style={nextArrowStyle}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </>
      )}

      {(showPublicPagination || (canvasMode && count > 1)) && (
        <div
          className="zyvavu-widget-banner-slider__pagination"
          role="tablist"
          aria-label="Slide pagination"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 10,
            zIndex: 3,
            ...paginationCss,
          }}
        >
          {Array.from({ length: count }, (_, index) => {
            const active = index === selected
            return (
              <button
                key={slideIds[index] || index}
                type="button"
                role="tab"
                aria-label={`Go to slide ${index + 1}`}
                aria-selected={active}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  emblaApi?.scrollTo(index)
                }}
                style={
                  paginationMode === 'numbers'
                    ? {
                        minWidth: 24,
                        height: 24,
                        borderRadius: 999,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        opacity: active ? 1 : 0.55,
                        background: active
                          ? 'var(--zyvavu-theme-primary, #0e6b66)'
                          : 'var(--zyvavu-theme-surface, #fff)',
                        color: active ? '#fff' : 'var(--zyvavu-theme-text, #111)',
                      }
                    : {
                        width: active ? 18 : 8,
                        height: 8,
                        borderRadius: 999,
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        background: active
                          ? 'var(--zyvavu-theme-primary, #0e6b66)'
                          : 'color-mix(in srgb, var(--zyvavu-theme-text, #111) 35%, transparent)',
                      }
                }
              >
                {paginationMode === 'numbers' ? index + 1 : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { normalizeSlidesPerView } from './normalize-slides-per-view'
