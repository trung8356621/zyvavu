import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import { BannerSliderView, type BannerSliderViewProps } from './BannerSliderView'
import { normalizeSlidesPerView } from './normalize-slides-per-view'
import type { BannerSliderControlsStyle } from './style-targets'

export type BannerSliderProps = Omit<BannerSliderViewProps, 'Slides' | 'canvasMode' | 'onDuplicateActiveSlide'> & {
  id?: string
  slides?: React.ReactNode | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  controlsStyle?: BannerSliderControlsStyle
  dataContext?: ThemeDataContext
}

/** SSR-safe shell: Embla boots on the client inside BannerSliderView. */
export function BannerSliderFrontend({
  slides,
  slidesPerView,
  ...props
}: BannerSliderProps) {
  const perView = normalizeSlidesPerView(slidesPerView)
  // Puck editor passes the slot field as a component. ThemeRenderer (and tests) pass
  // pre-rendered ReactNode — including Fragments with $$typeof. Only functions are Slides.
  if (typeof slides === 'function') {
    return (
      <BannerSliderView
        {...props}
        slidesPerView={perView}
        Slides={slides as React.ComponentType<{ className?: string; style?: React.CSSProperties }>}
      />
    )
  }
  return <BannerSliderView {...props} slidesPerView={perView} slides={slides} />
}
